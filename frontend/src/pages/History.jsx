import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import HomeIcon from "@mui/icons-material/Home";
import HistoryIcon from "@mui/icons-material/History";
import { IconButton } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import "../styles/History.css";

export default function History() {
  const { getHistoryOfUser } = useContext(AuthContext);

  const [meetings, setMeetings] = useState([]);

  const routeTo = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();
        setMeetings(history);
      } catch (e) {
        console.log(e);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="historyPage">
      <div className="historyHeader">
        <IconButton
          sx={{
            bgcolor: "white",
            boxShadow: 2,
            "&:hover": {
              bgcolor: "#f5f5f5",
            },
          }}
          onClick={() => routeTo("/home")}
        >
          <HomeIcon />
        </IconButton>

        {/* RESPONSIVE: shrink heading on small screens so it doesn't wrap awkwardly next to the icon */}
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{ fontSize: { xs: "1.4rem", sm: "1.8rem", md: "2.125rem" } }}
        >
          Meeting History
        </Typography>
      </div>

      {meetings.length !== 0 ? (
        <div className="historyCards">
          {meetings.map((meeting) => (
            <Card
              key={meeting._id}
              sx={{
                borderRadius: "18px",
                boxShadow: "0 8px 20px rgba(0,0,0,.12)",
                transition: ".3s",
                "&:hover": {
                  transform: "translateY(-6px)",
                },
              }}
            >
              <CardContent className="card">
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Meeting
                </Typography>

                <Typography
                  sx={{
                    display: "inline-block",
                    bgcolor: "#E3F2FD",
                    color: "#1976D2",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "8px",
                    fontWeight: 600,
                    mt: 1,
                    // RESPONSIVE: long meeting codes wrap instead of overflowing the card
                    wordBreak: "break-word",
                  }}
                >
                  #{meeting.meetingCode}
                </Typography>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "18px",
                  }}
                >
                  <AccessTimeIcon sx={{ fontSize: 18, color: "gray" }} />

                  <Typography color="text.secondary" sx={{ fontSize: { xs: "0.85rem", sm: "1rem" } }}>
                    {new Date(meeting.date).toLocaleString()}
                  </Typography>
                </div>
              </CardContent>

              <CardActions sx={{ p: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 600,
                    py: 1.2,
                  }}
                  onClick={() => routeTo(`/${meeting.meetingCode}`)}
                >
                  Join Again
                </Button>
              </CardActions>
            </Card>
          ))}
        </div>
      ) : (
        <div className="emptyHistory">
          <HistoryIcon sx={{ fontSize: { xs: 56, sm: 80 }, color: "#8b8b8b" }} />

          <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" }, textAlign: "center", px: 2 }}>
            No Meeting History
          </Typography>

          <Typography color="text.secondary" sx={{ textAlign: "center", px: 2 }}>
            Your joined meetings will appear here.
          </Typography>
        </div>
      )}
    </div>
  );
}
