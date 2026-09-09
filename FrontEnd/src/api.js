/**
 * api.js — all API calls live here.
 *
 * I wanted a single place to manage every request to the backend.
 * The `request` function handles auth headers, JSON formatting,
 * and error extraction. The exported `api` object groups related
 * calls so it's easy to find what you need.
 *
 * Vite's proxy handles the /api → localhost:5000 routing in dev,
 * so we just use relative paths. In production, VITE_API_URL
 * points to the deployed backend.
 */

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';

  // attach the JWT token if this request needs authentication
  const token = localStorage.getItem('tp_token');
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// grouped by resource — makes it easy to scan and find what you need
export const api = {
  // auth
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),

  // users
  me: () => request('/api/users/me', { auth: true }),
  toggleFollow: (id) => request(`/api/users/${id}/follow`, { method: 'POST', auth: true }),

  // posts — getPosts supports cursor pagination, scope (following), and type (promotion)
  getPosts: (cursor, scope, type) =>
    request(
      `/api/posts?limit=5${cursor ? `&cursor=${cursor}` : ''}${scope ? `&scope=${scope}` : ''}${type ? `&type=${type}` : ''}`,
      { auth: true }
    ),
  createPost: (payload) => request('/api/posts', { method: 'POST', body: payload, auth: true }),

  // interactions
  toggleLike: (id) => request(`/api/posts/${id}/like`, { method: 'POST', auth: true }),
  addComment: (id, payload) => request(`/api/posts/${id}/comment`, { method: 'POST', body: payload, auth: true }),
  toggleShare: (id) => request(`/api/posts/${id}/share`, { method: 'POST', auth: true }),
  votePoll: (id, option) => request(`/api/posts/${id}/vote`, { method: 'POST', body: { option }, auth: true }),
  reportPost: (id, reason) => request(`/api/posts/${id}/report`, { method: 'POST', body: { reason }, auth: true }),
};