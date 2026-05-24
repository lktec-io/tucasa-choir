import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMusic, FiSun, FiMoon, FiMenu, FiX } from 'react-icons/fi';
import '../styles/Navbar.css';

export default function Navbar({ theme, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-icon">
              <FiMusic />
            </div>
            <div className="navbar-logo-text">
              <span className="navbar-logo-title">TUCASA TIA</span>
              <span className="navbar-logo-subtitle">Choir Hymns Library</span>
            </div>
          </Link>

          <div className="navbar-links">
            <Link to="/" className="navbar-link">Home</Link>
            <a href="#hymns" className="navbar-link">Hymns</a>
            <a href="#support" className="navbar-link">Support</a>
          </div>

          <div className="navbar-actions">
            <button
              className="theme-toggle-btn"
              onClick={onToggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </button>

            <button
              className={`hamburger${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        <Link to="/" className="navbar-link">Home</Link>
        <a href="#hymns" className="navbar-link">Hymns</a>
        <a href="#support" className="navbar-link">Support</a>
      </div>
    </>
  );
}
