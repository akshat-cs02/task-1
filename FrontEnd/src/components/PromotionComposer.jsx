/**
 * PromotionComposer — the composer for the Promotions tab.
 *
 * Similar to PostComposer but with extra fields:
 *   - App / Website name
 *   - Promotion title
 *   - Description
 *   - Category dropdown (Refer and earn / Crypto)
 *
 * Also supports photo uploads, emoji, and polls — same as regular posts.
 * The "Promote" button replaces "Post" to make it clear this is a
 * promotion, not a regular post.
 */

import { useRef, useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PollModal from './PollModal';
import { EMOJIS, PROMOTION_CATEGORIES } from '../constants';
import { FiCamera, FiX, FiChevronDown, FiSmile, FiBarChart2 } from 'react-icons/fi';

function initials(name) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const initial = { website: '', title: '', description: '', category: '' };

export default function PromotionComposer({ onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState(initial);
  const [image, setImage] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const fileRef = useRef(null);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Only image files are allowed');
    if (file.size > 12 * 1024 * 1024) return setError('Image must be under 12MB');
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
    setError('');
  };

  const addEmoji = (emoji) => {
    setForm((f) => ({ ...f, description: f.description + emoji }));
    setShowEmoji(false);
  };

  const submit = async () => {
    if (!form.website.trim()) return setError('Enter the app / website name.');
    if (!form.title.trim()) return setError('Enter a promotion title.');
    if (!form.description.trim()) return setError('Write a description.');
    if (!form.category) return setError('Select a category.');

    setSending(true);
    setError('');
    try {
      const res = await api.createPost({
        promotion: {
          website: form.website.trim(),
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
        },
        image,
      });
      onCreated(res.post);
      setForm(initial);
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
          <span className="promo-banner ms-auto">
            <span className="promo-badge">Promoted</span>
          </span>
        </div>

        <div className="composer-box">
          <Form.Group className="mb-2">
            <Form.Control
              name="website"
              value={form.website}
              onChange={change}
              placeholder="App / Website name"
              maxLength={100}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Control
              name="title"
              value={form.title}
              onChange={change}
              placeholder="Promotion title"
              maxLength={100}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Control
              as="textarea"
              rows={2}
              name="description"
              value={form.description}
              onChange={change}
              placeholder="Description"
              onFocus={() => setShowEmoji(false)}
              maxLength={2000}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Select name="category" value={form.category} onChange={change}>
              <option value="">Select category</option>
              {PROMOTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Form.Select>
          </Form.Group>

          {image && (
            <div className="image-preview">
              <img src={image} alt="Selected preview" />
              <Button variant="dark" size="sm" className="remove"
                onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ''; }}>
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

            <Button variant="brand" className="btn-brand px-4 compose-post-btn"
              onClick={submit} disabled={sending}>
              {sending ? <Spinner size="sm" animation="border" /> : 'Promote'}
            </Button>
          </div>

          {error && <div className="text-danger small mt-2">{error}</div>}
        </div>
      </div>

      <PollModal show={showPoll} onHide={() => setShowPoll(false)} onCreated={onCreated} />
    </div>
  );
}