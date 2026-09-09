/**
 * PollModal — the popup for creating a poll.
 *
 * Opens when you click "Create poll" in the composer.
 * Has: question field, 2-5 option fields, duration selector (24h/3d/7d).
 * Validates that there's a question and at least 2 options before submitting.
 * On submit, it creates a full post with the poll data attached.
 */

import { useState } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const DURATIONS = [
  { hours: 24, label: '24h' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
];

const MAX_OPTIONS = 5;

export default function PollModal({ show, onHide, onCreated }) {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [durationHours, setDurationHours] = useState(24);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const setOption = (i, value) => {
    const next = [...options];
    next[i] = value;
    setOptions(next);
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions([...options, '']);
  };

  const removeOption = (i) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const reset = () => {
    setQuestion('');
    setOptions(['', '']);
    setDurationHours(24);
    setError('');
  };

  const submit = async () => {
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return setError('Please write your question first.');
    if (validOptions.length < 2) return setError('Add at least 2 options.');

    setSending(true);
    setError('');
    try {
      const res = await api.createPost({
        poll: { question: question.trim(), options: validOptions, durationHours },
      });
      onCreated(res.post);
      reset();
      onHide();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontWeight: 700 }}>Create poll</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Ask a question</Form.Label>
          <Form.Control
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What do you want to ask?"
            maxLength={200}
          />
        </Form.Group>

        <Form.Label className="fw-semibold">Options</Form.Label>
        {options.map((opt, i) => (
          <div key={i} className="d-flex gap-2 mb-2">
            <Form.Control
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={100}
            />
            {options.length > 2 && (
              <Button variant="light" onClick={() => removeOption(i)}>
                <FiTrash2 />
              </Button>
            )}
          </div>
        ))}

        <Button
          variant="light"
          size="sm"
          onClick={addOption}
          disabled={options.length >= MAX_OPTIONS}
          className="mb-3"
        >
          <FiPlus className="me-1" />
          Add option
        </Button>

        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Poll duration</Form.Label>
          <div className="d-flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.hours}
                type="button"
                className={`duration-pill ${durationHours === d.hours ? 'active' : ''}`}
                onClick={() => setDurationHours(d.hours)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </Form.Group>

        {error && <div className="text-danger small mb-2">{error}</div>}

        <div className="d-flex justify-content-end gap-2 align-items-center">
          <span className="text-muted small">Posting as @{user?.username}</span>
          <Button variant="brand" className="btn-brand px-4" onClick={submit} disabled={sending}>
            {sending ? <Spinner size="sm" animation="border" /> : 'Post'}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}