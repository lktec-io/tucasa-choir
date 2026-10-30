import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { FiArrowLeft, FiMusic, FiCalendar, FiHeadphones, FiDownload, FiEye, FiImage, FiX, FiMaximize2 } from 'react-icons/fi';
import { BsFilePdf } from 'react-icons/bs';
import { db } from '../firebase/config';
import AudioTrackCard from '../components/AudioTrackCard';
import ChoirPlayer from '../components/ChoirPlayer';
import { Loader } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import '../styles/HymnDetails.css';

async function triggerDownload(url, filename) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename || 'sheet-music';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, '_blank');
  }
}

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
  const [showPreview, setShowPreview] = useState(false);
  // Cross-component sync: incrementing stops the target group
  const [cardStopSignal,  setCardStopSignal]  = useState(0);
  const [choirStopSignal, setChoirStopSignal] = useState(0);

  const closePreview = useCallback(() => setShowPreview(false), []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closePreview(); };
    if (showPreview) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPreview, closePreview]);

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
      transition={{ duration: 0.2 }}
    >
      <div className="container">
        <button type="button" className="btn btn-tertiary btn-sm hymn-details-back" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back to Library
        </button>

        {/* Hymn Header */}
        <div className="hymn-details-hero">
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
                    <FiCalendar /> <span className="num">{formatDate(hymn.createdAt)}</span>
                  </span>
                )}
                <span className="hymn-details-meta-item">
                  <FiHeadphones /> <span><span className="num">{tracks.length}</span> voice track{tracks.length !== 1 ? 's' : ''}</span>
                </span>
                {hymn.pdfUrl && (
                  <span className="hymn-details-meta-item">
                    <BsFilePdf /> Sheet music available
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sheet Music Section */}
        <section className="pdf-section">
          <h2 className="section-label">Sheet Music</h2>
          <div className="pdf-card">
            <div className="pdf-icon-wrap">
              {['jpg', 'jpeg', 'png'].includes((hymn.pdfFormat || '').toLowerCase())
                ? <FiImage />
                : <BsFilePdf />}
            </div>
            <div className="pdf-info">
              <p className="pdf-title">{hymn.title} — Sheet Music</p>
              <p className="pdf-subtitle">
                {hymn.pdfUrl
                  ? `${hymn.pdfOriginalName || 'Sheet music'} available`
                  : 'No sheet music uploaded yet'}
              </p>
            </div>
            {hymn.pdfUrl ? (
              <div className="pdf-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowPreview(true)}
                >
                  <FiEye /> Preview
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => triggerDownload(
                    hymn.pdfUrl,
                    hymn.pdfOriginalName || `${hymn.title} Sheet Music`
                  )}
                >
                  <FiDownload /> Download
                </button>
              </div>
            ) : (
              <p className="pdf-no-file">Not yet available</p>
            )}
          </div>
        </section>

        {/* Sheet Music Preview Modal */}
        <AnimatePresence>
          {showPreview && hymn.pdfUrl && (
            <motion.div
              className="sheet-preview-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.target === e.currentTarget && closePreview()}
            >
              <motion.div
                className="sheet-preview-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`${hymn.title} sheet music preview`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="sheet-preview-header">
                  <div className="sheet-preview-header-left">
                    {['jpg', 'jpeg', 'png'].includes((hymn.pdfFormat || '').toLowerCase())
                      ? <FiImage className="sheet-preview-type-icon" />
                      : <BsFilePdf className="sheet-preview-type-icon" />}
                    <span className="sheet-preview-title">{hymn.title} — Sheet Music</span>
                  </div>
                  <div className="sheet-preview-header-actions">
                    <a
                      href={hymn.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="Open in new tab"
                      aria-label="Open in new tab"
                    >
                      <FiMaximize2 />
                    </a>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      onClick={closePreview}
                      title="Close"
                      aria-label="Close preview"
                      autoFocus
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
                <div className="sheet-preview-body">
                  {['jpg', 'jpeg', 'png'].includes((hymn.pdfFormat || '').toLowerCase()) ? (
                    <img
                      src={hymn.pdfUrl}
                      alt={`${hymn.title} Sheet Music`}
                      className="sheet-preview-img"
                    />
                  ) : (
                    <iframe
                      src={hymn.pdfUrl}
                      className="sheet-preview-iframe"
                      title={`${hymn.title} Sheet Music`}
                    />
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Tracks */}
        <section>
          <h2 className="section-label">Voice Part Tracks</h2>

          {tracksLoading ? (
            <Loader text="Loading tracks..." />
          ) : tracks.length === 0 ? (
            <EmptyState
              icon="music"
              title="No tracks uploaded"
              text="No voice part tracks have been uploaded for this hymn yet."
            />
          ) : (
            <>
              {/* Choir Mix player — shown whenever there is at least one track */}
              <ChoirPlayer
                key={tracks.map(t => t.id).join(',')}
                tracks={tracks}
                stopSignal={choirStopSignal}
                stopOthers={() => setCardStopSignal(s => s + 1)}
              />

              {/* Individual track cards */}
              <div className="tracks-grid">
                {tracks.map((track, i) => (
                  <AudioTrackCard
                    key={track.id}
                    track={track}
                    index={i}
                    stopSignal={cardStopSignal}
                    onPlay={() => setChoirStopSignal(s => s + 1)}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Note */}
        <p className="note-text hymn-details-note">
          <strong>Note:</strong> These audio tracks are provided for learning purposes. Users are encouraged to download them for offline practice. If you find any issues with the audio quality, please contact our support team.
        </p>
      </div>
    </motion.div>
  );
}
