/**
 * auth middleware — verifies the JWT token on protected routes.
 *
 * Every request to /api/posts/* or /api/users/* needs a valid token.
 * We extract it from the Authorization header, verify it, and attach
 * the user's info to req.user so downstream handlers can use it.
 *
 * If the token is missing or invalid, we just return 401 and the
 * frontend handles it by redirecting to login.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // fetch the user from DB — we could cache this but for now
    // this is fine, and it ensures we always have fresh data
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    // attaching user info so we don't have to fetch it again in the route handler
    req.user = {
      id: user._id,
      username: user.username,
      name: user.name || '',
      email: user.email,
      avatarColor: user.avatarColor,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};