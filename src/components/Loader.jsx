import '../styles/Loader.css';

export function Loader({ text = 'Loading...' }) {
  return (
    <div className="loader-page" role="status">
      <div className="loader-spinner" />
      <span className="loader-text">{text}</span>
    </div>
  );
}

export function InlineLoader({ text = 'Loading' }) {
  return (
    <div className="loader-inline" role="status">
      <span className="spinner" />
      <span>{text}</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="hymn-card-skeleton" aria-hidden="true">
      <div className="skeleton" style={{ height: 38, width: 38 }} />
      <div className="skeleton" style={{ height: 20, width: '70%' }} />
      <div className="skeleton" style={{ height: 14, width: '100%' }} />
      <div className="skeleton" style={{ height: 14, width: '80%' }} />
    </div>
  );
}
