import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { FiArrowLeft, FiMusic, FiCalendar, FiHeadphones, FiDownload, FiExternalLink } from 'react-icons/fi';
import { BsFilePdf } from 'react-icons/bs';
import { db } from '../firebase/config';
import AudioTrackCard from '../components/AudioTrackCard';
import { Loader } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import '../styles/HymnDetails.css';

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function HymnDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hymn, setHymn] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, 'hymns', id)).then(snap => {
      if (snap.exists()) {
        setHymn({ id: snap.id, ...snap.data() });
      } else {
        navigate('/');
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      navigate('/');
    });
  }, [id, navigate]);

  useEffect(() => {
    const q = query(
      collection(db, 'audioTracks'),
      where('hymnId', '==', id),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTracksLoading(false);
    }, () => setTracksLoading(false));
    return unsub;
  }, [id]);

  if (loading) return <div className="hymn-details-page"><div className="container"><Loader /></div></div>;
  if (!hymn) return null;

  return (
    <motion.div
      className="hymn-details-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="container">
        <button className="hymn-details-back" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back to Library
        </button>

        {/* Hymn Hero Card */}
        <motion.div
          className="hymn-details-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="hymn-details-header">
            <div className="hymn-details-icon">
              <FiMusic />
            </div>
            <div className="hymn-details-info">
              <p className="hymn-details-eyebrow">TUCASA TIA Choir Library</p>
              <h1 className="hymn-details-title">{hymn.title}</h1>
              {hymn.description && (
                <p className="hymn-details-desc">{hymn.description}</p>
              )}
              <div className="hymn-details-meta">
                {hymn.createdAt && (
                  <span className="hymn-details-meta-item">
                    <FiCalendar /> {formatDate(hymn.createdAt)}
                  </span>
                )}
                <span className="hymn-details-meta-item">
                  <FiHeadphones /> {tracks.length} voice track{tracks.length !== 1 ? 's' : ''}
                </span>
                {hymn.pdfUrl && (
                  <span className="hymn-details-meta-item">
                    <BsFilePdf /> Sheet music available
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* PDF Section */}
        <motion.div
          className="pdf-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="section-label">Sheet Music</p>

          <div className="pdf-card">
            <div className="pdf-icon-wrap">
              <BsFilePdf />
            </div>
            <div className="pdf-info">
              <p className="pdf-title">{hymn.title} — Sheet Music</p>
              <p className="pdf-subtitle">
                {hymn.pdfUrl ? 'PDF available for preview and download' : 'No sheet music uploaded yet'}
              </p>
            </div>
            {hymn.pdfUrl ? (
              <div className="pdf-actions">
                <a href={hymn.pdfUrl} target="_blank" rel="noreferrer" className="pdf-btn primary">
                  <FiExternalLink /> Open PDF
                </a>
                <a href={hymn.pdfUrl} download={hymn.pdfOriginalName || `${hymn.title} Sheet Music.pdf`} className="pdf-btn secondary">
                  <FiDownload /> Download
                </a>
              </div>
            ) : (
              <p className="pdf-no-file">Not yet available</p>
            )}
          </div>

          {hymn.pdfUrl && (
            <div className="pdf-preview-wrap">
              {['jpg', 'jpeg', 'png'].includes((hymn.pdfFormat || '').toLowerCase()) ? (
                <img
                  src={hymn.pdfUrl}
                  alt={`${hymn.title} Sheet Music`}
                  className="sheet-music-img"
                  loading="lazy"
                />
              ) : (
                <iframe
                  src={hymn.pdfUrl}
                  className="pdf-iframe"
                  title={`${hymn.title} Sheet Music`}
                  loading="lazy"
                />
              )}
              <p className="pdf-preview-hint">
                Preview not showing?{' '}
                <a href={hymn.pdfUrl} target="_blank" rel="noreferrer">Open directly</a>
              </p>
            </div>
          )}
        </motion.div>

        {/* Voice Tracks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="section-label" style={{ marginBottom: 'var(--space-md)' }}>
            Voice Part Tracks
          </p>

          {tracksLoading ? (
            <Loader text="Loading tracks..." />
          ) : tracks.length === 0 ? (
            <div className="tracks-grid">
              <EmptyState
                icon="music"
                title="No tracks uploaded"
                text="No voice part tracks have been uploaded for this hymn yet."
              />
            </div>
          ) : (
            <div className="tracks-grid">
              {tracks.map((track, i) => (
                <AudioTrackCard key={track.id} track={track} index={i} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Note */}
        <motion.div
          style={{ marginTop: 'var(--space-2xl)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="note-text">
            <strong>Note:</strong> These audio tracks are provided for learning purposes. Users are encouraged to download them for offline practice. If you find any issues with the audio quality, please contact our support team.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
