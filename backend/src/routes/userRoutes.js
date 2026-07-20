import { Router } from "express";
import passport from "../config/passport.js";
import { forgotPassword, resetPassword } from "../controllers/userController.js";
import {
  addToHistory,
  getUserHistory,
  login,
  register,
  generateToken,
} from "../controllers/userController.js";

import authenticate from "../middleware/authenticate.js";

const router = Router();

// Public Routes
router.post("/login", login);
router.post("/register", register);

// Protected Routes
router.post("/add_to_activity", authenticate, addToHistory);
router.get("/get_all_activity", authenticate, getUserHistory);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// ---- Google OAuth ----
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth` }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}&username=${req.user.username}`);
  }
);

// ---- GitHub OAuth -----
router.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);

router.get(
  "/auth/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth` }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}&username=${req.user.username}`);
  }
);

export default router;
