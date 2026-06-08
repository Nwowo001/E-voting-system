import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Simple in-memory OTP rate limiter
// Prevents a single email from requesting more than 3 OTPs per 10 minutes
const otpRateLimit = new Map(); // email -> { count, resetAt }
const OTP_MAX_PER_WINDOW = 3;
const OTP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const checkOTPRateLimit = (email) => {
  const now = Date.now();
  const record = otpRateLimit.get(email);

  if (!record || now > record.resetAt) {
    otpRateLimit.set(email, { count: 1, resetAt: now + OTP_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= OTP_MAX_PER_WINDOW) {
    const waitSecs = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, waitSecs };
  }

  record.count++;
  return { allowed: true };
};

// Create SMTP transporter using Resend
const createTransporter = () => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      "⚠️  RESEND_API_KEY not set in .env. Email will run in Mock Mode (OTPs print to console).",
    );
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    auth: {
      user: "resend",
      pass: apiKey,
    },
  });
};

const transporter = createTransporter();

/**
 * Sends a 6-digit OTP verification email.
 * Runs asynchronously in the background so it doesn't block Express response cycles.
 */
export const sendOTPEmail = async (email, otpCode, type) => {
  // --- Rate limit check ---
  const limit = checkOTPRateLimit(email);
  if (!limit.allowed) {
    console.warn(
      `🚫 OTP rate limit hit for ${email}. Try again in ${limit.waitSecs}s.`,
    );
    throw new Error(
      `Too many verification codes requested. Please wait ${limit.waitSecs} seconds before trying again.`,
    );
  }

  const from =
    process.env.RESEND_FROM_EMAIL || `"AcuVote System" <no-reply@acuvote.com>`;

  let subject = "AcuVote Verification Code";
  let bodyTitle = "Verify Your Account";
  let bodyText =
    "Please use the verification code below to complete your registration on AcuVote.";

  if (type === "vote") {
    subject = "AcuVote Security Code for Voting";
    bodyTitle = "Confirm Your Ballot Choice";
    bodyText =
      "You requested a verification code to cast your vote. Enter this code to submit your choice.";
  } else if (type === "password_reset") {
    subject = "AcuVote Password Reset Request";
    bodyTitle = "Reset Your Password";
    bodyText =
      "We received a request to reset your password. Use the code below to complete the reset process.";
  }

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: auto; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; color: #6366f1;">AcuVote</span>
      </div>
      <h2 style="font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 10px; color: #0f172a;">${bodyTitle}</h2>
      <p style="font-size: 14px; line-height: 1.5; color: #475569; text-align: center; margin-bottom: 30px;">
        ${bodyText}
      </p>
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5;">${otpCode}</span>
      </div>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.4; margin-top: 20px;">
        This code is confidential and expires in 15 minutes. If you did not request this, please ignore this email.
      </p>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0 15px 0;" />
      <p style="font-size: 10px; color: #cbd5e1; text-align: center; margin: 0;">
        AcuVote Inc. — Secure, transparent, and democratic.
      </p>
    </div>
  `;

  console.log(`🔑 Generated OTP for ${email} [${type}]: ${otpCode}`);

  if (!transporter) {
    console.log(
      `\n======================================================\n[MOCK EMAIL] OTP Sent to ${email}\nType: ${type}\nSubject: ${subject}\nCode: ${otpCode}\n======================================================\n`,
    );
    return { success: true, mock: true };
  }

  // Run sending in the background (fire-and-forget style to prevent UI lag)
  setImmediate(async () => {
    try {
      await transporter.sendMail({
        from,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(
        `📧 OTP Email successfully sent to ${email} for type: ${type}`,
      );
    } catch (error) {
      console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
      console.log(`🔑 [CONSOLE FALLBACK] OTP Code for ${email}: ${otpCode}`);
    }
  });

  return { success: true };
};
