/**
 * FeedPage — the main view after login.
 *
 * This is where most of the action happens:
 * - Toolbar with "Create Post" heading + All posts / Promotions toggle
 * - Post composer (or Promotion composer when on Promotions tab)
 * - Sort tabs: All posts / For you / Most liked / Most commented / Most shared
 * - Feed with infinite "Load more" pagination
 *
 * The feed uses cursor-based pagination — each time you click "Load more",
 * it sends the last post's ID and gets the next batch. For the sorting
 * tabs (Most liked, etc.), we fetch everything and sort in memory —
 * this is fine for the amount of data we're dealing with.
 *
 * Follow/unfollow updates flow through context.updateUser for instant UI.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Button, Nav } from 'react-bootstrap';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PostComposer from './PostComposer';
import PromotionComposer from './PromotionComposer';
import PostCard from './PostCard';
import { RiMegaphoneLine } from 'react-icons/ri';

const SORT_TABS = [
  { key: 'latest', label: 'All posts' },
  { key: 'following', label: 'For you' },
  { key: 'liked', label: 'Most liked' },
  { key: 'commented', label: 'Most commented' },
  { key: 'shared', label: 'Most shared' },
];

// simple loading skeleton — gives a visual hint while data loads
function FeedSkeleton() {
  return (
    <div>
      {[...Array(2)].map((_, i) => (
        <div key={i} className="post-card mb-3 p-3" style={{ background: '#fff' }}>
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <div>
              <div className="skeleton" style={{ width: 120, height: 12, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: 80, height: 10 }} />
            </div>
          </div>
          <div className="skeleton" style={{ width: '100%', height: 80 }} />
        </div>
      ))}
    </div>
  );
}

export default function FeedPage() {
  const { user, updateUser } = useAuth();
  const [viewMode, setViewMode] = useState('all');     // 'all' or 'promotions'
  const [sort, setSort] = useState('latest');
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const firstRun = useRef(true);

  // builds the API request based on current view mode and sort
  const load = useCallback(async (cursor) => {
    const scope = sort === 'following' && viewMode === 'all' ? 'following' : undefined;
    const type = viewMode === 'promotions' ? 'promotion' : undefined;
    return api.getPosts(cursor, scope, type);
  }, [sort, viewMode]);

  const applyData = (data) => {
    setPosts(data.posts);
    setNextCursor(data.nextCursor);
    setHasMore(data.hasMore);
  };

  // initial load
  useEffect(() => {
    (async () => {
      try {
        const data = await load(null);
        applyData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  // reload when sort or view mode changes
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const data = await load(null);
        applyData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [sort, load]);

  // client-side sorting for the metric-based tabs
  const sortedPosts = useMemo(() => {
    if (sort === 'liked') return [...posts].sort((a, b) => b.likes.length - a.likes.length);
    if (sort === 'commented') return [...posts].sort((a, b) => b.comments.length - a.comments.length);
    if (sort === 'shared') return [...posts].sort((a, b) => (b.shares?.length || 0) - (a.shares?.length || 0));
    return posts;
  }, [posts, sort]);

  // optimistic handlers — update UI immediately, revert on server error

  const handlePostCreated = (post) => {
    setPosts((prev) => [post, ...prev]);
  };

  const handleLike = async (postId, liked) => {
    updatePost(postId, (p) => ({
      ...p,
      likes: liked ? p.likes.filter((u) => u !== user.username) : [...p.likes, user.username],
    }));
    try {
      await api.toggleLike(postId);
    } catch (err) {
      updatePost(postId, (p) => ({
        ...p,
        likes: liked ? [...p.likes, user.username] : p.likes.filter((u) => u !== user.username),
      }));
      setError(err.message);
    }
  };

  const handleComment = async (postId, text) => {
    const tmpComment = { username: user.username, text, _id: 'tmp' };
    updatePost(postId, (p) => ({ ...p, comments: [...p.comments, tmpComment] }));
    try {
      const data = await api.addComment(postId, { text });
      updatePost(postId, (p) => {
        const comments = p.comments.map((c) => (c._id === 'tmp' ? data.comment : c));
        return { ...p, comments };
      });
    } catch (err) {
      updatePost(postId, (p) => ({ ...p, comments: p.comments.filter((c) => c._id !== 'tmp') }));
      setError(err.message);
    }
  };

  const handleShare = async (postId, shared) => {
    updatePost(postId, (p) => ({
      ...p,
      shares: shared ? (p.shares || []).filter((u) => u !== user.username) : [...(p.shares || []), user.username],
    }));
    try {
      await api.toggleShare(postId);
    } catch (err) {
      updatePost(postId, (p) => ({
        ...p,
        shares: shared ? [...(p.shares || []), user.username] : (p.shares || []).filter((u) => u !== user.username),
      }));
      setError(err.message);
    }
  };

  const handleVote = async (postId, optionIndex) => {
    try {
      const data = await api.votePoll(postId, optionIndex);
      updatePost(postId, (p) => ({ ...p, poll: data.poll }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleFollow = async (authorId) => {
    const followed = (user.following || []).includes(authorId);
    const next = (ids) => (followed ? ids.filter((id) => id !== authorId) : [...ids, authorId]);
    // optimistic update
    updateUser({ ...user, following: next(user.following || []) });
    try {
      await api.toggleFollow(authorId);
    } catch (err) {
      // revert on failure
      updateUser({ ...user, following: next(next(user.following || [])) });
      setError(err.message);
    }
  };

  const updatePost = (postId, updater) => {
    setPosts((prev) => prev.map((p) => (p._id === postId ? updater(p) : p)));
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await load(nextCursor);
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const isFollowing = (authorId) => (user?.following || []).includes(authorId);

  return (
    <div>
      {/* Top toolbar — "Create Post" heading + All posts / Promotions tabs */}
      <div className="d-flex align-items-center justify-content-between mb-3 feed-toolbar">
        <h5 className="mb-0" style={{ fontWeight: 700 }}>Create Post</h5>
        <Nav variant="pills" className="feed-seg" style={{ gap: 2 }}>
          <Nav.Item>
            <Nav.Link active={viewMode === 'all'} onClick={() => setViewMode('all')}>All posts</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link active={viewMode === 'promotions'} onClick={() => setViewMode('promotions')}>Promotions</Nav.Link>
          </Nav.Item>
        </Nav>
      </div>

      {/* Composer — regular or promotion depending on tab */}
      {viewMode === 'all'
        ? <PostComposer onCreated={handlePostCreated} />
        : <PromotionComposer onCreated={handlePostCreated} />
      }

      {/* Sort tabs row */}
      <div className="feed-sort-tabs mb-3">
        {SORT_TABS.map((t) => (
          <button
            key={t.key}
            className={`sort-tab ${sort === t.key ? 'active' : ''}`}
            onClick={() => setSort(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div className="empty-feed">
          <div className="icon"><RiMegaphoneLine /></div>
          <h5 className="mt-3">
            {viewMode === 'promotions'
              ? 'No promotions yet'
              : sort === 'following'
                ? 'Nothing from people you follow yet'
                : 'No posts yet'}
          </h5>
          <p className="mb-1">
            {viewMode === 'promotions'
              ? 'Create your first promotion above.'
              : sort === 'following'
                ? 'Follow some people to fill your feed.'
                : 'Be the first one to share something!'}
          </p>
        </div>
      ) : (
        <div>
          {sortedPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              currentUser={user}
              isFollowing={isFollowing(post.authorId)}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onVote={handleVote}
              onToggleFollow={handleToggleFollow}
            />
          ))}

          {hasMore && (
            <div className="text-center mt-4">
              <Button
                variant="outline-secondary"
                className="px-4"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more posts'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}