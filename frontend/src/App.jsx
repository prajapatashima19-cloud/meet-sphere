import "./App.css";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Authentication from "./pages/Authentication";
import AuthProvider from "./contexts/AuthContext";
import VideoMeet from "./pages/VideoMeet";
import Home from "./pages/Home";
import History from "./pages/History";
import ForgotPassword from "./pages/ForgetPassword";
import ResetPassword from "./pages/Resetpassword";

function App() {
  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Authentication />} />
            <Route path="/home" element={<Home />} />
            <Route path="/history" element={<History/>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
             <Route path="/reset-password/:token" element={<ResetPassword/>} />
            <Route path="/:url" element={<VideoMeet />} />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;
