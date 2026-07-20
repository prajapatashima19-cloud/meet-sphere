import React, { createContext } from "react";
import axios from "axios";
import httpStatus from "http-status";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const BASE_URL = "https://meet-sphere-ccvb.onrender.com/api/v1/users";

  // Login
  const handleLogin = async (username, password) => {
    console.log("Sending Login Request");

    try {
      const response = await axios.post(`${BASE_URL}/login`, {
        username,
        password,
      });

      console.log("Response:", response.data);

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("username", response.data.username); // ✅ ADD THIS

      console.log("Saved Token:", localStorage.getItem("token"));
      console.log("Saved Username:", localStorage.getItem("username")); // ✅ Check

      return response.data;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  // Register
  const handleRegister = async (name, username, email, password) => {
    try {
      const response = await axios.post(`${BASE_URL}/register`, {
        name,
        username,
        email,
        password,
      });

      if (response.status === httpStatus.CREATED) {
        return response.data.message;
      }
    } catch (error) {
      throw error;
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
  };

  // GET History

  const getHistoryOfUser = async () => {
    try {
      let response = await axios.get(`${BASE_URL}/get_all_activity`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  // Add History

  const addToUserHistory = async (meetingCode) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${BASE_URL}/add_to_activity`,
        { meeting_code: meetingCode },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      return response.data;
    } catch (e) {
      throw e;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        handleLogin,
        handleRegister,
        handleLogout,
        getHistoryOfUser,
        addToUserHistory,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
