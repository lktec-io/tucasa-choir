import '../styles/Loader.css';

export function Loader({ text = 'Loading...' }) {
  return (
    <div className="loader-page">
      <div className="loader-spinner" />
      <span className="loader-text">{text}</span>
    </div>
  );
}

export function InlineLoader({ text = 'Loading' }) {
  return (
    <div className="loader-inline">
      <span>{text}</span>
      <div className="loader-dots">
        <div className="loader-dot" />
        <div className="loader-dot" />
        <div className="loader-dot" />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="hymn-card-skeleton">
      <div className="skeleton skeleton-line" style={{ height: 48, width: 48, borderRadius: 12 }} />
      <div className="skeleton skeleton-line" style={{ height: 20, width: '70%' }} />
      <div className="skeleton skeleton-line" style={{ height: 14, width: '100%' }} />
      <div className="skeleton skeleton-line" style={{ height: 14, width: '80%' }} />
      <div className="skeleton skeleton-line" style={{ height: 36, width: 120, borderRadius: 999 }} />
    </div>
  );
}
