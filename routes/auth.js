const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../supabaseClient");
const nodemailer = require('nodemailer');
const emailOtpStore = {};

const JWT_SECRET = process.env.JWT_SECRET || "this is a notechat jwt secret";

// Twilio removed - using email OTP only

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
    console.log("Create user request body:", req.body);
    console.log("Request headers:", req.headers);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if supabase is available
    if (!supabase) {
      console.error("Supabase client is null - missing environment variables");
      return res.status(503).json({ 
        success: false, 
        errors: "Database service unavailable - missing SUPABASE_URL or SUPABASE_ANON_KEY" 
      });
    }

    // Check if required environment variables are set
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables");
      return res.status(503).json({ 
        success: false, 
        errors: "Database configuration missing - SUPABASE_URL and SUPABASE_ANON_KEY required" 
      });
    }

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
      console.error("Create user error:", error.message);
      console.error("Error details:", error);
      res.status(500).json({ 
        success: false, 
        errors: "Server error", 
        details: error.message 
      });
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

    // Check if supabase is available
    if (!supabase) {
      return res.status(503).json({ success: false, errors: "Database service unavailable" });
    }

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

    // Check if supabase is available
    if (!supabase) {
      return res.status(503).json({ message: "Database service unavailable" });
    }

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
  if (!email) return res.status(400).json({ success: false, error: "Email is required" });

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in memory (for demo; use Redis or DB for production)
  emailOtpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000 }; // 10 min expiry

  // Send OTP via email
  try {
    await nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    }).sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your NoteChat OTP",
      text: `Your OTP is: ${otp}`,
    });

    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("Error sending OTP email:", err);
    res.status(500).json({ success: false, error: "Failed to send OTP" });
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

// Get all users (for new chat popup)
router.get('/getallusers', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, uname, email');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
