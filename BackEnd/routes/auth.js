/**
 * auth routes — handles signup and login.
 *
 * Signup creates a new user with bcrypt-hashed password and returns a JWT.
 * Login verifies credentials and returns a JWT. Both return a clean user
 * object (no password, no internal fields).
 *
 * I'm using bcryptjs instead of bcrypt because it's pure JavaScript —
 * no native build issues when deploying to Render. Same hashing, just
 * easier to deploy.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// helper — strips sensitive/internal fields from the user object
function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    name: user.name || '',
    email: user.email,
    avatarColor: user.avatarColor,
  };
}

/**
 * POST /api/auth/signup
 * Creates a new account. Username and email must be unique.
 * Password gets hashed with bcrypt (10 salt rounds).
 */
router.post('/signup', async (req, res) => {
  try {
    const { username, name, email, password } = req.body || {};

    // basic validation — nothing fancy, just making sure we have what we need
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }
    if (username.trim().length < 3 || username.trim().length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }
    if (name && name.trim().length > 50) {
      return res.status(400).json({ error: 'Name must be at most 50 characters' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // checking for duplicate username or email
    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.trim() }] });
    if (existing) {
      return res.status(409).json({ error: existing.email === email.toLowerCase() ? 'Email already registered' : 'Username already taken' });
    }

    // hashing the password — 10 rounds is a good balance of security and speed
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(),
      name: name ? name.trim() : '',
      email: email.toLowerCase(),
      password: hashed,
    });

    // token expires in 7 days — seemed like a reasonable session length
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

/**
 * POST /api/auth/login
 * Verifies email + password and returns a JWT.
 * Using "Invalid email or password" for both wrong email and wrong password
 * — don't want to leak which one was wrong.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // need to explicitly select +password since we set select:false on the schema
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;