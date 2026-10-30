import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { FiArrowRight, FiMessageCircle } from 'react-icons/fi';
import { BsWhatsapp } from 'react-icons/bs';
import { db } from '../firebase/config';
import HymnCard from '../components/HymnCard';
import SearchBar from '../components/SearchBar';
import { SkeletonCard } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { voiceKey, voiceLetter } from '../utils/voice';
import '../styles/Home.css';

const VOICE_PARTS = ['Soprano', 'Alto', 'Tenor', 'Bass'];

function useHymns() {
  const [hymns, setHymns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'hymns'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHymns(list);
      setLoading(false);
    }, () => {
      setFailed(true);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { hymns, loading, failed };
}

export default function Home() {
  const { hymns, loading, failed } = useHymns();
  const [search, setSearch] = useState('');
  const { hash } = useLocation();

  // Hymns load after the first scroll and push later sections down
  useEffect(() => {
    if (!loading && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [loading, hash]);

  const filtered = hymns.filter(h =>
    h.title?.toLowerCase().includes(search.toLowerCase()) ||
    h.description?.toLowerCase().includes(search.toLowerCase())
  );

  const recent = hymns.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <p className="hero-eyebrow">TUCASA TIA Mbeya Choir</p>

            <h1 className="hero-title">Learn every hymn, one voice at a time.</h1>

            <p className="hero-subtitle">
              A practice companion for sacred music. Explore our library and access guide tracks for every voice part.
            </p>

            <div className="hero-actions">
              <a href="#hymns" className="btn hero-btn-primary">
                Explore Library <FiArrowRight />
              </a>
              <a href="#support" className="btn hero-btn-secondary">
                <FiMessageCircle /> Get Help
              </a>
            </div>

            <dl className="hero-stats">
              <div className="hero-stat">
                <dd className="hero-stat-num">{loading ? '—' : hymns.length}</dd>
                <dt className="hero-stat-label">Hymns</dt>
              </div>
              <div className="hero-stat">
                <dd className="hero-stat-num">{VOICE_PARTS.length}</dd>
                <dt className="hero-stat-label">Voice Parts</dt>
              </div>
            </dl>
          </div>

          <div className="hero-visual">
            <img
              className="hero-logo"
              src="/logo-480.jpg"
              alt="TUCASA TMC logo: a gold treble clef beside navy lettering"
              width="480"
              height="480"
              fetchPriority="high"
            />
            <ul className="hero-voices" aria-label="Voice parts">
              {VOICE_PARTS.map(part => (
                <li key={part} className="hero-voice">
                  <span className={`voice-tile voice-fill ${voiceKey(part)}`} aria-hidden="true">{voiceLetter(part)}</span>
                  {part}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Recently Added */}
      {recent.length > 0 && (
        <section className="recently-added-section">
          <div className="container">
            <div className="section-header">
              <p className="section-label">Recently Added</p>
              <h2 className="section-title">Latest Hymns</h2>
            </div>
            <ol className="recently-list">
              {recent.map((hymn, i) => (
                <li key={hymn.id}>
                  <Link to={`/hymn/${hymn.id}`} className="recently-card">
                    <span className="recently-card-num num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="recently-card-text">
                      <span className="recently-card-title">{hymn.title}</span>
                      <span className="recently-card-date num">
                        {hymn.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || ''}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Hymns Library */}
      <section className="hymns-section" id="hymns">
        <div className="container">
          <div className="section-header">
            <p className="section-label">Hymn Library</p>
            <h2 className="section-title">Sacred Collection</h2>
            <p className="section-subtitle">
              Browse our complete library of sacred hymns. Each comes with voice-part guide tracks and downloadable sheets.
            </p>
          </div>

          <div className="hymns-controls">
            <SearchBar value={search} onChange={setSearch} placeholder="Search hymns by title or description..." />
            <span className="hymns-count" role="status">
              <span className="num">{filtered.length}</span> hymn{filtered.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {loading ? (
            <div className="hymns-grid">
              {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : failed ? (
            <EmptyState
              icon="alert"
              title="Could not load hymns"
              text="Please check your connection and refresh the page."
            />
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
            <div>
              <p className="section-label">Get Help</p>
              <h2 className="support-title">Need Help?</h2>
              <p className="support-text">
                If you have any questions or need further assistance, feel free to reach out to us directly.
              </p>
              <a
                href="https://wa.me/255755298196"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                <BsWhatsapp />
                Chat on WhatsApp
              </a>
            </div>

            <p className="note-text">
              <strong>Note:</strong> These audio tracks are provided for learning purposes. Users are encouraged to download them for offline practice. If you find any issues with the audio quality, please contact our support team.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
