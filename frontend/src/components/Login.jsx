import React from "react";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Grid,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import Divider from "@mui/material/Divider";

import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";

import { useNavigate } from "react-router-dom";

// Show / Hide Password
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { AuthContext } from "../contexts/AuthContext";

export default function Login() {
  const [username, setUsername] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [severity, setSeverity] = React.useState("success");
  const [remember, setRemember] = React.useState(false);
  const [formState, setFormState] = React.useState(0);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const { handleLogin, handleRegister } = React.useContext(AuthContext);

  const navigate = useNavigate();

  let handleAuth = async () => {
    try {
      if (formState === 0) {
        if (!username || !password) {
          setError("Username and Password are required.");
          return;
        }

        const result = await handleLogin(username, password);
        console.log(result);
        // Direct home page
        navigate("/home");
      }

      if (formState === 1) {
        if (!name || !username || !password || !email) {
          setError("All fields are required.");
          return;
        }

        let result = await handleRegister(name, username, email, password);

        setSeverity("success");
        setMessage(result || "Registration Successful! Please login.");
        setOpen(true);

        setFormState(0);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        py: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          overflow: "auto",
          borderRadius: 4,
          boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
        }}
      >
        <Grid container>
          {/* Left Side */}
          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              minHeight: "650px",
            }}
          />

          {/* Right Side */}
          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 5,
            }}
          >
            <Box
              component="form"
              sx={{
                width: "80%",
              }}
            >
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  mx: "auto",
                }}
              >
                <LockOutlinedIcon />
              </Avatar>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 2,
                  mb: 2,
                  mt: 1,
                }}
              >
                <Button
                  variant={formState === 0 ? "contained" : "outlined"}
                  onClick={() => {
                    setFormState(0);
                    setError("");
                  }}
                >
                  Sign In
                </Button>
                <Button
                  variant={formState === 1 ? "contained" : "outlined"}
                  onClick={() => {
                    setFormState(1);
                    setError("");
                  }}
                >
                  Sign Up
                </Button>
              </Box>

              {formState === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                >
                  Welcome back! Please login to continue.
                </Typography>
              )}

              {formState === 1 && (
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center" }}
                  >
                    Welcome! Please Register to continue.
                  </Typography>

                  <TextField
                    margin="dense"
                    label="Email"
                    id="email"
                    name="email"
                    type="text"
                    fullWidth
                    required
                    onChange={(e) => {
                      setEmail(e.target.value);
                    }}
                  />

                  <TextField
                    margin="normal"
                    label="Fullname"
                    id="fullname"
                    name="fullname"
                    type="text"
                    fullWidth
                    required
                    onChange={(e) => {
                      setName(e.target.value);
                    }}
                  />
                </>
              )}

              <TextField
                margin="normal"
                label="Username"
                id="username"
                name="username"
                type="text"
                fullWidth
                required
                autoFocus
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
              />

              <TextField
                margin="normal"
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <p style={{ color: "red" }}>{error}</p>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                }
                label="Remember me"
              />

              <Button
                type="button"
                variant="contained"
                fullWidth
                size="large"
                sx={{
                  mt: 1,
                  py: 1.4,
                  borderRadius: 3,
                  fontWeight: "bold",
                  textTransform: "none",
                  fontSize: "1rem",
                }}
                onClick={handleAuth}
              >
                {formState === 0 ? "Login" : "Register"}
              </Button>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 2,
                }}
              >
                <Link
                  href="#"
                  underline="hover"
                  onClick={() => {
                    navigate("/forgot-password");
                  }}
                >
                  Forgot password?
                </Link>

                <Link
                  href="#"
                  underline="hover"
                  onClick={() => {
                    setFormState(1);
                  }}
                >
                  Create account
                </Link>
              </Box>
              <Divider sx={{ my: 2 }}>OR</Divider>

              <Button
                variant="outlined"
                fullWidth
                startIcon={<GoogleIcon />}
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_SERVER_URL}/api/v1/users/auth/google`;
                }}
                sx={{
                  py: 1.3,
                  textTransform: "none",
                  mb: 2,
                  borderRadius: 2,
                }}
              >
                Sign in with Google
              </Button>

              <Button
                variant="outlined"
                fullWidth
                startIcon={<GitHubIcon />}
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_SERVER_URL}/api/v1/users/auth/google`;
                }}
                sx={{
                  py: 1.3,
                  textTransform: "none",
                  borderRadius: 2,
                }}
              >
                Sign in with GitHub
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
      >
        <Alert
          severity={severity}
          variant="filled"
          onClose={() => setOpen(false)}
        >
          {message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
