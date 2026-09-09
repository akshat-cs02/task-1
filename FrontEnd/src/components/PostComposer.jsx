/**
 * PostComposer — the "What's on your mind?" box for regular posts.
 *
 * Supports text, image uploads (as base64), emoji insertion, and polls.
 * The image is read as base64 on the client side — yeah, it makes the
 * request payload big, but it keeps the backend simple (no file upload
 * handling needed).
 *
 * Emoji picker is a simple grid of common emojis — no library needed
 * for something this basic.
 */

import { useRef, useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PollModal from './PollModal';
import { EMOJIS } from '../constants';
import { FiCamera, FiX, FiChevronDown, FiSmile, FiBarChart2 } from 'react-icons/fi';

function initials(name) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function PostComposer({ onCreated }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const fileRef = useRef(null);

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Image must be under 12MB');
      return;
    }

    // converting to base64 — this is what gets sent to the backend
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const addEmoji = (emoji) => {
    setText((t) => t + emoji);
    setShowEmoji(false);
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed && !image) return;

    setSending(true);
    setError('');
    try {
      const res = await api.createPost({ text: trimmed, image });
      onCreated(res.post);
      setText('');
      setImage(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="post-card composer mb-4" style={{ background: '#fff' }}>
      <div className="p-3">
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className="avatar" style={{ background: user.avatarColor || '#7c3aed' }}>
            {initials(user.name || user.username)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name || user.username}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>@{user.username}</div>
          </div>
        </div>

        <div className="composer-box">
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            onFocus={() => setShowEmoji(false)}
            maxLength={2000}
          />

          {image && (
            <div className="image-preview">
              <img src={image} alt="Selected preview" />
              <Button
                variant="dark"
                size="sm"
                className="remove"
                onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ''; }}
              >
                <FiX />
              </Button>
            </div>
          )}

          {showEmoji && (
            <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
              {EMOJIS.map((e) => (
                <button key={e} type="button" className="emoji-btn" onClick={() => addEmoji(e)}>{e}</button>
              ))}
            </div>
          )}

          <div className="d-flex align-items-center justify-content-between mt-3">
            <div className="d-flex align-items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
              <button className="composer-action" onClick={() => fileRef.current?.click()} title="Upload photo">
                <FiCamera size={18} />
                <span>Photo</span>
              </button>
              <button className="composer-action" onClick={() => setShowEmoji((s) => !s)} title="Add emoji">
                <FiSmile size={18} />
                <span>Emoji</span>
                <FiChevronDown size={14} />
              </button>
              <button className="composer-action" onClick={() => setShowPoll(true)} title="Create poll">
                <FiBarChart2 size={18} />
                <span>Create poll</span>
              </button>
            </div>

            <Button
              variant="brand"
              className="btn-brand px-4 compose-post-btn"
              onClick={submit}
              disabled={sending || (!text.trim() && !image)}
            >
              {sending ? <Spinner size="sm" animation="border" /> : 'Post'}
            </Button>
          </div>

          {error && <div className="text-danger small mt-2">{error}</div>}
        </div>
      </div>

      <PollModal show={showPoll} onHide={() => setShowPoll(false)} onCreated={onCreated} />
    </div>
  );
}