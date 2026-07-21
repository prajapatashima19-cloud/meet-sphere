import React, { useContext, useState } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
import { Button, IconButton, TextField } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import { AuthContext } from "../contexts/AuthContext";
import LogoutIcon from "@mui/icons-material/Logout";

export function Home() {
  let navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");

  const { addToUserHistory } = useContext(AuthContext);

  const handleJoinMeeting = () => {
    const savedUsername = localStorage.getItem("username");

    if (!savedUsername) {
      alert("Please login first");
      return;
    }

    navigate(`/${meetingCode}`);
  };

  return (
    <>
      <div className="navBar">
        <div className="logo">
          <div className="logoIcon">
            <VideoCallIcon sx={{ color: "white", fontSize: 30 }} />
          </div>

          <div className="logoText">
            <h2>MeetSphere</h2>
            {/* RESPONSIVE: tagline hidden on very small screens to save navbar space */}
            <p className="tagline">Secure Video Meetings</p>
          </div>
        </div>

        <div className="navActions">
          <div className="history" onClick={() => navigate("/history")}>
            <RestoreIcon />
            <p>History</p>
          </div>

          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: "600",
              whiteSpace: "nowrap",
            }}
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/auth");
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* HERO SECTION */}
      <div className="meetContainer">
        <div className="leftPanel">
          <div>
            <h1>
              <span style={{ color: "#1976d2" }}>Connect</span> with anyone,
              <br />
              Anytime, Anywhere.
            </h1>
            <p>High quality and secure video meetings with one click.</p>

            <div className="joinRow">
              <TextField
                label="Meeting Code"
                variant="outlined"
                size="medium"
                placeholder="Enter Meeting Code"
                className="meetingCodeField"
                onChange={(e) => setMeetingCode(e.target.value)}
              />

              <Button
                variant="contained"
                className="joinButton"
                sx={{
                  height: "56px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  marginBottom: "20px",
                }}
                size="large"
                onClick={handleJoinMeeting}
              >
                Join Meeting
              </Button>
            </div>
          </div>
        </div>

        <div className="rightPanel">
          <img src="/logo3.png" alt="logo" />
        </div>
      </div>
    </>
  );
}
export default withAuth(Home);
