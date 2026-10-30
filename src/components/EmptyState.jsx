import { FiMusic, FiSearch, FiAlertCircle } from 'react-icons/fi';
import '../styles/Loader.css';

const ICONS = { search: FiSearch, alert: FiAlertCircle };

export default function EmptyState({ icon, title, text, action }) {
  const Icon = ICONS[icon] || FiMusic;
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {text && <p className="empty-state-text">{text}</p>}
      {action && (
        <button type="button" className="btn btn-secondary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
