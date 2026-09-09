/**
 * server.js — the entry point for the backend
 * Sets up Express, connects to MongoDB, and mounts all the routes.
 * Pretty straightforward — just wanted to keep it clean and readable.
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');

const app = express();

// allowing the frontend to talk to us — keeping it permissive for dev
// in production you'd want to lock this down to your actual frontend domain
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));

// 12mb limit because users can upload images as base64
// yeah yeah, I know base64 isn't ideal for large files, but it keeps
// things simple without needing a separate file storage service
app.use(express.json({ limit: '12mb' }));

// quick health check — useful when deploying to Render
// it pings this to make sure the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TaskPlanet API is running' });
});

// mounting the routes — pretty self-explanatory
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not set. Copy BackEnd/.env.example to BackEnd/.env and add your MongoDB Atlas URI.');
    process.exit(1);
  }
  try {
    // connecting to MongoDB before starting the server
    // if this fails, we just bail out — no point running without a DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

start();