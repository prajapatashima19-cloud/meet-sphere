import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import {
  Badge,
  IconButton,
  TextField,
  Button,
  Typography,
} from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import styles from "../styles/VideoMeet.module.css";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const server_url = import.meta.env.VITE_SERVER_URL;

var connections = {};

const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

function increaseAudioBitrate(sdp) {
  return sdp.replace(
    /a=fmtp:111 minptime=10;useinbandfec=1/g,
    "a=fmtp:111 minptime=10;useinbandfec=1;maxaveragebitrate=128000",
  );
}

function boostVideoBitrate(sender) {
  if (!sender || sender.track?.kind !== "video") return;
  const params = sender.getParameters();
  if (!params.encodings || params.encodings.length === 0) {
    params.encodings = [{}];
  }
  params.encodings[0].maxBitrate = 2500000; // ~2.5 Mbps, Meet ke 720p HD jaisa
  params.encodings[0].scaleResolutionDownBy = 1.0; // full resolution bhejo
  params.encodings[0].maxFramerate = 30;
  params.degradationPreference = "balanced"; // network tight ho to smooth graceful degrade
  sender
    .setParameters(params)
    .catch((err) => console.log("setParameters error:", err));
}

const getAvatarColor = (name) => {
  const colors = [
    "#4285F4",
    "#EA4335",
    "#FBBC05",
    "#34A853",
    "#9C27B0",
    "#FF6D00",
    "#009688",
    "#3F51B5",
    "#E91E63",
    "#795548",
  ];

  if (!name) return colors[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i);
  }

  return colors[hash % colors.length];
};

const getInitial = (name) => {
  if (!name || name.trim() === "") return "?";
  return name.trim().charAt(0).toUpperCase();
};

/* =========================================================
   IMPORTANT: React ke onTouchMove synthetic handlers browser me
   "passive" listeners hote hain by default, isliye unke andar
   e.preventDefault() call karne se bhi page-level pinch-zoom
   nahi rukta. Isliye hum yaha native addEventListener use kar
   rahe hain with { passive: false } — yahi asli fix hai.
========================================================= */

/* ---------------------------------------------------------
   1) Sirf PINCH-ZOOM (remote video tiles ke liye)
   - 2-finger pinch => sirf isi video ko zoom karta hai
   - Double-tap => zoom reset
--------------------------------------------------------- */
function usePinchZoomNative(elRef) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    let lastDist = null;
    let lastTap = 0;

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        lastDist = getDistance(e.touches);
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) setScale(1); // double-tap reset
        lastTap = now;
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && lastDist) {
        e.preventDefault(); // sirf isi element ka gesture roka, page ka nahi
        const newDist = getDistance(e.touches);
        const delta = newDist / lastDist;
        setScale((prev) => Math.min(3, Math.max(1, prev * delta)));
        lastDist = newDist;
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) lastDist = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [elRef]);

  return scale;
}

function useLocalVideoBox() {
  const [el, setEl] = useState(null);
  const boxRef = React.useCallback((node) => {
    setEl(node);
  }, []);

  const [size, setSize] = useState(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!el) return; // ab ye tabhi return karega jab wakai element nahi hai

    const MIN_W = 90;
    const getMaxW = () => Math.min(520, window.innerWidth * 0.9);

    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOrigX = 0;
    let dragOrigY = 0;
    let dragW = 0;
    let dragH = 0;

    let pinching = false;
    let initialDist = null;
    let pinchStartW = 0;
    let pinchStartH = 0;
    let pinchCenterX = 0;
    let pinchCenterY = 0;

    let lastTap = 0;

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const clampPos = (x, y, w, h) => ({
      x: Math.max(0, Math.min(x, window.innerWidth - w)),
      y: Math.max(0, Math.min(y, window.innerHeight - h)),
    });

    const startDrag = (clientX, clientY) => {
      const rect = el.getBoundingClientRect();
      dragging = true;
      dragStartX = clientX;
      dragStartY = clientY;
      dragOrigX = rect.left;
      dragOrigY = rect.top;
      dragW = rect.width;
      dragH = rect.height;
    };

    const moveDrag = (clientX, clientY) => {
      const dx = clientX - dragStartX;
      const dy = clientY - dragStartY;
      setPos(clampPos(dragOrigX + dx, dragOrigY + dy, dragW, dragH));
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinching = true;
        dragging = false;
        const rect = el.getBoundingClientRect();
        pinchStartW = rect.width;
        pinchStartH = rect.height;
        pinchCenterX = rect.left + rect.width / 2;
        pinchCenterY = rect.top + rect.height / 2;
        initialDist = getDistance(e.touches);
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) {
          setSize(null);
          setPos(null);
        }
        lastTap = now;
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 2 && pinching && initialDist) {
        const newDist = getDistance(e.touches);
        const ratio = newDist / initialDist;
        const aspect = pinchStartW / pinchStartH;

        const maxW = getMaxW();
        let newW = Math.min(maxW, Math.max(MIN_W, pinchStartW * ratio));
        let newH = newW / aspect;

        let newX = pinchCenterX - newW / 2;
        let newY = pinchCenterY - newH / 2;
        const clamped = clampPos(newX, newY, newW, newH);

        setSize({ width: newW, height: newH });
        setPos(clamped);
      } else if (e.touches.length === 1 && dragging) {
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) {
        pinching = false;
        initialDist = null;
      }
      if (e.touches.length === 0) dragging = false;
    };

    const onMouseDown = (e) => {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);

      const onMouseMove = (ev) => {
        if (dragging) moveDrag(ev.clientX, ev.clientY);
      };
      const onMouseUp = () => {
        dragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });
    el.addEventListener("mousedown", onMouseDown);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
    };
  }, [el]); // <-- ab `el` change hote hi effect re-run hoga

  return { ref: boxRef, size, pos };
}

function RemoteVideoTile({ stream, username, videoOn }) {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const scale = usePinchZoomNative(wrapRef);

  const hasVideo =
    videoOn !== false &&
    !!stream &&
    stream.getVideoTracks &&
    stream.getVideoTracks().length > 0;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream || !hasVideo) return;

    el.srcObject = stream;

    const tryPlay = () => {
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch((err) => {
          console.log("Video play error:", err.name, err.message);
        });
      }
    };

    tryPlay();
  }, [stream, hasVideo, videoOn]);

  if (!hasVideo) {
    return (
      <div className={styles.cameraOff}>
        <div
          className={styles.avatarCircle}
          style={{ backgroundColor: getAvatarColor(username) }}
        >
          {getInitial(username)}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      <video
        key={videoOn ? "on" : "off"}
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          background: "black",
          transform: `scale(${scale})`,
          transition: scale === 1 ? "transform 0.2s ease" : "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

let silence = () => {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const destination = oscillator.connect(
    audioContext.createMediaStreamDestination(),
  );
  oscillator.start();
  audioContext.resume();
  const track = destination.stream.getAudioTracks()[0];
  track.enabled = false;
  return track;
};

let black = ({ width = 1280, height = 720 } = {}) => {
  const canvas = Object.assign(document.createElement("canvas"), {
    width,
    height,
  });
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  const stream = canvas.captureStream(30);
  const track = stream.getVideoTracks()[0];
  track.enabled = false;
  return track;
};

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();

  const localVideoref = useRef();
  const users = useRef({});
  const {
    ref: localBoxRef,
    size: localSize,
    pos: localPos,
  } = useLocalVideoBox();

  let [usernameInput, setUsernameInput] = useState("");
  let [videoAvailable, setVideoAvailable] = useState(true);
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [video, setVideo] = useState(true);
  let [audio, setAudio] = useState(true);
  let [screen, setScreen] = useState(false);
  let [showModal, setModal] = useState(false);
  let [screenAvailable, setScreenAvailable] = useState();
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessages, setNewMessages] = useState(0);
  let [askForUsername, setAskForUsername] = useState(true);
  let [videos, setVideos] = useState([]);

  let [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    getPermissions();
    const savedUsername = localStorage.getItem("username");
    if (savedUsername) {
      setUsernameInput(savedUsername);
    }
  }, []);

  useEffect(() => {
    if (localVideoref.current && window.localStream) {
      localVideoref.current.srcObject = window.localStream;
    }
  }, [video]);

  const getPermissions = async () => {
    if (window.localStream && window.localStream.active) {
      const hasVideo = window.localStream.getVideoTracks().length > 0;
      const hasAudio = window.localStream.getAudioTracks().length > 0;

      setVideo(hasVideo);
      setAudio(hasAudio);
      setVideoAvailable(hasVideo);
      setAudioAvailable(hasAudio);

      if (localVideoref.current) {
        localVideoref.current.srcObject = window.localStream;
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });

      stream.getVideoTracks().forEach((t) => (t.contentHint = "motion"));
      window.localStream = stream;

      setVideo(stream.getVideoTracks().length > 0);
      setAudio(stream.getAudioTracks().length > 0);
      setVideoAvailable(stream.getVideoTracks().length > 0);
      setAudioAvailable(stream.getAudioTracks().length > 0);

      if (localVideoref.current) {
        localVideoref.current.srcObject = window.localStream;
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      }
    } catch (err) {
      console.log(err);
      setVideoAvailable(false);
      setAudioAvailable(false);
    }
  };

  let getUserMedia = (wantVideo = video, wantAudio = audio) => {
    if (window.localStream && window.localStream.active) {
      getUserMediaSuccess(window.localStream);
      return;
    }

    if (window.isGettingUserMedia) return;

    if ((wantVideo && videoAvailable) || (wantAudio && audioAvailable)) {
      window.isGettingUserMedia = true;

      navigator.mediaDevices
        .getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
        })
        .then((stream) => {
          window.isGettingUserMedia = false;
          stream.getVideoTracks().forEach((t) => (t.contentHint = "motion"));
          getUserMediaSuccess(stream);
        })
        .catch((e) => {
          window.isGettingUserMedia = false;
          console.log(e);
        });
    } else {
      try {
        if (localVideoref.current?.srcObject) {
          localVideoref.current.srcObject
            .getTracks()
            .forEach((track) => track.stop());
        }
        window.localStream = null;
      } catch (e) {
        console.log(e);
      }
    }
  };

  let getUserMediaSuccess = (stream) => {
    try {
      if (window.localStream && window.localStream !== stream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    setVideo(stream.getVideoTracks().some((t) => t.enabled));

    requestAnimationFrame(() => {
      if (localVideoref.current) {
        localVideoref.current.srcObject = stream;
      }
    });

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      let addedNewSender = false;

      stream.getTracks().forEach((newTrack) => {
        const existingSender = connections[id]
          .getSenders()
          .find((s) => s.track && s.track.kind === newTrack.kind);

        if (existingSender) {
          existingSender
            .replaceTrack(newTrack)
            .catch((err) => console.log("ReplaceTrack error:", err));
          boostVideoBitrate(existingSender);
        } else {
          const newSender = connections[id].addTrack(newTrack, stream);
          boostVideoBitrate(newSender);
          addedNewSender = true;
        }
      });

      if (!addedNewSender) continue;
      if (connections[id].signalingState !== "stable") continue;

      connections[id]
        .createOffer()
        .then((description) => {
          description.sdp = increaseAudioBitrate(description.sdp);
          return connections[id].setLocalDescription(description);
        })
        .then(() => {
          socketRef.current.emit(
            "signal",
            id,
            JSON.stringify({ sdp: connections[id].localDescription }),
          );
        })
        .catch((err) => console.log(err));
    }

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        if (track.kind === "video") setVideo(false);
        if (track.kind === "audio") setAudio(false);

        try {
          localVideoref.current.srcObject?.getTracks().forEach((t) => t.stop());
        } catch (e) {
          console.log(e);
        }

        let blackSilence = (...args) =>
          new MediaStream([black(...args), silence()]);

        window.localStream = blackSilence();
        localVideoref.current.srcObject = window.localStream;

        for (let id in connections) {
          connections[id].getSenders().forEach((sender) => {
            if (sender.track) connections[id].removeTrack(sender);
          });

          window.localStream.getTracks().forEach((t) => {
            connections[id].addTrack(t, window.localStream);
          });

          if (connections[id].signalingState !== "stable") continue;

          connections[id]
            .createOffer()
            .then((description) => {
              description.sdp = increaseAudioBitrate(description.sdp);
              return connections[id].setLocalDescription(description);
            })
            .then(() => {
              socketRef.current.emit(
                "signal",
                id,
                JSON.stringify({ sdp: connections[id].localDescription }),
              );
            })
            .catch((err) => console.log(err));
        }
      };
    });
  };

  const getDislayMediaSuccess = (stream) => {
    const screenVideoTrack = stream.getVideoTracks()[0];
    const oldStream = window.localStream;
    const micTrack = oldStream?.getAudioTracks()[0];

    for (let id in connections) {
      const sender = connections[id]
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (sender) {
        sender
          .replaceTrack(screenVideoTrack)
          .catch((err) => console.log("ReplaceTrack error:", err));
      } else {
        connections[id].addTrack(screenVideoTrack, stream);
      }
    }

    oldStream?.getVideoTracks().forEach((t) => t.stop());

    const combinedTracks = [screenVideoTrack];
    if (micTrack) combinedTracks.push(micTrack);
    const combinedStream = new MediaStream(combinedTracks);

    window.localStream = combinedStream;
    if (localVideoref.current) {
      localVideoref.current.srcObject = combinedStream;
    }

    screenVideoTrack.onended = () => {
      setScreen(false);
      getUserMedia(video, audio);
    };
  };

  const getDislayMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });
      getDislayMediaSuccess(stream);
    } catch (err) {
      console.log(err);
      setScreen(false);
    }
  };

  let gotMessageFromServer = async (fromId, message) => {
    const signal = JSON.parse(message);

    if (fromId === socketIdRef.current) return;

    if (!connections[fromId]) {
      connections[fromId] = new RTCPeerConnection(peerConfigConnections);

      connections[fromId]._pendingCandidates = [];

      connections[fromId].onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit(
            "signal",
            fromId,
            JSON.stringify({ ice: event.candidate }),
          );
        }
      };

      connections[fromId].oniceconnectionstatechange = () => {
        console.log(
          `[${fromId}] iceConnectionState:`,
          connections[fromId]?.iceConnectionState,
        );
      };
      connections[fromId].onconnectionstatechange = () => {
        console.log(
          `[${fromId}] connectionState:`,
          connections[fromId]?.connectionState,
        );
      };

      connections[fromId].ontrack = (event) => {
        const stream = event.streams[0];

        setVideos((prev) => {
          const index = prev.findIndex((v) => v.socketId === fromId);

          if (index !== -1) {
            const updated = [...prev];
            updated[index].stream = stream;
            return updated;
          }

          return [
            ...prev,
            { socketId: fromId, stream, username: users.current[fromId] },
          ];
        });
      };

      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => {
          const sender = connections[fromId].addTrack(
            track,
            window.localStream,
          );
          boostVideoBitrate(sender);
        });
      }
    }

    try {
      if (signal.sdp) {
        if (
          signal.sdp.type === "answer" &&
          connections[fromId].signalingState !== "have-local-offer"
        ) {
          return;
        }
        if (
          signal.sdp.type === "offer" &&
          connections[fromId].signalingState !== "stable"
        ) {
          return;
        }

        await connections[fromId].setRemoteDescription(
          new RTCSessionDescription(signal.sdp),
        );

        const pending = connections[fromId]._pendingCandidates || [];
        connections[fromId]._pendingCandidates = [];
        for (const candidate of pending) {
          try {
            await connections[fromId].addIceCandidate(candidate);
          } catch (err) {
            console.log("Queued ICE candidate error:", err);
          }
        }

        if (signal.sdp.type === "offer") {
          const answer = await connections[fromId].createAnswer();

          answer.sdp = increaseAudioBitrate(answer.sdp);

          await connections[fromId].setLocalDescription(answer);

          socketRef.current.emit(
            "signal",
            fromId,
            JSON.stringify({ sdp: connections[fromId].localDescription }),
          );
        }
      }

      if (signal.ice) {
        const candidate = new RTCIceCandidate(signal.ice);

        if (
          connections[fromId].remoteDescription &&
          connections[fromId].remoteDescription.type
        ) {
          await connections[fromId].addIceCandidate(candidate);
        } else {
          connections[fromId]._pendingCandidates =
            connections[fromId]._pendingCandidates || [];
          connections[fromId]._pendingCandidates.push(candidate);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  let connectToSocketServer = () => {
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    socketRef.current = io(server_url, {
      transports: ["websocket"],
      upgrade: false,
    });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("user-video-toggle", (id, isVideoOn) => {
      setVideos((prev) =>
        prev.map((v) => (v.socketId === id ? { ...v, videoOn: isVideoOn } : v)),
      );
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", {
        meetingId: window.location.href,
        username: usernameInput,
      });
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        if (connections[id]) {
          connections[id].close();
          delete connections[id];
        }
        setVideos((prev) => prev.filter((v) => v.socketId !== id));
      });

      socketRef.current.on("user-joined", (id, clients = []) => {
        if (!id || !Array.isArray(clients)) return;

        const userMap = {};
        clients.forEach((client) => {
          userMap[client.id] = client.username;
        });
        Object.assign(users.current, userMap);

        clients.forEach((client) => {
          const socketListId = client.id;
          const clientUsername = client.username;

          if (!socketListId) return;
          if (socketListId === socketIdRef.current) return;
          if (connections[socketListId]) return; // peer already exists

          const peer = new RTCPeerConnection(peerConfigConnections);
          peer._pendingCandidates = [];
          connections[socketListId] = peer;

          peer.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate }),
              );
            }
          };

          peer.oniceconnectionstatechange = () => {
            console.log(
              `[${socketListId}] iceConnectionState:`,
              peer.iceConnectionState,
            );
          };
          peer.onconnectionstatechange = () => {
            console.log(
              `[${socketListId}] connectionState:`,
              peer.connectionState,
            );
          };

          peer.ontrack = (event) => {
            const stream = event.streams[0];

            setVideos((prev) => {
              const exists = prev.find((v) => v.socketId === socketListId);
              if (exists) {
                return prev.map((v) =>
                  v.socketId === socketListId
                    ? { ...v, stream, username: clientUsername }
                    : v,
                );
              }
              return [
                ...prev,
                { socketId: socketListId, username: clientUsername, stream },
              ];
            });
          };

          if (window.localStream) {
            window.localStream.getTracks().forEach((track) => {
              const sender = peer.addTrack(track, window.localStream);
              boostVideoBitrate(sender);
            });
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;
            if (connections[id2].signalingState !== "stable") continue;

            connections[id2]
              .createOffer()
              .then((description) => {
                description.sdp = increaseAudioBitrate(description.sdp);
                return connections[id2].setLocalDescription(description);
              })
              .then(() => {
                socketRef.current.emit(
                  "signal",
                  id2,
                  JSON.stringify({ sdp: connections[id2].localDescription }),
                );
              })
              .catch(console.log);
          }
        }
      });
    });
  };

  const handleAudio = () => {
    const audioTrack = window.localStream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudio(audioTrack.enabled);
    }
  };

  const handleVideo = () => {
    const videoTrack = window.localStream?.getVideoTracks()[0];
    if (!videoTrack) return;

    const turningOn = !video;
    videoTrack.enabled = turningOn;

    setVideo(turningOn);
    socketRef.current?.emit("video-toggle", turningOn);
  };

  useEffect(() => {
    if (screen) {
      getDislayMedia();
    }
  }, [screen]);

  const getGridLayout = (count, width) => {
    const isMobile = width <= 768;
    const isTablet = width > 768 && width <= 1024;

    if (isMobile) {
      return { cols: count <= 2 ? 1 : 2 };
    }

    if (isTablet) {
      if (count <= 1) return { cols: 1 };
      if (count <= 4) return { cols: 2 };
      return { cols: 3 };
    }

    // desktop
    if (count <= 1) return { cols: 1 };
    if (count === 2) return { cols: 2 };
    if (count <= 4) return { cols: 2 };
    if (count <= 6) return { cols: 3 };
    if (count <= 9) return { cols: 3 };
    if (count <= 12) return { cols: 4 };
    return { cols: 5 };
  };

  let handleScreen = () => {
    setScreen(!screen);
  };

  let routeTo = useNavigate();

  const handleEndCall = () => {
    try {
      const tracks = localVideoref.current?.srcObject?.getTracks();
      tracks?.forEach((track) => track.stop());
      const rawTrack = localVideoref.current?.srcObject?._rawVideoTrack;
      rawTrack?.stop();
    } catch (e) {
      console.log(e);
    }

    for (let id in connections) {
      connections[id].close();
      delete connections[id];
    }

    socketRef.current?.disconnect();
    window.localStream = null;

    routeTo("/home");
  };

  let openChat = () => {
    setModal(true);
    setNewMessages(0);
  };
  let closeChat = () => {
    setModal(false);
  };

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  };

  let sendMessage = () => {
    if (message.trim() === "") return;
    socketRef.current.emit("chat-message", message, usernameInput);
    setMessage("");
  };

  let connect = () => {
    const finalUsername = usernameInput.trim() || "Guest";
    setUsernameInput(finalUsername);
    localStorage.setItem("username", finalUsername);

    setAskForUsername(false);
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    getUserMedia(videoAvailable, audioAvailable);

    if (!socketRef.current || !socketRef.current.connected) {
      connectToSocketServer();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (message.trim() !== "") sendMessage();
    }
  };

  return (
    <div>
      {askForUsername ? (
        <div
          style={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#111827",
          }}
        >
          <div className={styles.joinCard}>
            <h2 style={{ marginBottom: "8px" }}>Join Meeting</h2>
            <p style={{ color: "#666" }}>Preview your camera before joining</p>

            <div className={styles.previewBox}>
              {video ? (
                <>
                  <video ref={localVideoref} autoPlay muted playsInline />
                  <div className={styles.previewVideoName}>
                    {usernameInput || "Guest"}
                  </div>
                </>
              ) : (
                <div className={styles.previewCameraOff}>
                  <div
                    className={styles.avatarCircle}
                    style={{ backgroundColor: getAvatarColor(usernameInput) }}
                  >
                    {getInitial(usernameInput)}
                  </div>
                  <div className={styles.previewUserName}>
                    {usernameInput || "Guest"}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 15 }}>
              <TextField
                label="Enter Username"
                fullWidth
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    connect();
                  }
                }}
                sx={{ mt: 2 }}
              />
            </div>

            <Button
              variant="contained"
              fullWidth
              sx={{
                mt: 2,
                height: 50,
                fontWeight: 700,
                fontSize: "16px",
                borderRadius: "10px",
              }}
              onClick={connect}
            >
              Join Meeting
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {showModal && (
            <div className={styles.chatRoom}>
              <div className={styles.chatHeader}>
                <IconButton className={styles.chatBack} onClick={closeChat}>
                  <ArrowBackIcon />
                </IconButton>
                <h2>Chat</h2>
                <div style={{ width: 40 }}></div>
              </div>

              <div className={styles.chatContainer}>
                {messages.length ? (
                  messages.map((item, index) => (
                    <div key={index}>
                      <strong>{item.sender}</strong>
                      <p>{item.data}</p>
                    </div>
                  ))
                ) : (
                  <p>No Messages Yet</p>
                )}
              </div>

              <div className={styles.chattingArea}>
                <TextField
                  fullWidth
                  size="small"
                  label="Message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button variant="contained" onClick={sendMessage}>
                  Send
                </Button>
              </div>
            </div>
          )}

          <div
            className={`${styles.conferenceView} ${
              showModal ? styles.chatOpen : ""
            }`}
            style={{
              gridTemplateColumns: `repeat(${
                getGridLayout(
                  videos.length,
                  showModal && windowWidth > 768
                    ? windowWidth - 380
                    : windowWidth,
                ).cols
              }, 1fr)`,
            }}
          >
            {videos
              .filter((item) => item && item.socketId)
              .map((item) => (
                <div
                  key={item.socketId}
                  className={styles.remoteVideoContainer}
                >
                  <RemoteVideoTile
                    stream={item.stream}
                    username={item.username}
                    videoOn={item.videoOn}
                  />
                  <div className={styles.videoUserName}>
                    {item.username || "User"}
                  </div>
                </div>
              ))}
          </div>

          <div
            ref={localBoxRef}
            className={styles.localVideoContainer}
            style={{
              position: "fixed",
              cursor: "grab",
              touchAction: "none", // browser ka apna gesture handling yaha off, sab JS control karega
              ...(localSize
                ? { width: localSize.width, height: localSize.height }
                : {}),
              ...(localPos
                ? {
                    left: localPos.x,
                    top: localPos.y,
                    right: "auto",
                    bottom: "auto",
                  }
                : {}),
            }}
          >
            {video ? (
              <video
                ref={localVideoref}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  background: "black",
                  pointerEvents: "none", // gestures box par hi lagein, video par nahi
                }}
              />
            ) : (
              <div className={styles.cameraOff}>
                <div
                  className={styles.avatarCircle}
                  style={{ backgroundColor: getAvatarColor(usernameInput) }}
                >
                  {getInitial(usernameInput)}
                </div>
              </div>
            )}
            <div className={styles.videoUserName}>{usernameInput || "You"}</div>
          </div>

          <div className={styles.buttonContainers}>
            <IconButton className={styles.controlButton} onClick={handleVideo}>
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton
              className={`${styles.controlButton} ${styles.endCall}`}
              onClick={handleEndCall}
            >
              <CallEndIcon />
            </IconButton>

            <IconButton className={styles.controlButton} onClick={handleAudio}>
              {audio ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {screenAvailable && (
              <IconButton
                className={styles.controlButton}
                onClick={handleScreen}
              >
                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>
            )}

            <Badge badgeContent={Number(newMessages) || 0} color="secondary">
              <IconButton
                className={styles.controlButton}
                onClick={() => (showModal ? closeChat() : openChat())}
              >
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
