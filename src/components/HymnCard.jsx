import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMusic, FiArrowRight } from 'react-icons/fi';
import '../styles/HymnCard.css';

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function HymnCard({ hymn, index = 0 }) {
  return (
    <motion.article
      className="hymn-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 8) * 0.03 }}
    >
      <div className="hymn-card-header">
        <div className="hymn-card-icon">
          <FiMusic />
        </div>
        <div className="hymn-card-badges">
          {hymn.pdfUrl && <span className="badge badge-pdf">Sheet music</span>}
          {hymn.trackCount > 0 && (
            <span className="badge">
              <span className="num">{hymn.trackCount}</span> track{hymn.trackCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <h3 className="hymn-card-title">
        <Link to={`/hymn/${hymn.id}`} className="hymn-card-link">{hymn.title}</Link>
      </h3>

      {hymn.description && (
        <p className="hymn-card-desc">{hymn.description}</p>
      )}

      <div className="hymn-card-footer">
        <span className="hymn-card-date num">{formatDate(hymn.createdAt)}</span>
        <span className="hymn-card-open" aria-hidden="true">
          Open <FiArrowRight />
        </span>
      </div>
    </motion.article>
  );
}
