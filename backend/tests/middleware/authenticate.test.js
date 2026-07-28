import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";
import authenticate from "../../src/middleware/authenticate.js";

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("authenticate middleware", () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  it("rejects requests with no Authorization header", () => {
    const req = { headers: {} };
    const res = mockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "No token provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an invalid/garbage token", () => {
    const req = { headers: { authorization: "Bearer not-a-real-token" } };
    const res = mockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an expired token", () => {
    const token = jwt.sign({ id: "123" }, process.env.JWT_SECRET, {
      expiresIn: -10, // already expired
    });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "jwt expired" });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches decoded user to req and calls next() for a valid token", () => {
    const payload = { id: "abc123", username: "ashi" };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject(payload);
    expect(res.status).not.toHaveBeenCalled();
  });
});