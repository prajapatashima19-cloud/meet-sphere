import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendResetEmail = async (to, resetUrl) => {
  const { data, error } = await resend.emails.send({
    from: "Acme <onboarding@resend.dev>", // test sender — works without domain verification
    to,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Click the button below to choose a new one:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1976d2;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">
          Reset Password
        </a>
        <p>This link will expire in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error("Failed to send reset email");
  }

  return data;
};