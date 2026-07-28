import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ---- Mock the User model ----
jest.unstable_mockModule("../../src/models/userModel.js", () => {
  class MockUser {
    constructor(data) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    }
  }
  MockUser.findOne = jest.fn();
  return { User: MockUser };
});

// ---- Mock the Meeting model ----
jest.unstable_mockModule("../../src/models/meetingModel.js", () => {
  class MockMeeting {
    constructor(data) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    }
  }
  MockMeeting.find = jest.fn();
  return { Meeting: MockMeeting };
});

// ---- Mock bcrypt ----
jest.unstable_mockModule("bcrypt", () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
  hash: jest.fn(),
}));

// ---- Mock the mailer so no real email is sent ----
jest.unstable_mockModule("../../src/utils/mailer.js", () => ({
  sendResetEmail: jest.fn().mockResolvedValue({ id: "email_1" }),
}));

// All mocked modules must be imported (dynamically) AFTER the mocks above.
const { User } = await import("../../src/models/userModel.js");
const { Meeting } = await import("../../src/models/meetingModel.js");
const bcrypt = (await import("bcrypt")).default;
const { sendResetEmail } = await import("../../src/utils/mailer.js");
const httpStatus = (await import("http-status")).default;
const {
  login,
  register,
  forgotPassword,
  resetPassword,
  getUserHistory,
  addToHistory,
  generateToken,
} = await import("../../src/controllers/userController.js");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("login", () => {
  it("returns 404 if user is not found", async () => {
    User.findOne.mockResolvedValue(null);
    const req = { body: { username: "nouser", password: "pw" } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("returns 401 for an incorrect password", async () => {
    User.findOne.mockResolvedValue({ username: "ashi", password: "hashed" });
    bcrypt.compare.mockResolvedValue(false);
    const req = { body: { username: "ashi", password: "wrongpw" } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid username or password",
    });
  });

  it("returns a token and username on success", async () => {
    User.findOne.mockResolvedValue({
      _id: "u1",
      username: "ashi",
      password: "hashed",
    });
    bcrypt.compare.mockResolvedValue(true);
    const req = { body: { username: "ashi", password: "correctpw" } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.username).toBe("ashi");
    expect(typeof payload.token).toBe("string");
  });

  it("returns 500 on unexpected error", async () => {
    User.findOne.mockRejectedValue(new Error("DB down"));
    const req = { body: { username: "ashi", password: "pw" } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "DB down" });
  });
});

describe("register", () => {
  it("returns FOUND if username already exists", async () => {
    User.findOne.mockResolvedValueOnce({ username: "ashi" }); // existingUser check
    const req = {
      body: { name: "Ashi", username: "ashi", email: "a@b.com", password: "pw" },
    };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(httpStatus.FOUND);
    expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
  });

  it("returns 400 if email already exists", async () => {
    User.findOne
      .mockResolvedValueOnce(null) // no existing username
      .mockResolvedValueOnce({ email: "a@b.com" }); // email taken
    const req = {
      body: { name: "Ashi", username: "ashi", email: "a@b.com", password: "pw" },
    };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Email already exists" });
  });

  it("creates a new user and returns 201 on success", async () => {
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    bcrypt.hash.mockResolvedValue("hashed-pw");
    const req = {
      body: { name: "Ashi", username: "ashi", email: "a@b.com", password: "pw" },
    };
    const res = mockRes();

    await register(req, res);

    expect(bcrypt.hash).toHaveBeenCalledWith("pw", 10);
    expect(res.status).toHaveBeenCalledWith(httpStatus.CREATED);
    expect(res.json).toHaveBeenCalledWith({ message: "User Registered" });
  });
});

describe("forgotPassword", () => {
  it("returns 400 if no email is provided", async () => {
    const req = { body: {} };
    const res = mockRes();

    await forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 if the email isn't registered", async () => {
    User.findOne.mockResolvedValue(null);
    const req = { body: { email: "nobody@example.com" } };
    const res = mockRes();

    await forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("sets a reset token and sends the email on success", async () => {
    const userDoc = {
      email: "a@b.com",
      save: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockResolvedValue(userDoc);
    const req = { body: { email: "a@b.com" } };
    const res = mockRes();

    await forgotPassword(req, res);

    expect(userDoc.resetToken).toBeTruthy();
    expect(userDoc.resetTokenExpiry).toBeGreaterThan(Date.now());
    expect(userDoc.save).toHaveBeenCalled();
    expect(sendResetEmail).toHaveBeenCalledWith(
      "a@b.com",
      expect.stringContaining(userDoc.resetToken)
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("resetPassword", () => {
  it("returns 400 if no password is provided", async () => {
    const req = { params: { token: "tok123" }, body: {} };
    const res = mockRes();

    await resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 if the token is invalid or expired", async () => {
    User.findOne.mockResolvedValue(null);
    const req = { params: { token: "badtoken" }, body: { password: "newpw" } };
    const res = mockRes();

    await resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "This reset link is invalid or has expired.",
    });
  });

  it("updates the password and clears the reset token on success", async () => {
    const userDoc = {
      password: "old-hash",
      resetToken: "tok123",
      resetTokenExpiry: Date.now() + 10000,
      save: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockResolvedValue(userDoc);
    bcrypt.hash.mockResolvedValue("new-hash");
    const req = { params: { token: "tok123" }, body: { password: "newpw" } };
    const res = mockRes();

    await resetPassword(req, res);

    expect(userDoc.password).toBe("new-hash");
    expect(userDoc.resetToken).toBeUndefined();
    expect(userDoc.resetTokenExpiry).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("getUserHistory", () => {
  it("returns 404 if the user is not found", async () => {
    User.findOne.mockResolvedValue(null);
    const req = { user: { username: "ashi" } };
    const res = mockRes();

    await getUserHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns the user's meetings on success", async () => {
    User.findOne.mockResolvedValue({ username: "ashi" });
    Meeting.find.mockResolvedValue([{ meetingCode: "abc-123" }]);
    const req = { user: { username: "ashi" } };
    const res = mockRes();

    await getUserHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ meetingCode: "abc-123" }]);
  });
});

describe("addToHistory", () => {
  it("returns 404 if the user is not found", async () => {
    User.findOne.mockResolvedValue(null);
    const req = { user: { username: "ashi" }, body: { meetingCode: "xyz-789" } };
    const res = mockRes();

    await addToHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("saves a new meeting and returns 201 on success", async () => {
    User.findOne.mockResolvedValue({ username: "ashi" });
    const req = { user: { username: "ashi" }, body: { meetingCode: "xyz-789" } };
    const res = mockRes();

    await addToHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "Added Code to History" });
  });
});

describe("generateToken", () => {
  it("signs a JWT containing the user id and username", () => {
    const token = generateToken({ _id: "u1", username: "ashi" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature
  });
});