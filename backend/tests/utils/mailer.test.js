import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock the "resend" package before importing the module under test,
// so no real network call / API key is ever needed.
const sendMock = jest.fn();

jest.unstable_mockModule("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

// Must import AFTER unstable_mockModule is set up.
const { sendResetEmail } = await import("../../src/utils/mailer.js");

describe("sendResetEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("sends an email with the correct recipient, subject, and reset link", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });

    const result = await sendResetEmail(
      "user@example.com",
      "https://app.example.com/reset/tok123"
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    const callArgs = sendMock.mock.calls[0][0];
    expect(callArgs.to).toBe("user@example.com");
    expect(callArgs.subject).toBe("Password Reset Request");
    expect(callArgs.html).toContain("https://app.example.com/reset/tok123");
    expect(result).toEqual({ id: "email_123" });
  });

  it("throws and logs when Resend returns an error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "invalid domain" },
    });

    await expect(
      sendResetEmail("user@example.com", "https://app.example.com/reset/x")
    ).rejects.toThrow("Failed to send reset email");

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});