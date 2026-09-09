/**
 * posts routes — the main API for creating, fetching, and interacting with posts.
 *
 * This file handles everything post-related:
 *   - GET    /api/posts         — paginated feed (with scope/type filters)
 *   - GET    /api/posts/:id     — single post
 *   - POST   /api/posts         — create (text, image, poll, or promotion)
 *   - POST   /api/posts/:id/like    — toggle like
 *   - POST   /api/posts/:id/comment — add comment
 *   - POST   /api/posts/:id/share   — toggle share
 *   - POST   /api/posts/:id/vote    — vote on a poll
 *   - POST   /api/posts/:id/report  — report a post
 *
 * Pagination uses cursor-based approach (not page numbers) — the frontend
 * sends the last post's ID and we return the next batch. This is more
 * efficient than skip/offset for real-time feeds.
 *
 * For the feed sorting tabs (Most liked, Most commented, etc.), the
 * backend just returns posts in chronological order and the frontend
 * re-sorts them in memory. This keeps the backend simple and the sort
 * is fast enough for the amount of data we're dealing with.
 */

const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const PAGE_SIZE = 5;
const MAX_BODY_SIZE = 12 * 1024 * 1024; // 12MB — matches the JSON parser limit
const REPORT_REASONS = [
  'Spam',
  'Non relevant post',
  'Abuse',
  'Adult content',
  'Scam',
  'Fake promotion',
  'Hate speech',
  'Copyright',
  'Other',
];
const POLL_DURATIONS = [24, 72, 168]; // hours
const PROMOTION_CATEGORIES = ['Refer and earn', 'Crypto'];

/**
 * Helper — converts a Mongoose document to a clean JSON object.
 * Replaces the `user` ObjectId with a string `authorId` so the frontend
 * can use it for follow state checks without extra processing.
 * Also computes totalVotes for polls since we don't store that redundantly.
 */
function serializePost(post) {
  const obj = typeof post.toObject === 'function' ? post.toObject() : post;
  const { user, ...rest } = obj;
  const poll = rest.poll
    ? {
        ...rest.poll,
        totalVotes: rest.poll.options.reduce((sum, o) => sum + o.votes.length, 0),
      }
    : null;
  return { ...rest, authorId: String(user), poll };
}

/**
 * GET /api/posts?cursor=<id>&scope=following&type=promotion&limit=5
 *
 * Fetches posts for the feed. Supports:
 *   - cursor: pagination cursor (last post's ID)
 *   - scope=following: only posts from people the current user follows
 *   - type=promotion: only promotion posts (for the Promotions tab)
 */
router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || PAGE_SIZE, 20);
    const cursor = req.query.cursor || null;
    const scope = req.query.scope === 'following' ? 'following' : 'all';
    const type = req.query.type === 'promotion' || req.query.type === 'post' ? req.query.type : null;

    let query = {};

    // "For You" feed — filter to posts from followed users
    if (scope === 'following') {
      const me = await User.findById(req.user.id);
      if (me && me.following.length > 0) {
        query.user = { $in: me.following };
      }
    }

    // filtering by post type (regular vs promotion)
    if (type) query.type = type;

    // cursor-based pagination — get posts older than the cursor
    if (cursor) query._id = { $lt: cursor };

    const posts = await Post.find(query).sort({ _id: -1 }).limit(limit);

    res.json({
      posts: posts.map(serializePost),
      nextCursor: posts.length > 0 ? posts[posts.length - 1]._id : null,
      hasMore: posts.length === limit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/posts/:id — fetch a single post
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ post: serializePost(post) });
  } catch (error) {
    res.status(400).json({ error: 'Invalid post id' });
  }
});

/**
 * POST /api/posts — create a new post
 *
 * Accepts any combination of: text, image (base64), poll, promotion.
 * At least one must be provided. The backend validates everything and
 * returns the full serialized post object.
 */
router.post('/', auth, async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const text = typeof data.text === 'string' ? data.text.trim().slice(0, 2000) : '';
    const image = typeof data.image === 'string' ? data.image : null;

    // handling poll creation — only if poll data is provided
    let poll = null;
    if (data.poll && typeof data.poll === 'object') {
      const question = typeof data.poll.question === 'string' ? data.poll.question.trim().slice(0, 200) : '';
      const options = Array.isArray(data.poll.options)
        ? data.poll.options
            .map((o) => (typeof o === 'string' ? o.trim().slice(0, 100) : ''))
            .filter(Boolean)
        : [];
      const durationHours = Number(data.poll.durationHours);

      if (!question) return res.status(400).json({ error: 'Poll needs a question' });
      if (options.length < 2) return res.status(400).json({ error: 'Poll needs at least 2 options' });
      if (options.length > 5) return res.status(400).json({ error: 'Poll can have at most 5 options' });
      if (!POLL_DURATIONS.includes(durationHours)) {
        return res.status(400).json({ error: 'Poll duration must be 24, 72 or 168 hours' });
      }

      poll = {
        question,
        options: options.map((o) => ({ text: o, votes: [] })),
        endsAt: new Date(Date.now() + durationHours * 3600 * 1000),
      };
    }

    // handling promotion creation
    let promotion = null;
    let isPromotion = false;
    if (data.promotion && typeof data.promotion === 'object') {
      const website = typeof data.promotion.website === 'string' ? data.promotion.website.trim().slice(0, 100) : '';
      const title = typeof data.promotion.title === 'string' ? data.promotion.title.trim().slice(0, 100) : '';
      const description = typeof data.promotion.description === 'string' ? data.promotion.description.trim().slice(0, 2000) : '';
      const category = typeof data.promotion.category === 'string' ? data.promotion.category.trim() : '';

      if (!website || !title || !description || !category) {
        return res.status(400).json({ error: 'Website name, promotion title, description and category are required' });
      }
      if (!PROMOTION_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Category must be "Refer and earn" or "Crypto"' });
      }
      promotion = { website, title, description, category };
      isPromotion = true;
    }

    // need at least something to post
    if (!text && !image && !poll && !promotion) {
      return res.status(400).json({ error: 'Post must contain text, an image, a poll, a promotion, or a combination' });
    }
    if (image && image.length > MAX_BODY_SIZE) {
      return res.status(413).json({ error: 'Image too large (max ~12MB)' });
    }

    // creating the post — type is 'promotion' if promotion data is provided
    const post = await Post.create({
      type: isPromotion ? 'promotion' : 'post',
      user: req.user.id,
      authorName: req.user.name || req.user.username,
      authorUsername: req.user.username,
      authorAvatarColor: req.user.avatarColor,
      text,
      image,
      poll,
      promotion,
      likes: [],
      comments: [],
      shares: [],
    });

    res.status(201).json({ post: serializePost(post) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// POST /api/posts/:id/like — toggle like on/off
// stores usernames in the likes array, not user IDs
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const username = req.user.username;
    const alreadyLiked = post.likes.includes(username);

    // simple toggle — add or remove
    post.likes = alreadyLiked
      ? post.likes.filter((u) => u !== username)
      : [...post.likes, username];

    await post.save();
    res.json({ likes: post.likes, liked: !alreadyLiked });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update like' });
  }
});

// POST /api/posts/:id/comment — adds a new comment to the post
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const text = typeof data.text === 'string' ? data.text.trim().slice(0, 500) : '';

    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = { username: req.user.username, text };
    post.comments.push(comment);
    await post.save();

    // returning the saved comment + updated count
    res.status(201).json({ comment: post.comments[post.comments.length - 1], count: post.comments.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// POST /api/posts/:id/share — toggle share (like a retweet/forward)
router.post('/:id/share', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const username = req.user.username;
    const alreadyShared = post.shares.includes(username);

    post.shares = alreadyShared
      ? post.shares.filter((u) => u !== username)
      : [...post.shares, username];

    await post.save();
    res.json({ shares: post.shares, shared: !alreadyShared });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to share post' });
  }
});

// POST /api/posts/:id/vote — cast a vote on a poll
// each user can only vote once — we check all options' votes arrays
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!post.poll) return res.status(400).json({ error: 'This post has no poll' });
    if (new Date(post.poll.endsAt) < new Date()) {
      return res.status(400).json({ error: 'Poll has ended' });
    }

    const username = req.user.username;
    const alreadyVoted = post.poll.options.some((o) => o.votes.includes(username));
    if (alreadyVoted) return res.status(400).json({ error: 'You already voted on this poll' });

    const option = parseInt(req.body && req.body.option, 10);
    if (!Number.isInteger(option) || option < 0 || option >= post.poll.options.length) {
      return res.status(400).json({ error: 'Invalid poll option' });
    }

    post.poll.options[option].votes.push(username);
    await post.save();

    // returning the updated poll with computed totalVotes
    res.json({ poll: serializePost(post).poll });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST /api/posts/:id/report — report a post for review
// users can report with the same reason multiple times (no dedup per reason)
router.post('/:id/report', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const reason = typeof (req.body && req.body.reason) === 'string' ? req.body.reason.trim() : '';
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Invalid report reason' });
    }

    // allowing the same user to report with different reasons
    // (but not the same reason twice)
    const alreadyReported = post.reports.some(
      (r) => r.username === req.user.username && r.reason === reason
    );
    if (alreadyReported) {
      return res.json({ reported: true });
    }

    post.reports.push({ username: req.user.username, reason });
    await post.save();
    res.json({ reported: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to report post' });
  }
});

module.exports = router;