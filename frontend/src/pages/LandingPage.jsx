import React from "react";
import "../App.css";
import { useNavigate, Link } from "react-router-dom";

export default function LandingPage() {
  const route = useNavigate();
  return (
    <div className="landingPageContainer">
      <nav>
        <div className="navHeader">
          <h2>MeetSphere</h2>
        </div>
        <div className="navList">
          <p
            onClick={() => {
              route("/random");
            }}
          >
            Join as Guest
          </p>
          <p
            onClick={() => {
              route("/auth");
            }}
          >
            Register
          </p>
          <div
            onClick={() => {
              route("/auth");
            }}
            role="button"
          >
            <p>Login</p>
          </div>
        </div>
      </nav>

      <div className="landingMainContainer">
        <div>
          <h1>
            {" "}
            <span style={{ color: "#FF9839" }}>Connect</span> with your Loved
            Ones
          </h1>

          <p>Cover a distance by apna video call</p>
          <div role="button">
            <Link to="/auth">Get Started</Link>
          </div>
        </div>
        <div>
          <img src="/mobile.png" alt="MeetSphere preview" />
        </div>
      </div>
    </div>
  );
}
