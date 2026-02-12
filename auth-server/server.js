const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const PORT = 5000;

// ===== CONFIG =====
const JWT_SECRET = "super-secret-key-change-this";
const EXTENSION_ID = "mpigddkjmeneoaffjlndmdiniacfglii";

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(cors());
app.use(express.static("public"));


// ===== In-memory user store =====
const users = [];

/*
User Structure:
{
  id,
  email,
  passwordHash
}
*/

// ===== REGISTER =====
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: Date.now().toString(),
      email,
      passwordHash: hashedPassword
    };

    users.push(newUser);

    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ===== LOGIN =====
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Redirect URL for extension
    const redirectUrl = `chrome-extension://${EXTENSION_ID}/auth.html?token=${token}`;

    res.json({
      message: "Login successful",
      token,
      redirect: redirectUrl
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`);
});
