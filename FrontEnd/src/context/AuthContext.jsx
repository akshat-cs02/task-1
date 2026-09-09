/**
 * AuthContext — manages authentication state across the app.
 *
 * Handles login/logout, stores token and user in localStorage,
 * and syncs the user profile from the server on mount. The syncMe
 * function is important — it refreshes the user's following list
 * so the "For You" tab and Follow buttons always have fresh data.
 *
 * I went with React Context instead of Redux or Zustand because
 * this app's state is relatively simple — auth + following list.
 * Context handles that without adding another dependency.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tp_user')) || null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('tp_token') || null);
  const syncedRef = useRef(false);

  const login = ({ token, user }) => {
    localStorage.setItem('tp_token', token);
    localStorage.setItem('tp_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
    // immediately sync from server to get the full following list
    syncMe();
  };

  const logout = () => {
    localStorage.removeItem('tp_token');
    localStorage.removeItem('tp_user');
    setToken(null);
    setUser(null);
  };

  // fetches the current user's profile from the server
  // this gives us the fresh following list for "For You" feed
  const syncMe = async () => {
    const t = localStorage.getItem('tp_token');
    if (!t) return;
    try {
      const data = await api.me();
      const refreshed = { ...data.user, following: data.following || [] };
      localStorage.setItem('tp_user', JSON.stringify(refreshed));
      setUser(refreshed);
    } catch {
      // token is invalid — protected routes will handle this
    }
  };

  // used for optimistic updates (like follow/unfollow)
  // lets us update the user object without waiting for the server
  const updateUser = (next) => {
    setUser(next);
    localStorage.setItem('tp_user', JSON.stringify(next));
  };

  // sync user profile on first mount if we have a token
  useEffect(() => {
    if (token && !syncedRef.current) {
      syncedRef.current = true;
      syncMe();
    }
  }, [token]);

  const value = { user, token, login, logout, syncMe, updateUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}