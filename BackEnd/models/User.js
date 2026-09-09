/**
 * User model — keeps track of accounts.
 * 
 * Nothing too fancy here. We store username, email, hashed password,
 * and an optional display name. The avatarColor is just a random purple-ish
 * shade that gets picked at signup — gives the UI some personality.
 *
 * The `following` array is how the "For You" feed works — it stores
 * the IDs of users that this person follows. When we fetch posts for
 * "For You", we just filter by posts from people in this list.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // unique handle — this is what shows as @username
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    // display name — optional, falls back to username in the UI
    name: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // don't return password in queries by default
    },
    // used for the initial avatar — just a hex color string
    avatarColor: {
      type: String,
      default: '#7C3AED',
    },
    // user IDs of people this user follows
    following: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);