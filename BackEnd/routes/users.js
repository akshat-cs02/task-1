/**
 * users routes — profile and follow/unfollow.
 *
 * GET /api/users/me returns the current user's profile plus their
 * following list (as user IDs). The frontend uses this to determine
 * whether to show "Follow" or "Following" on each post card.
 *
 * POST /api/users/:id/follow toggles follow/unfollow — it's a simple
 * toggle: if you're already following someone, it unfollows them.
 */

const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/users/me — returns current user's profile + following list
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name || '',
        email: user.email,
        avatarColor: user.avatarColor,
      },
      // returning following as string IDs — frontend needs these to
      // quickly check if a post's author is someone you follow
      following: user.following.map((id) => String(id)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// POST /api/users/:id/follow — toggle follow/unfollow
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!isObjectId(targetId)) return res.status(400).json({ error: 'Invalid user id' });

    // can't follow yourself — that would be weird
    if (String(req.user.id) === targetId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const me = await User.findById(req.user.id);
    const alreadyFollowing = me.following.some((id) => String(id) === targetId);

    // simple toggle — remove if already following, add if not
    me.following = alreadyFollowing
      ? me.following.filter((id) => String(id) !== targetId)
      : [...me.following, target._id];

    await me.save();

    // returning the updated following list so frontend can update instantly
    res.json({ following: !alreadyFollowing, followingIds: me.following.map((id) => String(id)) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update follow' });
  }
});

module.exports = router;