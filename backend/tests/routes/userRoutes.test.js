import { describe, it, expect, jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

// ---- Mock the controllers so this test doesn't touch the real DB ----
jest.unstable_mockModule("../../src/controllers/userController.js", () => ({
  login: (req, res) => res.status(200).json({ message: "login called" }),
  register: (req, res) => res.status(201).json({ message: "register called" }),
  addToHistory: (req, res) =>
    res.status(200).json({ message: "history added", user: req.user }),
  getUserHistory: (req, res) =>
    res.status(200).json({ message: "history fetched", user: req.user }),
  forgotPassword: (req, res) =>
    res.status(200).json({ message: "forgot password called" }),
  resetPassword: (req, res) =>
    res.status(200).json({ message: "reset password called" }),
  generateToken: (user) => "fake-generated-token",
}));

// ---- Mock passport so OAuth routes don't hit Google/GitHub ----
jest.unstable_mockModule("../../src/config/passport.js", () => ({
  default: {
    authenticate: () => (req, res, next) => next(),
  },
}));

// Must import AFTER the mocks above are registered.
const { default: userRoutes } = await import("../../src/routes/userRoutes.js");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/users", userRoutes);
  return app;
}

describe("userRoutes", () => {
  const app = buildApp();

  it("POST /login reaches the login controller", async () => {
    const res = await request(app).post("/api/v1/users/login").send({});
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("login called");
  });

  it("POST /register reaches the register controller", async () => {
    const res = await request(app).post("/api/v1/users/register").send({});
    expect(res.status).toBe(201);
  });

  it("blocks a protected route with no token", async () => {
    const res = await request(app).get("/api/v1/users/get_all_activity");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("No token provided");
  });

  it("allows a protected route with a valid token", async () => {
    const token = jwt.sign({ id: "u1", username: "ashi" }, process.env.JWT_SECRET);

    const res = await request(app)
      .get("/api/v1/users/get_all_activity")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: "u1", username: "ashi" });
  });

  it("POST /forgot-password reaches the controller", async () => {
    const res = await request(app)
      .post("/api/v1/users/forgot-password")
      .send({ email: "user@example.com" });
    expect(res.status).toBe(200);
  });
});