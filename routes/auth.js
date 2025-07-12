const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../supabaseClient");
const twilio = require('twilio');
const otpStore = {};
const nodemailer = require('nodemailer');
const emailOtpStore = {};

const JWT_SECRET = process.env.JWT_SECRET || "this is a notechat jwt secret";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_MESSAGE_SERVICE_SID = process.env.TWILIO_MESSAGE_SERVICE_SID;

// Create user - POST /api/auth/createuser
router.post(
  "/createuser",
  [
    body("name").isLength({ min: 1 }),
    body("uname").isLength({ min: 1 }),
    body("email").isEmail(),
    body("password").isLength({ min: 5 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, uname, email, password } = req.body;

    try {
      // Check if user already exists
      const { data: existingUser, error: findError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (existingUser) return res.status(400).json({ errors: "Email already exists" });

      // Optionally, check OTP verification here (for production, store verified emails in DB or cache)
      // For now, assume frontend only allows registration after OTP is verified

      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: user, error } = await supabase.from("users").insert([
        { name, uname, email, password: hashedPassword },
      ]).select().single();

      if (error) throw error;

      const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET);
      res.json({ success: true, token });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, errors: "Server error" });
    }
  }
);

// Login user - POST /api/auth/login
router.post(
  "/login",
  [
    body("email", "Invalid email").isEmail(),
    body("password", "Invalid password").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (!user) return res.status(400).json({ errors: "Email not found" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ errors: "Password not match" });

      const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET);

      res.json({ success: true, token, uname: user.uname, id: user.id });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Get user - POST /api/auth/getuser
router.post("/getuser", async (req, res) => {
  try {
    const token = req.header("auth-token");
    if (!token) return res.status(401).send("Access denied");

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.user.id;

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete user - DELETE /api/auth/deleteuser/:id
router.delete("/deleteuser/:id", async (req, res) => {
  try {
    const token = req.header("auth-token");
    if (!token) return res.status(401).send("Access denied");

    const decoded = jwt.verify(token, JWT_SECRET);

    if (req.params.id !== decoded.user.id) {
      return res.status(401).send("Not allowed");
    }

    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ success: "User has been deleted", user: data });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Send Email OTP endpoint
router.post('/send-email-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  emailOtpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 }; // 5 min expiry
  try {
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_OTP_USER,
        pass: process.env.EMAIL_OTP_PASS
      }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_OTP_USER,
      to: email,
      subject: 'NoteChat Varification ',
      text: `This is one time varification OTP please don't share anyone. OTP is : ${otp} `
    });
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send OTP', details: err.message });
  }
});

// Verify Email OTP endpoint
router.post('/verify-email-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  const record = emailOtpStore[email];
  if (!record) return res.status(400).json({ error: 'No OTP sent to this email' });
  if (Date.now() > record.expires) return res.status(400).json({ error: 'OTP expired' });
  if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  delete emailOtpStore[email];
  res.json({ success: true, message: 'OTP verified' });
});

module.exports = router;
