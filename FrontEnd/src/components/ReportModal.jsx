/**
 * ReportModal — the popup for reporting a post.
 *
 * Shows a list of radio button reasons (Spam, Abuse, etc.)
 * and a "Report" button. Once reported, the backend stores
 * the report and prevents duplicate reports of the same reason.
 * The modal closes automatically after submission.
 */

import { useState } from 'react';
import { Modal, Form, Spinner } from 'react-bootstrap';
import { api } from '../api';

export const REPORT_REASONS = [
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

export default function ReportModal({ show, onHide, postId, onError }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await api.reportPost(postId, reason);
      onHide();
    } catch (err) {
      if (onError) onError(err.message);
      onHide();
    } finally {
      setSending(false);
      setReason(REPORT_REASONS[0]);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontWeight: 700 }}>Report post</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small mb-3">Why are you reporting this post?</p>
        <Form>
          {REPORT_REASONS.map((r) => (
            <Form.Check
              key={r}
              type="radio"
              id={`report-${r}`}
              name="reportReason"
              label={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="mb-2 report-radio"
            />
          ))}
        </Form>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button className="btn btn-light" onClick={onHide} disabled={sending}>
            Cancel
          </button>
          <button
            className="btn btn-danger px-4"
            onClick={submit}
            disabled={sending}
          >
            {sending ? <Spinner size="sm" animation="border" /> : 'Report'}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
}