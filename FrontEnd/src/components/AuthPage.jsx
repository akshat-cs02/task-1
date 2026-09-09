/**
 * AuthPage — login and signup forms.
 *
 * Uses a simple tab toggle (Login / Sign up) instead of separate pages.
 * The form state is local — gets reset when switching tabs.
 * On successful auth, it calls context.login() which handles token storage
 * and redirects the user to the feed.
 *
 * Signup includes an optional Name field for the display name —
 * if left blank, the username is used as the display name.
 */

import { useState } from 'react';
import {
  Card,
  Form,
  Button,
  Alert,
  Nav,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { RiNewspaperLine } from 'react-icons/ri';

export default function AuthPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload =
        tab === 'login'
          ? { email: form.email, password: form.password }
          : { username: form.username, name: form.name, email: form.email, password: form.password };
      const fn = tab === 'login' ? api.login : api.signup;
      const data = await fn(payload);
      login(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-hero-icon">
          <RiNewspaperLine />
        </div>
        <div className="auth-header">
          <h2 className="mb-1" style={{ fontWeight: 800 }}>TaskPlanet Social</h2>
          <div className="hint">Share updates, like posts, join the conversation.</div>
        </div>

        <Card style={{ border: '1px solid var(--border)', borderRadius: 14 }}>
          <Card.Body className="p-4">
            <Nav variant="pills" className="mb-4 justify-content-center" style={{ gap: 8 }}>
              <Nav.Item>
                <Nav.Link active={tab === 'login'} onClick={() => { setTab('login'); setError(''); }}>Login</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link active={tab === 'signup'} onClick={() => { setTab('signup'); setError(''); }}>Sign up</Nav.Link>
              </Nav.Item>
            </Nav>

            {error && <Alert variant="danger" className="py-2">{error}</Alert>}

            <Form onSubmit={submit}>
              {tab === 'signup' && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-required">Username</Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={change}
                      placeholder="3-20 characters"
                      minLength={3}
                      maxLength={20}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Name (optional)</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={change}
                      placeholder="Your display name"
                      maxLength={50}
                    />
                  </Form.Group>
                </>
              )}
              <Form.Group className="mb-3">
                <Form.Label className="form-label-required">Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={change}
                  placeholder="you@example.com"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label className="form-label-required">Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={change}
                  placeholder={tab === 'signup' ? 'Minimum 6 characters' : 'Your password'}
                  minLength={6}
                  required
                />
              </Form.Group>

              <Button
                type="submit"
                variant="brand"
                className="btn-brand w-100 py-2"
                disabled={loading}
              >
                {loading ? 'Please wait…' : tab === 'login' ? 'Login' : 'Create account'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}