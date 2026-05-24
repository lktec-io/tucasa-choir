import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMusic, FiCalendar, FiHeadphones, FiArrowRight } from 'react-icons/fi';
import '../styles/HymnCard.css';

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function HymnCard({ hymn, index = 0 }) {
  const navigate = useNavigate();

  return (
    <motion.div
      className="hymn-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      onClick={() => navigate(`/hymn/${hymn.id}`)}
    >
      <div className="hymn-card-header">
        <div className="hymn-card-icon">
          <FiMusic />
        </div>
        {hymn.trackCount > 0 && (
          <span className="hymn-card-badge">{hymn.trackCount} track{hymn.trackCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      <h3 className="hymn-card-title">{hymn.title}</h3>

      {hymn.description && (
        <p className="hymn-card-desc">{hymn.description}</p>
      )}

      <div className="hymn-card-meta">
        {hymn.createdAt && (
          <span className="hymn-card-meta-item">
            <FiCalendar />
            {formatDate(hymn.createdAt)}
          </span>
        )}
        {hymn.trackCount > 0 && (
          <span className="hymn-card-meta-item">
            <FiHeadphones />
            {hymn.trackCount} voice track{hymn.trackCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="hymn-card-footer">
        <button className="hymn-card-open-btn">
          Open Hymn <FiArrowRight />
        </button>
      </div>
    </motion.div>
  );
}
