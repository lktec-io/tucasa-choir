import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'firebase/auth';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, onSnapshot, query, orderBy, where, getDocs
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from 'firebase/storage';
import { auth, db, storage } from '../firebase/config';
import { toast } from 'react-hot-toast';
import {
  FiMail, FiLock, FiLogOut, FiMenu, FiX,
  FiHome, FiPlus, FiList, FiSettings, FiMusic,
  FiUpload, FiTrash2, FiEdit3, FiEye, FiDownload,
  FiHeadphones, FiUsers, FiBookOpen
} from 'react-icons/fi';
import { BsFilePdf } from 'react-icons/bs';
import '../styles/Admin.css';

/* ---------- Auth Form ---------- */
function AuthForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-page">
      <motion.div
        className="admin-auth-card"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="admin-auth-logo">
          <div className="admin-auth-logo-icon"><FiMusic /></div>
          <h2 className="admin-auth-title">Admin Access</h2>
          <p className="admin-auth-subtitle">TUCASA TIA Choir — Secure Dashboard</p>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="form-input-wrap">
              <FiMail className="form-input-icon" />
              <input
                type="email"
                className="form-input"
                placeholder="admin@tucasa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="form-input-wrap">
              <FiLock className="form-input-icon" />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="form-submit-btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

/* ---------- Upload Progress Bar ---------- */
function UploadProgress({ progress, label }) {
  return (
    <div className="upload-progress">
      <div className="upload-progress-label">
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/* ---------- Manage Hymn Modal ---------- */
function ManageHymnModal({ hymn, onClose }) {
  const [trackTitle, setTrackTitle] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [deletingTrack, setDeletingTrack] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'audioTracks'),
      where('hymnId', '==', hymn.id),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [hymn.id]);

  const uploadAudio = async () => {
    if (!audioFile || !trackTitle.trim()) {
      toast.error('Please enter a track title and choose an audio file.');
      return;
    }
    setUploading(true);
    try {
      const storageRef = ref(storage, `audio/${hymn.id}/${Date.now()}_${audioFile.name}`);
      const task = uploadBytesResumable(storageRef, audioFile);
      task.on('state_changed',
        snap => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        err => { toast.error('Upload failed: ' + err.message); setUploading(false); },
        async () => {
          const audioUrl = await getDownloadURL(task.snapshot.ref);
          await addDoc(collection(db, 'audioTracks'), {
            hymnId: hymn.id,
            title: trackTitle.trim(),
            audioUrl,
            storagePath: storageRef.fullPath,
            createdAt: serverTimestamp(),
          });
          // update hymn trackCount
          const hymnRef = doc(db, 'hymns', hymn.id);
          await updateDoc(hymnRef, { trackCount: tracks.length + 1 });
          toast.success('Track uploaded!');
          setTrackTitle('');
          setAudioFile(null);
          setUploadProgress(0);
          setUploading(false);
        }
      );
    } catch (err) {
      toast.error('Upload failed.');
      setUploading(false);
    }
  };

  const uploadPdf = async () => {
    if (!pdfFile) { toast.error('Please choose a PDF file.'); return; }
    setUploadingPdf(true);
    try {
      const storageRef = ref(storage, `pdfs/${hymn.id}/${Date.now()}_${pdfFile.name}`);
      const task = uploadBytesResumable(storageRef, pdfFile);
      task.on('state_changed',
        snap => setPdfProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        err => { toast.error('PDF upload failed: ' + err.message); setUploadingPdf(false); },
        async () => {
          const pdfUrl = await getDownloadURL(task.snapshot.ref);
          await updateDoc(doc(db, 'hymns', hymn.id), {
            pdfUrl,
            pdfStoragePath: storageRef.fullPath,
          });
          toast.success('PDF uploaded!');
          setPdfFile(null);
          setPdfProgress(0);
          setUploadingPdf(false);
        }
      );
    } catch (err) {
      toast.error('PDF upload failed.');
      setUploadingPdf(false);
    }
  };

  const deleteTrack = async (track) => {
    if (!window.confirm(`Delete "${track.title}"?`)) return;
    setDeletingTrack(track.id);
    try {
      if (track.storagePath) {
        await deleteObject(ref(storage, track.storagePath)).catch(() => {});
      }
      await deleteDoc(doc(db, 'audioTracks', track.id));
      await updateDoc(doc(db, 'hymns', hymn.id), { trackCount: Math.max(0, tracks.length - 1) });
      toast.success('Track deleted.');
    } catch {
      toast.error('Failed to delete track.');
    } finally {
      setDeletingTrack(null);
    }
  };

  function getVoiceColor(title = '') {
    const t = title.toLowerCase();
    if (t.includes('soprano')) return 'linear-gradient(135deg,#ff6b9d,#c44b7d)';
    if (t.includes('alto')) return 'linear-gradient(135deg,#f5a623,#e07b10)';
    if (t.includes('tenor')) return 'linear-gradient(135deg,#4ecdc4,#2aa198)';
    if (t.includes('bass')) return 'linear-gradient(135deg,#4a90e2,#2d6ab4)';
    return 'var(--gradient-accent)';
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="modal-box"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        <button className="modal-close-btn" onClick={onClose}><FiX /></button>

        <h2 className="modal-title">{hymn.title}</h2>
        <p className="modal-subtitle">Manage audio tracks and sheet music</p>

        {/* Upload PDF */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <p className="section-label" style={{ marginBottom: 'var(--space-md)' }}>Sheet Music (PDF)</p>
          <div className="file-upload-area">
            <input
              type="file"
              accept=".pdf"
              className="file-upload-input"
              onChange={e => setPdfFile(e.target.files[0])}
            />
            <div className="file-upload-icon"><BsFilePdf /></div>
            <p className="file-upload-text">Click to choose PDF file</p>
            <p className="file-upload-hint">PDF files only</p>
            {pdfFile && (
              <div className="file-selected-name">
                <BsFilePdf /> {pdfFile.name}
              </div>
            )}
          </div>
          {uploadingPdf && <UploadProgress progress={pdfProgress} label="Uploading PDF..." />}
          <button
            className="admin-action-btn primary"
            style={{ marginTop: 'var(--space-md)', width: '100%', justifyContent: 'center', padding: '11px' }}
            onClick={uploadPdf}
            disabled={uploadingPdf || !pdfFile}
          >
            <FiUpload /> {uploadingPdf ? 'Uploading...' : 'Upload PDF'}
          </button>
        </div>

        {/* Upload Audio Track */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <p className="section-label" style={{ marginBottom: 'var(--space-md)' }}>Add Voice Track</p>
          <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label">Track Title (e.g., Soprano, Alto, Tenor, Bass)</label>
            <div className="form-input-wrap">
              <FiMusic className="form-input-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Soprano Part"
                value={trackTitle}
                onChange={e => setTrackTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="file-upload-area">
            <input
              type="file"
              accept="audio/*"
              className="file-upload-input"
              onChange={e => setAudioFile(e.target.files[0])}
            />
            <div className="file-upload-icon"><FiHeadphones /></div>
            <p className="file-upload-text">Click to choose audio file</p>
            <p className="file-upload-hint">MP3, WAV, M4A, OGG supported</p>
            {audioFile && (
              <div className="file-selected-name">
                <FiMusic /> {audioFile.name}
              </div>
            )}
          </div>
          {uploading && <UploadProgress progress={uploadProgress} label="Uploading audio..." />}
          <button
            className="admin-action-btn primary"
            style={{ marginTop: 'var(--space-md)', width: '100%', justifyContent: 'center', padding: '11px' }}
            onClick={uploadAudio}
            disabled={uploading || !audioFile || !trackTitle.trim()}
          >
            <FiUpload /> {uploading ? 'Uploading...' : 'Upload Track'}
          </button>
        </div>

        {/* Existing Tracks */}
        {tracks.length > 0 && (
          <div>
            <p className="section-label" style={{ marginBottom: 'var(--space-md)' }}>Uploaded Tracks ({tracks.length})</p>
            <div className="admin-tracks-list">
              {tracks.map(track => (
                <div key={track.id} className="admin-track-item">
                  <div className="admin-track-icon" style={{ background: getVoiceColor(track.title) }}>
                    <FiMusic />
                  </div>
                  <div className="admin-track-info">
                    <div className="admin-track-title">{track.title}</div>
                    <div className="admin-track-meta">Audio track</div>
                  </div>
                  <a href={track.audioUrl} target="_blank" rel="noreferrer" className="admin-action-btn edit" style={{ textDecoration: 'none' }}>
                    <FiEye />
                  </a>
                  <button
                    className="admin-action-btn delete"
                    onClick={() => deleteTrack(track)}
                    disabled={deletingTrack === track.id}
                  >
                    {deletingTrack === track.id ? '...' : <FiTrash2 />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ---------- Dashboard View ---------- */
function DashboardView({ hymns }) {
  const totalTracks = hymns.reduce((s, h) => s + (h.trackCount || 0), 0);
  const withPdf = hymns.filter(h => h.pdfUrl).length;

  return (
    <div>
      <div className="admin-stats-grid">
        {[
          { icon: <FiBookOpen />, color: 'green', num: hymns.length, label: 'Total Hymns' },
          { icon: <FiHeadphones />, color: 'blue', num: totalTracks, label: 'Audio Tracks' },
          { icon: <BsFilePdf />, color: 'orange', num: withPdf, label: 'With PDF' },
          { icon: <FiUsers />, color: 'red', num: 4, label: 'Voice Parts' },
        ].map((s, i) => (
          <div key={i} className="admin-stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`admin-stat-icon ${s.color}`}>{s.icon}</div>
            <div className="admin-stat-info">
              <div className="admin-stat-num">{s.num}</div>
              <div className="admin-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3 className="admin-panel-title">Recent Hymns</h3>
        </div>
        <div className="admin-panel-body">
          {hymns.length === 0 ? (
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>No hymns yet. Add your first hymn!</p>
          ) : (
            <div className="admin-hymns-list">
              {hymns.slice(0, 5).map(h => (
                <div key={h.id} className="admin-hymn-item">
                  <div className="admin-hymn-item-icon"><FiMusic /></div>
                  <div className="admin-hymn-item-info">
                    <div className="admin-hymn-item-title">{h.title}</div>
                    <div className="admin-hymn-item-meta">
                      <span>{h.trackCount || 0} tracks</span>
                      {h.pdfUrl && <span>PDF available</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Add Hymn View ---------- */
function AddHymnView({ onAdded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Please enter a hymn title.'); return; }
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'hymns'), {
        title: title.trim(),
        description: description.trim(),
        pdfUrl: null,
        trackCount: 0,
        createdAt: serverTimestamp(),
      });
      toast.success('Hymn created successfully!');
      setTitle('');
      setDescription('');
      onAdded(docRef.id);
    } catch (err) {
      toast.error('Failed to create hymn.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3 className="admin-panel-title">Create New Hymn</h3>
      </div>
      <div className="admin-panel-body">
        <form className="add-hymn-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Hymn Title *</label>
            <div className="form-input-wrap">
              <FiMusic className="form-input-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Enter hymn title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Brief description of the hymn..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <button type="submit" className="admin-action-btn primary" style={{ alignSelf: 'flex-start', padding: '12px 24px' }} disabled={saving}>
            <FiPlus /> {saving ? 'Creating...' : 'Create Hymn'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- Manage Hymns View ---------- */
function ManageHymnsView({ hymns }) {
  const [managingHymn, setManagingHymn] = useState(null);
  const [editingHymn, setEditingHymn] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const startEdit = (hymn) => {
    setEditingHymn(hymn.id);
    setEditTitle(hymn.title);
    setEditDesc(hymn.description || '');
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'hymns', editingHymn), {
        title: editTitle.trim(),
        description: editDesc.trim(),
      });
      toast.success('Hymn updated!');
      setEditingHymn(null);
    } catch {
      toast.error('Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const deleteHymn = async (hymn) => {
    if (!window.confirm(`Delete "${hymn.title}"? This will also delete all tracks.`)) return;
    setDeleting(hymn.id);
    try {
      // delete all tracks first
      const q = query(collection(db, 'audioTracks'), where('hymnId', '==', hymn.id));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const data = d.data();
        if (data.storagePath) await deleteObject(ref(storage, data.storagePath)).catch(() => {});
        await deleteDoc(d.ref);
      }
      if (hymn.pdfStoragePath) await deleteObject(ref(storage, hymn.pdfStoragePath)).catch(() => {});
      await deleteDoc(doc(db, 'hymns', hymn.id));
      toast.success('Hymn deleted.');
    } catch {
      toast.error('Delete failed.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3 className="admin-panel-title">All Hymns ({hymns.length})</h3>
        </div>
        <div className="admin-panel-body">
          {hymns.length === 0 ? (
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>No hymns yet.</p>
          ) : (
            <div className="admin-hymns-list">
              {hymns.map(hymn => (
                <div key={hymn.id}>
                  {editingHymn === hymn.id ? (
                    <div className="admin-hymn-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <div className="form-group">
                        <label className="form-label">Title</label>
                        <div className="form-input-wrap">
                          <FiMusic className="form-input-icon" />
                          <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginTop: 'var(--space-sm)' }}>
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                        <button className="admin-action-btn primary" onClick={saveEdit} disabled={saving}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button className="admin-action-btn edit" onClick={() => setEditingHymn(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="admin-hymn-item">
                      <div className="admin-hymn-item-icon"><FiMusic /></div>
                      <div className="admin-hymn-item-info">
                        <div className="admin-hymn-item-title">{hymn.title}</div>
                        <div className="admin-hymn-item-meta">
                          <span>{hymn.trackCount || 0} tracks</span>
                          {hymn.pdfUrl && <span>PDF</span>}
                          {hymn.description && <span>{hymn.description.slice(0, 40)}{hymn.description.length > 40 ? '…' : ''}</span>}
                        </div>
                      </div>
                      <div className="admin-hymn-item-actions">
                        <button className="admin-action-btn primary" onClick={() => setManagingHymn(hymn)} title="Manage tracks/PDF">
                          <FiUpload /> Manage
                        </button>
                        <button className="admin-action-btn edit" onClick={() => startEdit(hymn)} title="Edit hymn">
                          <FiEdit3 />
                        </button>
                        <button
                          className="admin-action-btn delete"
                          onClick={() => deleteHymn(hymn)}
                          disabled={deleting === hymn.id}
                          title="Delete hymn"
                        >
                          {deleting === hymn.id ? '...' : <FiTrash2 />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {managingHymn && (
          <ManageHymnModal hymn={managingHymn} onClose={() => setManagingHymn(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- Settings View ---------- */
function SettingsView({ user }) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3 className="admin-panel-title">Settings</h3>
      </div>
      <div className="admin-panel-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: 400 }}>
          <div style={{ padding: 'var(--space-md)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--glass-border)' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', marginBottom: 4 }}>Logged in as</p>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-white)', fontWeight: 600 }}>{user?.email}</p>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            To change password or email, use the Firebase Console.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sidebar ---------- */
const NAV_ITEMS = [
  { key: 'dashboard', icon: <FiHome />, label: 'Dashboard' },
  { key: 'add', icon: <FiPlus />, label: 'Add Hymn' },
  { key: 'manage', icon: <FiList />, label: 'Manage Hymns' },
  { key: 'settings', icon: <FiSettings />, label: 'Settings' },
];

function Sidebar({ activeView, onNavigate, onLogout, open, onClose }) {
  return (
    <>
      <div className={`sidebar-overlay${open ? ' visible' : ''}`} onClick={onClose} />
      <aside className={`admin-sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><FiMusic /></div>
          <div>
            <div className="sidebar-logo-text">TUCASA TIA</div>
            <div className="sidebar-logo-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-nav-label">Navigation</p>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`sidebar-nav-item${activeView === item.key ? ' active' : ''}`}
              onClick={() => { onNavigate(item.key); onClose(); }}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <FiLogOut /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

/* ---------- Main Admin Page ---------- */
export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hymns, setHymns] = useState([]);
  const [pageTitle, setPageTitle] = useState('Dashboard');

  const titleMap = { dashboard: 'Dashboard', add: 'Add Hymn', manage: 'Manage Hymns', settings: 'Settings' };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'hymns'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setHymns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    setPageTitle(titleMap[activeView] || 'Dashboard');
  }, [activeView]);

  const handleLogout = async () => {
    await signOut(auth);
    toast.success('Signed out.');
  };

  if (user === undefined) return null; // still loading auth state

  if (!user) {
    return <AuthForm onLogin={() => {}} />;
  }

  const navigate = (view) => setActiveView(view);

  return (
    <div className="admin-layout">
      {/* Mobile toggle */}
      <button className="mobile-sidebar-toggle" onClick={() => setSidebarOpen(v => !v)}>
        {sidebarOpen ? <FiX /> : <FiMenu />}
      </button>

      <Sidebar
        activeView={activeView}
        onNavigate={navigate}
        onLogout={handleLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-topbar-title">{pageTitle}</h1>
          <div className="admin-topbar-right">
            <div className="admin-user-badge">
              <div className="admin-user-avatar">
                {user.email?.[0]?.toUpperCase()}
              </div>
              {user.email}
            </div>
          </div>
        </div>

        <div className="admin-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              {activeView === 'dashboard' && <DashboardView hymns={hymns} />}
              {activeView === 'add' && <AddHymnView onAdded={() => navigate('manage')} />}
              {activeView === 'manage' && <ManageHymnsView hymns={hymns} />}
              {activeView === 'settings' && <SettingsView user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
