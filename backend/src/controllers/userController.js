import { User } from "../models/userModel.js";
import httpStatus from "http-status";
import bcrypt, { hash } from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meetingModel.js";
import jwt from "jsonwebtoken";
import { sendResetEmail } from "../utils/mailer.js";

// OAuth users ke liye token generate karna (login jaisa hi pattern)
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

//  login

const login = async (req, res) => {
  console.log("LOGIN API CALLED");
  console.log(req.body);
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    console.log("USER:", user);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    console.log("PASSWORD MATCH:", isPasswordCorrect);

    console.log("HASH:", user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    return res.status(200).json({
      token,
      username: user.username,
    });
  } catch (e) {
    res.status(500).json({
      message: e.message,
    });
  }
};

// register

const register = async (req, res) => {
  console.log("REGISTER API CALLED");
  const { name, username, email, password } = req.body;

  try {
    // User details lena
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(httpStatus.FOUND)
        .json({ message: "User already exists" });
    }

    const emailExists = await User.findOne({ email });

    if (emailExists) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }
    // Password hash karna
    const hashedPassword = await bcrypt.hash(password, 10);
    // Database me user save karna
    const newUser = new User({
      name: name,
      username: username,
      email: email,
      password: hashedPassword,
    });
    await newUser.save();
    console.log("Returning status:", httpStatus.CREATED);
    return res.status(httpStatus.CREATED).json({ message: "User Registered" });
  } catch (e) {
    res.json({ message: `Something went wrong ${e}` });
  }
};

// forgot password

const forgotPassword = async (req, res) => {
  console.log("FORGOT PASSWORD API CALLED");
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "This email is not registered.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 15; // 15 minutes
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendResetEmail(user.email, resetUrl);

    return res.status(200).json({
      message: "This email is registered. A reset link has been sent.",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
};

// reset password
// Verifies the token sent via email, checks it hasn't expired, then updates
// the user's password and clears the token so it can't be reused.

const resetPassword = async (req, res) => {
  console.log("RESET PASSWORD API CALLED");
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "New password is required" });
  }

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "This reset link is invalid or has expired.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return res.status(200).json({
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
};

const getUserHistory = async (req, res) => {
  try {
    const username = req.user.username;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const meetings = await Meeting.find({ user_id: user.username });

    return res.status(200).json(meetings);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

const addToHistory = async (req, res) => {
  try {
    const username = req.user.username;
    const { meeting_code } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newMeeting = new Meeting({
      user_id: user.username,
      meetingCode: meeting_code,
    });

    await newMeeting.save();

    return res.status(201).json({
      message: "Added Code to History",
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export {
  login,
  register,
  getUserHistory,
  addToHistory,
  generateToken,
  forgotPassword,
  resetPassword,
};
