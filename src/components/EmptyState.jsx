import { FiMusic, FiSearch } from 'react-icons/fi';
import '../styles/Loader.css';

export default function EmptyState({ icon, title, text, action }) {
  const Icon = icon === 'search' ? FiSearch : FiMusic;
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {text && <p className="empty-state-text">{text}</p>}
      {action && (
        <button className="empty-state-btn" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
