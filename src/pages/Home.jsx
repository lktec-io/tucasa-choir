import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { FiArrowRight, FiHeadphones, FiBookOpen, FiUsers, FiMessageCircle } from 'react-icons/fi';
import { BsWhatsapp, BsMusicNoteBeamed, BsMusicNote } from 'react-icons/bs';
import { db } from '../../firebase/config';
import HymnCard from '../../components/HymnCard';
import SearchBar from '../../components/SearchBar';
import { SkeletonCard } from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import '../styles/Home.css';

const MUSIC_NOTES = ['♩', '♪', '♫', '♬', '𝄞', '♩', '♪', '♬'];

function useHymns() {
  const [hymns, setHymns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'hymns'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHymns(list);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  return { hymns, loading };
}

export default function Home() {
  const { hymns, loading } = useHymns();
  const [search, setSearch] = useState('');

  const filtered = hymns.filter(h =>
    h.title?.toLowerCase().includes(search.toLowerCase()) ||
    h.description?.toLowerCase().includes(search.toLowerCase())
  );

  const recent = hymns.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-bg" />
        <div className="hero-overlay" />

        {/* Floating notes */}
        <div className="floating-notes" aria-hidden="true">
          {MUSIC_NOTES.map((note, i) => (
            <span key={i} className="floating-note">{note}</span>
          ))}
        </div>

        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot" />
              Sacred Music Platform
            </div>

            <h1 className="hero-title">
              Master Your <span className="accent">Voice</span>
            </h1>

            <p className="hero-subtitle">
              The ultimate practice companion for sacred music. Explore our library and access professional guide tracks for every voice part.
            </p>

            <div className="hero-actions">
              <a href="#hymns" className="hero-cta-btn">
                Explore Library <FiArrowRight />
              </a>
              <a href="#support" className="hero-secondary-btn">
                <FiMessageCircle /> Get Help
              </a>
            </div>

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-num">{hymns.length}</span>
                <span className="hero-stat-label">Hymns</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-num">4</span>
                <span className="hero-stat-label">Voice Parts</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-num">∞</span>
                <span className="hero-stat-label">Practice</span>
              </div>
            </div>
          </div>

          {/* Hero visual card */}
          <div className="hero-visual">
            <div className="hero-visual-card">
              <p className="hero-visual-title">Voice Part Tracks</p>
              <div className="hero-visual-tracks">
                {[
                  { label: 'Soprano', color: 'linear-gradient(135deg,#ff6b9d,#c44b7d)', width: '90%' },
                  { label: 'Alto', color: 'linear-gradient(135deg,#f5a623,#e07b10)', width: '75%' },
                  { label: 'Tenor', color: 'linear-gradient(135deg,#4ecdc4,#2aa198)', width: '80%' },
                  { label: 'Bass', color: 'linear-gradient(135deg,#4a90e2,#2d6ab4)', width: '65%' },
                ].map(v => (
                  <div key={v.label} className="hero-visual-track">
                    <div className="hero-visual-track-icon" style={{ background: v.color }}>
                      {v.label[0]}
                    </div>
                    <div className="hero-visual-track-info">
                      <div className="hero-visual-track-name">{v.label}</div>
                      <div className="hero-visual-track-bar">
                        <div className="hero-visual-track-bar-fill" style={{ width: v.width }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Added */}
      {recent.length > 0 && (
        <section className="recently-added-section">
          <div className="container">
            <div className="section-header">
              <p className="section-eyebrow">Recently Added</p>
              <h2 className="section-title">Latest Hymns</h2>
            </div>
            <div className="recently-scroll">
              {recent.map((hymn, i) => (
                <Link key={hymn.id} to={`/hymn/${hymn.id}`} className="recently-card">
                  <div className="recently-card-num">{String(i + 1).padStart(2, '0')}</div>
                  <div className="recently-card-title">{hymn.title}</div>
                  <div className="recently-card-date">
                    {hymn.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || ''}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hymns Library */}
      <section className="hymns-section" id="hymns">
        <div className="container">
          <div className="section-header">
            <p className="section-eyebrow">Hymn Library</p>
            <h2 className="section-title">Sacred Collection</h2>
            <p className="section-subtitle">
              Browse our complete library of sacred hymns. Each comes with voice-part guide tracks and downloadable sheets.
            </p>
          </div>

          <div className="hymns-controls">
            <SearchBar value={search} onChange={setSearch} placeholder="Search hymns by title or description..." />
            <span className="hymns-count">
              <span>{filtered.length}</span> hymn{filtered.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {loading ? (
            <div className="hymns-grid">
              {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={search ? 'search' : 'music'}
              title={search ? 'No hymns found' : 'No hymns yet'}
              text={search ? `No results for "${search}". Try a different search.` : 'No hymns have been added to the library yet.'}
              action={search ? { label: 'Clear search', onClick: () => setSearch('') } : null}
            />
          ) : (
            <div className="hymns-grid">
              {filtered.map((hymn, i) => (
                <HymnCard key={hymn.id} hymn={hymn} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Support Section */}
      <section className="support-section" id="support">
        <div className="container">
          <div className="support-card">
            <div className="section-eyebrow" style={{ marginBottom: 'var(--space-md)' }}>Get Help</div>
            <h2 className="support-title">Need Help?</h2>
            <p className="support-text">
              If you have any questions or need further assistance, feel free to reach out to us directly.
            </p>
            <a
              href="https://wa.me/255674022265"
              target="_blank"
              rel="noreferrer"
              className="whatsapp-btn"
            >
              <BsWhatsapp className="whatsapp-icon" />
              Chat on WhatsApp
            </a>

            <p className="note-text">
              <strong>Note:</strong> These audio tracks are provided for learning purposes. Users are encouraged to download them for offline practice. If you find any issues with the audio quality, please contact our support team.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
