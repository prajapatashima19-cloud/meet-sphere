import React, { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EmailIcon from "@mui/icons-material/Email";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const server_url = "https://meet-sphere-ccvb.onrender.com";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState("success");
  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${server_url}/api/v1/users/forgot-password`, {
        email,
      });

      setSeverity("success");
      setMessage(res.data.message || "Password reset link sent successfully.");
      setOpen(true);

      setEmail("");
    } catch (err) {
      setSeverity("error");
      setMessage(err?.response?.data?.message || "Something went wrong.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        py: { xs: 2, sm: 3 },
        px: { xs: 1.5, sm: 3 },
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: "100%",
          maxWidth: 1000,
          borderRadius: { xs: 3, sm: 5 },
          overflow: "hidden",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap" }}>
          {/* Left Side */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              flexBasis: { md: 350 },
              backgroundImage:
                "url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              minHeight: { md: 600 },
              display: {
                xs: "none",
                md: "block",
              },
            }}
          />

          {/* Right Side */}
          <Box
            sx={{
              flex: 1,
              minWidth: { xs: "100%", md: 350 },
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: { xs: 3, sm: 4, md: 5 },
            }}
          >
            <Box sx={{ width: "100%", maxWidth: 380 }}>
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  width: { xs: 50, sm: 60 },
                  height: { xs: 50, sm: 60 },
                  mx: "auto",
                  mb: 2,
                }}
              >
                <LockResetIcon />
              </Avatar>

              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{
                  textAlign: "center",
                  fontSize: { xs: "1.6rem", sm: "2.125rem" },
                }}
              >
                Forgot Password
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center", mt: 1, mb: { xs: 3, sm: 4 } }}
              >
                Enter your registered email address. We'll send you a password
                reset link.
              </Typography>

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                slotProps={{
                  input: {
                    startAdornment: (
                      <EmailIcon
                        sx={{
                          mr: 1,
                          color: "gray",
                        }}
                      />
                    ),
                  },
                }}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  mt: 3,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: "bold",
                  fontSize: { xs: "14px", sm: "16px" },
                }}
                onClick={handleForgotPassword}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={25} color="inherit" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <Button
                fullWidth
                startIcon={<ArrowBackIcon />}
                sx={{
                  mt: 2,
                  textTransform: "none",
                }}
                onClick={() => navigate("/auth")}
              >
                Back to Login
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        sx={{
          width: { xs: "calc(100% - 32px)", sm: "auto" },
        }}
      >
        <Alert
          severity={severity}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Container>
  );
}