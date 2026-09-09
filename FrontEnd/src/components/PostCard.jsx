/**
 * PostCard — renders a single post with all its interactions.
 *
 * This is probably the most complex component in the app.
 * It handles:
 *   - Author info (display name, @username, follow button)
 *   - Content (text, image, poll, or promotion)
 *   - Actions (like, comment, share)
 *   - Comment section (expandable)
 *   - 3-dot menu (report post)
 *   - Poll voting (if poll is active)
 *
 * The Follow/Unfollow button only shows for other users' posts.
 * The 3-dot menu opens a report modal with radio button reasons.
 *
 * For polls, the component checks if the current user has already voted
 * and shows results bars if they have (or if the poll expired).
 */

import { useState } from 'react';
import { Dropdown, Button, Spinner } from 'react-bootstrap';
import { FiHeart, FiMessageCircle, FiSend, FiShare2, FiMoreVertical, FiCheck, FiClock } from 'react-icons/fi';
import ReportModal from './ReportModal';

function initials(name) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// formats a timestamp into a relative time string ("3m ago", "2h ago", etc.)
function timeAgo(ts) {
  if (!ts) return 'just now';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

// returns a human-readable string for poll expiry
function pollExpiryText(endsAt) {
  const now = Date.now();
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return 'Poll ended';
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `Ends in ${Math.max(1, Math.floor(diff / 60000))}m`;
  if (hours < 24) return `Ends in ${hours}h`;
  return `Ends in ${Math.floor(hours / 24)}d`;
}

/**
 * PollBlock — renders the poll UI inside a post.
 * If the user hasn't voted, shows clickable "Vote" buttons.
 * If they have (or poll expired), shows progress bars with percentages.
 */
function PollBlock({ poll, onVote, currentUsername }) {
  const [voting, setVoting] = useState(null);
  const total = poll.totalVotes ?? poll.options.reduce((s, o) => s + (o.votes || []).length, 0);
  const myVoteIndex = poll.options.findIndex((o) => (o.votes || []).includes(currentUsername));
  const ended = new Date(poll.endsAt).getTime() <= Date.now();
  const locked = myVoteIndex >= 0 || ended;

  const vote = async (idx) => {
    if (locked || voting !== null) return;
    setVoting(idx);
    try {
      await onVote(idx);
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className="poll-block mt-3">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div style={{ fontWeight: 600, fontSize: 15 }}>{poll.question}</div>
        <span className="poll-time">
          <FiClock className="me-1" />
          {pollExpiryText(poll.endsAt)}
        </span>
      </div>

      {poll.options.map((opt, idx) => {
        const votes = opt.votes || [];
        const pct = total > 0 ? Math.round((votes.length / total) * 100) : 0;
        const mine = myVoteIndex === idx;
        return locked ? (
          <div key={idx} className="poll-result mb-2">
            <div className="d-flex justify-content-between small mb-1">
              <span className={mine ? 'fw-bold text-brand' : ''}>
                {opt.text} {mine && <FiCheck className="ms-1" />}
              </span>
              <span className="text-muted">{pct}% · {votes.length}</span>
            </div>
            <div className="progress" style={{ height: 8, background: '#ececf1' }}>
              <div
                className="progress-bar"
                style={{
                  width: `${pct}%`,
                  background: mine ? 'var(--brand)' : '#a5b4fc',
                }}
              />
            </div>
          </div>
        ) : (
          <button key={idx} className="poll-option" onClick={() => vote(idx)} disabled={voting !== null}>
            <span>{opt.text}</span>
            {voting === idx ? <Spinner size="sm" animation="border" /> : <span className="poll-vote-hint">Vote</span>}
          </button>
        );
      })}

      <div className="text-muted small mt-2">
        {total} vote{total === 1 ? '' : 's'} · {locked ? (ended ? 'results are in' : 'you voted') : `vote to see results`}
      </div>
    </div>
  );
}

/**
 * PromotionBlock — renders the promotion card layout inside a post.
 * Shows website name, title, description, and category badge.
 */
function PromotionBlock({ promotion }) {
  return (
    <div className="promotion-block mt-3">
      <div className="d-flex align-items-center gap-2 mb-1">
        <span className="promo-badge">Promoted</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{promotion.website}</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{promotion.title}</div>
      <p className="post-body mb-2" style={{ fontSize: 14 }}>{promotion.description}</p>
      <span className="promo-category">{promotion.category}</span>
    </div>
  );
}

export default function PostCard({
  post,
  currentUser,
  isFollowing,
  onLike,
  onComment,
  onShare,
  onVote,
  onToggleFollow,
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState(false);

  const liked = post.likes.some((u) => u === currentUser.username);
  const shared = (post.shares || []).some((u) => u === currentUser.username);
  const myPost = String(post.authorId) === String(currentUser.id);

  const sendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setSending(true);
    try {
      await onComment(post._id, text);
      setCommentText('');
    } catch {
      // error surfaced by parent
    } finally {
      setSending(false);
    }
  };

  const handleShare = () => {
    // copy the current page URL to clipboard — simple "share" mechanism
    const url = window.location.href;
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(url);
    } catch {
      // clipboard API might be blocked in some contexts, that's okay
    }
    onShare(post._id, shared);
  };

  const displayName = post.authorName || post.authorUsername;
  const displayHandle = post.authorUsername ? `@${post.authorUsername}` : `@${displayName}`;

  return (
    <div className="post-card mb-3" style={{ background: '#fff' }}>
      <div className="p-3">
        <div className="d-flex align-items-center gap-2">
          <div className="avatar" style={{ background: post.authorAvatarColor || '#7c3aed' }}>
            {initials(displayName)}
          </div>
          <div className="flex-grow-1">
            <div style={{ fontWeight: 600, fontSize: 14 }}>{displayName}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>
              {displayHandle} · {timeAgo(post.createdAt)}
            </div>
          </div>

          {/* Follow button + 3-dot menu — only for other users' posts */}
          {!myPost && (
            <>
              <Button
                variant={isFollowing ? 'outline-secondary' : 'brand'}
                size="sm"
                className={isFollowing ? '' : 'btn-brand'}
                onClick={() => onToggleFollow(post.authorId)}
                style={{ borderRadius: 20, fontSize: 13, fontWeight: 600 }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="light"
                  size="sm"
                  className="border-0 dots-btn"
                >
                  <FiMoreVertical />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setReporting(true)}>
                    Report post
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </>
          )}
        </div>

        {post.text && <p className="post-body mt-3 mb-0">{post.text}</p>}
        {post.image && <img className="post-image" src={post.image} alt="Post attachment" />}

        {post.promotion && <PromotionBlock promotion={post.promotion} />}

        {post.poll && (
          <PollBlock poll={post.poll} onVote={(idx) => onVote(post._id, idx)} currentUsername={currentUser.username} />
        )}

        <div className="post-actions mt-3">
          <button className={`action-btn ${liked ? 'liked' : ''}`} onClick={() => onLike(post._id, liked)}>
            <FiHeart size={18} />
            <span className="count">{post.likes.length}</span>
          </button>
          <button className="action-btn" onClick={() => setShowComments((s) => !s)}>
            <FiMessageCircle size={18} />
            <span className="count">{post.comments.length}</span>
          </button>
          <button className={`action-btn ${shared ? 'shared' : ''}`} onClick={handleShare}>
            <FiShare2 size={17} />
            <span className="count">{post.shares?.length || 0}</span>
          </button>
        </div>
      </div>

      {/* Comment section — toggled by the comment icon */}
      {showComments && post.comments.length > 0 && (
        <div className="comments-section px-3 pt-2 pb-1">
          {post.comments.map((c, i) => (
            <div key={c._id || i} className="comment-row mb-2">
              <div className="d-flex flex-column justify-content-start" style={{ marginTop: 4 }}>
                <span
                  className="d-flex align-items-center justify-content-center text-white"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#7c3aed',
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {initials(c.username)}
                </span>
              </div>
              <div>
                <div className="comment-body" style={{ display: 'inline-block', maxWidth: '100%' }}>
                  <span className="comment-author me-2">@{c.username}</span>
                  {c.text}
                </div>
                <div className="post-time mt-1" style={{ fontSize: 11 }}>{timeAgo(c.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showComments && (
        <div className="comments-section p-3">
          <div className="comment-input-box">
            <input
              type="text"
              className="form-control"
              placeholder="Write a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendComment()}
              maxLength={500}
              disabled={sending}
            />
            <Button variant="brand" className="btn-brand" onClick={sendComment} disabled={sending || !commentText.trim()}>
              <FiSend />
            </Button>
          </div>
        </div>
      )}

      <ReportModal
        show={reporting}
        onHide={() => setReporting(false)}
        postId={post._id}
        onError={(msg) => console.error(msg)}
      />
    </div>
  );
}