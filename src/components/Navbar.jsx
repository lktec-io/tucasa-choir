import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiSun, FiMoon, FiMenu, FiX } from 'react-icons/fi';
import '../styles/Navbar.css';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/#hymns', label: 'Hymns' },
  { to: '/attendance', label: 'My Attendance' },
  { to: '/#support', label: 'Support' },
];

export default function Navbar({ theme, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const current = location.pathname + location.hash;

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const renderLinks = () => LINKS.map(link => (
    <Link
      key={link.to}
      to={link.to}
      className={`navbar-link${current === link.to ? ' active' : ''}`}
      aria-current={current === link.to ? 'page' : undefined}
    >
      {link.label}
    </Link>
  ));

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <img className="navbar-logo-img" src="/logo-96.jpg" alt="" width="40" height="40" />
          <span className="navbar-logo-text">
            <span className="navbar-logo-title">TUCASA TIA Mbeya</span>
            <span className="navbar-logo-subtitle">Choir Hymns Library</span>
          </span>
        </Link>

        <nav className="navbar-links" aria-label="Main">
          {renderLinks()}
        </nav>

        <div className="navbar-actions">
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-icon navbar-menu-btn"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      <nav id="mobile-menu" className={`mobile-menu${menuOpen ? ' open' : ''}`} aria-label="Mobile">
        {renderLinks()}
      </nav>
    </header>
  );
}
