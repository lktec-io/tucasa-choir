import { useState, useEffect } from 'react';
import { FiMenu, FiX, FiLogOut } from 'react-icons/fi';
import '../styles/AdminShell.css';

export default function AdminShell({
  title, subtitle, pageTitle, userEmail, nav, activeView,
  onNavigate, onLogout, linksLabel, links = [], children,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => { if (window.innerWidth >= 900) setOpen(false); };
    window.addEventListener('resize', close, { passive: true });
    return () => window.removeEventListener('resize', close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="shell">
      <div className={`shell-overlay${open ? ' visible' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className={`shell-sidebar${open ? ' open' : ''}`}>
        <div className="shell-brand">
          <img className="shell-brand-logo" src="/logo-96.jpg" alt="" width="38" height="38" />
          <div>
            <div className="shell-brand-title">{title}</div>
            <div className="shell-brand-sub">{subtitle}</div>
          </div>
        </div>

        <nav className="shell-nav" aria-label={`${title} navigation`}>
          {nav.map(item => (
            <button
              key={item.key}
              type="button"
              className={`shell-nav-item${activeView === item.key ? ' active' : ''}`}
              aria-current={activeView === item.key ? 'page' : undefined}
              onClick={() => { onNavigate(item.key); setOpen(false); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          {links.length > 0 && <p className="shell-nav-label">{linksLabel}</p>}
          {links.map(link => (
            <button
              key={link.label}
              type="button"
              className="shell-nav-item"
              onClick={() => { setOpen(false); link.onClick(); }}
            >
              {link.icon}
              {link.label}
            </button>
          ))}
        </nav>

        <div className="shell-sidebar-footer">
          <button type="button" className="shell-nav-item" onClick={onLogout}>
            <FiLogOut /> Sign Out
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <div className="shell-topbar-left">
            <button
              type="button"
              className="btn btn-secondary btn-icon btn-sm shell-menu-btn"
              onClick={() => setOpen(v => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <FiX /> : <FiMenu />}
            </button>
            <h1 className="shell-title">{pageTitle}</h1>
          </div>
          <div className="shell-user">
            <div className="avatar shell-user-avatar" aria-hidden="true">{userEmail?.[0]?.toUpperCase()}</div>
            <span className="shell-user-email">{userEmail}</span>
          </div>
        </header>

        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}
