const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const User = require("./models/User");
const app = express();
const PORT = 5000;

// ===========MongoDB===========
require("dotenv").config();
const mongoose = require("mongoose");

// ================= CONFIG =================
const JWT_SECRET = "super-secret-key-change-this";
const EXTENSION_ID = "mpigddkjmeneoaffjlndmdiniacfglii";

const GOOGLE_CLIENT_ID =
  "88850224781-haajrv8ku8d2fh7ufc2ian5clu1976md.apps.googleusercontent.com";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// ================= IN-MEMORY USER STORE =================
/*
User Structure:
{
  id,
  email,
  passwordHash,
  isVerified,
  otp,
  otpExpiry
}
*/
//const users = [];

// ================= EMAIL CONFIG =================
// ⚠ Replace with your Gmail + App Password
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "yadavroshanarvind2004@gmail.com",
    pass: "zmonoigkqjijcbbk"
  }
});


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// ================= REGISTER =================
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    const newUser = await User.create({
      email,
      passwordHash: hashedPassword,
      isVerified: false,
      otp,
      otpExpiry
    });

    await transporter.sendMail({
      from: "CloudVPN+",
      to: email,
      subject: "Verify your CloudVPN+ account",
      text: `Your OTP code is: ${otp}`
    });

    res.status(201).json({ message: "OTP sent to your email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// ================= VERIFY OTP =================
app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    res.json({ message: "Account verified successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const redirectUrl =
      `chrome-extension://${EXTENSION_ID}/auth.html?token=${token}`;

    res.json({
      message: "Login successful",
      redirect: redirectUrl
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// ================= GOOGLE LOGIN =================
app.post("/google-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "No Google token provided" });
    }

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    if (!email) {
      return res.status(400).json({ message: "Google authentication failed" });
    }

    // Check if user exists in MongoDB
    let user = await User.findOne({ email });

    // If not exists → create new verified user
    if (!user) {
      user = await User.create({
        email,
        passwordHash: null,
        isVerified: true
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const redirectUrl =
      `chrome-extension://${EXTENSION_ID}/auth.html?token=${token}`;

    res.json({
      message: "Google login successful",
      redirect: redirectUrl
    });

  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(401).json({ message: "Google authentication failed" });
  }
});
// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`);
});
