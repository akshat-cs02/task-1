/**
 * Post model — the heart of the app.
 *
 * A single post can be:
 *   - a regular text/image post
 *   - a poll (with question + options + voting)
 *   - a promotion (website name, title, description, category)
 *
 * I went with embedding comments, likes, shares, polls, and reports
 * directly in the post document instead of separate collections.
 * MongoDB handles this fine at our scale, and it avoids extra joins.
 * The only other collection is `users` — keeping it to 2 total.
 *
 * One thing to note: likes, shares, and poll votes all store USERNAMES
 * (not user IDs). This makes the "who liked this" display easy —
 * we just show @username directly without looking up the user.
 */

const mongoose = require('mongoose');

// embedded subdocument for comments
const commentSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500, trim: true },
  },
  { timestamps: true }
);

// poll option — each option has text and an array of usernames who voted for it
const pollOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 100, trim: true },
    votes: [{ type: String }],
  },
  { _id: false }
);

// poll itself — question, options, and when it expires
const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, maxlength: 200, trim: true },
    options: { type: [pollOptionSchema], required: true, validate: [(o) => o.length >= 2 && o.length <= 5, 'Polls need 2-5 options'] },
    endsAt: { type: Date, required: true },
  },
  { _id: false }
);

// report subdocument — when someone reports a post, we store who and why
const reportSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// promotion subdomain — only filled when type === 'promotion'
const promotionSchema = new mongoose.Schema(
  {
    website: { type: String, required: true, maxlength: 100, trim: true },
    title: { type: String, required: true, maxlength: 100, trim: true },
    description: { type: String, required: true, maxlength: 2000, trim: true },
    category: { type: String, required: true, enum: ['Refer and earn', 'Crypto'] },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    // 'post' for regular posts, 'promotion' for promoted content
    type: { type: String, enum: ['post', 'promotion'], default: 'post', index: true },
    // reference to the User who created this post
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // snapshot of the author's info at time of posting
    // (so we don't have to join with users collection to display the feed)
    authorName: { type: String, required: true },
    authorUsername: { type: String, required: true },
    authorAvatarColor: { type: String, default: '#7C3AED' },
    text: { type: String, default: '', maxlength: 2000, trim: true },
    image: { type: String, default: null }, // base64 string
    likes: [{ type: String }],               // usernames of people who liked
    comments: [commentSchema],               // embedded comments
    shares: [{ type: String }],              // usernames of people who shared
    poll: { type: pollSchema, default: null },
    promotion: { type: promotionSchema, default: null },
    reports: { type: [reportSchema], default: [] },
  },
  { timestamps: true }
);

// index for the main feed query — newest posts first
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);