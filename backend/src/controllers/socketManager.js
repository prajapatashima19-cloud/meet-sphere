import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // ---- USER JOINS A ROOM ----
    socket.on("join-call", (data) => {
      const path = data.meetingId;

      if (connections[path] === undefined) {
        connections[path] = [];
      }

      connections[path].push({
        id: socket.id,
        username: data.username,
      });

      timeOnline[socket.id] = new Date();

      // Tell everyone in the room (including the new user) about the updated
      // client list, so meshes can be built on the client.
      connections[path].forEach((user) => {
        io.to(user.id).emit("user-joined", socket.id, connections[path]);
      });

      // Replay chat history to the newly joined user.
      if (messages[path] !== undefined) {
        for (let a = 0; a < messages[path].length; a++) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][a]["data"],
            messages[path][a]["sender"],
            messages[path][a]["socket-id-sender"],
          );
        }
      }
    });

    // ---- WEBRTC SIGNALING RELAY ----
    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    // ---- CAMERA ON/OFF BROADCAST ----

    socket.on("video-toggle", (isVideoOn) => {
      for (let room in connections) {
        if (connections[room].some((user) => user.id === socket.id)) {
          connections[room].forEach((user) => {
            if (user.id !== socket.id) {
              io.to(user.id).emit("user-video-toggle", socket.id, isVideoOn);
            }
          });
          break;
        }
      }
    });

    // ---- CHAT ----
    
    socket.on("chat-message", (data, sender) => {
      for (let room in connections) {
        if (connections[room].some((user) => user.id === socket.id)) {
          if (messages[room] === undefined) {
            messages[room] = [];
          }

          messages[room].push({
            sender,
            data,
            "socket-id-sender": socket.id,
          });

          connections[room].forEach((user) => {
            io.to(user.id).emit("chat-message", data, sender, socket.id);
          });

          break;
        }
      }
    });

    // ---- DISCONNECT / LEAVE ----
    socket.on("disconnect", () => {
      for (let room in connections) {
        const index = connections[room].findIndex(
          (user) => user.id === socket.id,
        );

        if (index !== -1) {
          connections[room].splice(index, 1);

          connections[room].forEach((user) => {
            io.to(user.id).emit("user-left", socket.id);
          });

          if (connections[room].length === 0) {
            delete connections[room];
            delete messages[room];
          }

          break;
        }
      }

      delete timeOnline[socket.id];
    });
  });

  return io;
};
