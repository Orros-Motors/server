const nodemailer = require("nodemailer");

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const buildHtmlEmail = ({
  appName = "Orro Motors",
  otp,
  expiryMinutes = 10,
}) => {
  const primaryBlue = "#0B63FF";
  return `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${appName} — OTP</title>
    <style>
 
      body,html { margin:0; padding:0; background:#f5f7fb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
      .wrapper { width:100%; padding:40px 16px; box-sizing:border-box; display:flex; justify-content:center; }
      .card { max-width:680px; width:100%; background:#ffffff; border-radius:12px; box-shadow:0 8px 30px rgba(2,6,23,0.08); overflow:hidden; border:1px solid rgba(11,99,255,0.06); }
      .header { background: linear-gradient(90deg, ${primaryBlue}, #0a54d1); padding:28px 32px; color:#fff; display:flex; align-items:center; gap:16px; }
      .brand { font-weight:700; font-size:20px; letter-spacing:0.2px; }
      .content { padding:32px; color:#0f172a; }
      .lead { font-size:16px; margin:0 0 18px 0; color:#334155; line-height:1.45; }
      .otp-box { display:flex; align-items:center; justify-content:center; margin:18px 0 8px; }
      .otp { background:#f1f6ff; border:1px dashed rgba(11,99,255,0.18); padding:22px 28px; border-radius:10px; font-size:36px; font-weight:800; color:${primaryBlue}; letter-spacing:6px; }
      .small { font-size:13px; color:#64748b; margin-top:8px; }
      .cta { margin-top:20px; display:inline-block; text-decoration:none; background:${primaryBlue}; color:#fff; padding:10px 18px; border-radius:8px; font-weight:600; }
      .footer { padding:20px 32px; background:#ffffff; border-top:1px solid #f1f5f9; color:#94a3b8; font-size:13px; text-align:center; }
      @media (max-width:480px) {
        .otp { font-size:28px; padding:16px 20px; letter-spacing:4px; }
        .header { padding:18px 16px; }
        .content { padding:18px; }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card" role="article" aria-label="${appName} OTP">
        <div class="header">
          <div class="brand">${appName}</div>
        </div>

        <div class="content">
          <p class="lead">Use the one-time passcode below to sign in to your ${appName} account. This code will expire in ${expiryMinutes} minutes.</p>

          <div class="otp-box">
            <div class="otp" aria-hidden="true">${otp}</div>
          </div>

          <p class="small">If you didn't request this code, you can safely ignore this email. For security, do not share this code with anyone.</p>

          <a class="cta" href="#" onclick="return false">Sign in to ${appName}</a>

          <p style="margin-top:18px; color:#64748b; font-size:13px;">
            If the button doesn't work, copy and paste the OTP: <strong>${otp}</strong>
          </p>
        </div>

        <div class="footer">
          Sent by <strong>${appName}</strong> — <span style="color:#0b63ff">ikennaibenemee@gmail.com</span>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};

const sendOTP = async (recipientEmail, otp, options = {}) => {
  try {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      throw new Error(
        "Email credentials not found in environment variables (EMAIL_USER, EMAIL_PASS)."
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });

    const html = buildHtmlEmail({
      appName: options.appName || "Orro Motors",
      otp,
      expiryMinutes: options.expiryMinutes ?? 10,
    });

    const mailOptions = {
      from: `"Orro Motors" <${user}>`,
      to: recipientEmail,
      subject: `${options.appName || "Orro Motors"} — Your verification code`,
      text: `Your verification code is ${otp}. It expires in ${
        options.expiryMinutes ?? 10
      } minutes.`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    return { success: false, error: err.message || err };
  }
};

module.exports = { generateOTP, sendOTP };
