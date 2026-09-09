/**
 * NavBar — the sticky header at the top of the feed page.
 *
 * Shows the app name on the left, and the user's display name + logout
 * button on the right. Kept it minimal — no extra dropdowns or settings.
 */

import { useAuth } from '../context/AuthContext';
import { RiNewspaperLine } from 'react-icons/ri';

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="app-navbar">
      <div className="inner">
        <span className="brand">
          <span className="brand-logo">
            <RiNewspaperLine />
          </span>
          TaskPlanet
          <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--muted)' }}>Social</span>
        </span>
        <div className="d-flex align-items-center gap-3">
          <span
            className="d-none d-sm-inline-block text-end"
            style={{ fontSize: 13, lineHeight: 1.2 }}
          >
            <span style={{ fontWeight: 600, display: 'block' }}>
              {user?.name || user?.username}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>@{user?.username}</span>
          </span>
          <button className="action-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}