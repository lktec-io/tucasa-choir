import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, onSnapshot, query, orderBy, where, getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  uploadAudio, uploadPDF,
  validateAudioFile, validatePDFFile, formatFileSize
} from '../services/cloudinary';
import { toast } from 'react-hot-toast';
import {
  FiMail, FiLock, FiLogOut, FiMenu, FiX, FiHome, FiPlus,
  FiList, FiSettings, FiMusic, FiUpload, FiTrash2, FiEdit3,
  FiEye, FiHeadphones, FiUsers, FiBookOpen, FiAlertCircle,
  FiChevronRight
} from 'react-icons/fi';
import { BsFilePdf } from 'react-icons/bs';
import '../styles/Admin.css';

/* ─── Helpers ────────────────────────────────────────────────────── */
function getVoiceColor(title = '') {
  const t = title.toLowerCase();
  if (t.includes('soprano')) return 'linear-gradient(135deg,#ff6b9d,#c44b7d)';
  if (t.includes('alto'))    return 'linear-gradient(135deg,#f5a623,#e07b10)';
  if (t.includes('tenor'))   return 'linear-gradient(135deg,#4ecdc4,#2aa198)';
  if (t.includes('bass'))    return 'linear-gradient(135deg,#4a90e2,#2d6ab4)';
  return 'var(--gradient-accent)';
}

/* ─── FileDropZone ───────────────────────────────────────────────── */
function FileDropZone({ accept, onFile, file, onClear, Icon, label, hint }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      className={`file-drop-zone${dragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
      role="button"
      tabIndex={file ? -1 : 0}
      onKeyDown={e => e.key === 'Enter' && !file && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ''; }}
      />
      {file ? (
        <div className="file-drop-selected">
          <div className="file-drop-file-icon"><Icon /></div>
          <div className="file-drop-file-meta">
            <span className="file-drop-file-name">{file.name}</span>
            <span className="file-drop-file-size">{formatFileSize(file.size)}</span>
          </div>
          <button
            className="file-drop-clear"
            onClick={e => { e.stopPropagation(); onClear(); }}
            title="Remove file"
            type="button"
          >
            <FiX />
          </button>
        </div>
      ) : (
        <div className="file-drop-empty">
          <div className="file-drop-empty-icon"><Icon /></div>
          <p className="file-drop-empty-label">{label}</p>
          <p className="file-drop-empty-hint">{hint}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Upload Progress ────────────────────────────────────────────── */
function UploadProgress({ progress, label }) {
  return (
    <div className="upload-progress-wrap">
      <div className="upload-progress-header">
        <span className="upload-progress-label">{label}</span>
        <span className="upload-progress-pct">{Math.round(progress)}%</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/* ─── Auth Form ──────────────────────────────────────────────────── */
function AuthForm() {
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
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-page">
      <motion.div
        className="admin-auth-card"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="admin-auth-logo">
          <div className="admin-auth-logo-icon"><FiMusic /></div>
          <div>
            <h2 className="admin-auth-title">Admin Access</h2>
            <p className="admin-auth-subtitle">TUCASA TIA Choir — Secure Dashboard</p>
          </div>
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

          {error && (
            <div className="form-error">
              <FiAlertCircle /> {error}
            </div>
          )}

          <button type="submit" className="form-submit-btn" disabled={loading}>
            {loading
              ? <><span className="btn-spinner" /> Authenticating...</>
              : <>Access Dashboard <FiChevronRight /></>
            }
          </button>
        </form>
      </motion.div>
    </div>
  );
}

/* ─── Manage Hymn Modal ──────────────────────────────────────────── */
function ManageHymnModal({ hymn, onClose }) {
  const [trackTitle, setTrackTitle] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [pdfProgress, setPdfProgress]   = useState(0);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingPdf, setUploadingPdf]     = useState(false);
  const [tracks, setTracks] = useState([]);
  const [deletingTrack, setDeletingTrack] = useState(null);
  const [audioError, setAudioError] = useState('');
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'audioTracks'),
      where('hymnId', '==', hymn.id),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, snap => {
      setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [hymn.id]);

  const handleAudioFileSelect = (file) => {
    const err = validateAudioFile(file);
    if (err) { toast.error(err); return; }
    setAudioError(''); setAudioFile(file);
  };

  const handlePdfFileSelect = (file) => {
    const err = validatePDFFile(file);
    if (err) { toast.error(err); return; }
    setPdfError(''); setPdfFile(file);
  };

  const handleUploadAudio = async () => {
    if (!trackTitle.trim()) { setAudioError('Track title is required.'); return; }
    const err = validateAudioFile(audioFile);
    if (err) { setAudioError(err); return; }
    setAudioError('');
    setUploadingAudio(true);
    setAudioProgress(0);
    try {
      const audioUrl = await uploadAudio(audioFile, setAudioProgress);
      await addDoc(collection(db, 'audioTracks'), {
        hymnId: hymn.id,
        title: trackTitle.trim(),
        audioUrl,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'hymns', hymn.id), { trackCount: tracks.length + 1 });
      setAudioProgress(100);
      toast.success('Track uploaded!');
      setTrackTitle(''); setAudioFile(null); setAudioProgress(0);
    } catch (err) {
      toast.error(err.message || 'Audio upload failed.');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleUploadPdf = async () => {
    const err = validatePDFFile(pdfFile);
    if (err) { setPdfError(err); return; }
    setPdfError('');
    setUploadingPdf(true); setPdfProgress(0);
    try {
      const { secure_url, public_id, original_filename } = await uploadPDF(pdfFile, setPdfProgress);
      const firestorePayload = { pdfUrl: secure_url, pdfPublicId: public_id, pdfOriginalName: original_filename };
      console.log('[Admin] Saving PDF to Firestore:', firestorePayload);
      await updateDoc(doc(db, 'hymns', hymn.id), firestorePayload);
      setPdfProgress(100);
      toast.success('PDF uploaded!');
      setPdfFile(null); setPdfProgress(0);
    } catch (err) {
      toast.error(err.message || 'PDF upload failed.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleDeleteTrack = async (track) => {
    if (!window.confirm(`Delete "${track.title}"?`)) return;
    setDeletingTrack(track.id);
    try {
      await deleteDoc(doc(db, 'audioTracks', track.id));
      await updateDoc(doc(db, 'hymns', hymn.id), { trackCount: Math.max(0, tracks.length - 1) });
      toast.success('Track deleted.');
    } catch {
      toast.error('Failed to delete track.');
    } finally {
      setDeletingTrack(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="modal-box"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        <div className="modal-header">
          <div className="modal-header-text">
            <h2 className="modal-title">{hymn.title}</h2>
            <p className="modal-subtitle">Upload tracks and sheet music</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button"><FiX /></button>
        </div>

        <div className="modal-body">
          {/* PDF Upload */}
          <div className="modal-section">
            <p className="modal-section-label"><BsFilePdf /> Sheet Music (PDF)</p>
            <FileDropZone
              accept=".pdf,application/pdf"
              onFile={handlePdfFileSelect}
              file={pdfFile}
              onClear={() => setPdfFile(null)}
              Icon={BsFilePdf}
              label="Drop PDF here or click to browse"
              hint="PDF only · max 15 MB"
            />
            {pdfError && <p className="field-error"><FiAlertCircle /> {pdfError}</p>}
            {uploadingPdf && <UploadProgress progress={pdfProgress} label="Uploading PDF..." />}
            <button
              type="button"
              className={`upload-submit-btn${uploadingPdf || !pdfFile ? ' disabled' : ''}`}
              onClick={handleUploadPdf}
              disabled={uploadingPdf || !pdfFile}
            >
              {uploadingPdf
                ? <><span className="btn-spinner" /> Uploading...</>
                : <><FiUpload /> Upload PDF</>
              }
            </button>
          </div>

          {/* Audio Track Upload */}
          <div className="modal-section">
            <p className="modal-section-label"><FiHeadphones /> Add Voice Track</p>
            <div className="form-group">
              <label className="form-label">Track Title *</label>
              <div className="form-input-wrap">
                <FiMusic className="form-input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Soprano, Alto, Tenor, Bass"
                  value={trackTitle}
                  onChange={e => setTrackTitle(e.target.value)}
                />
              </div>
            </div>
            <FileDropZone
              accept=".mp3,.wav,.m4a,audio/*"
              onFile={handleAudioFileSelect}
              file={audioFile}
              onClear={() => setAudioFile(null)}
              Icon={FiHeadphones}
              label="Drop audio file here or click to browse"
              hint="MP3, WAV, M4A · max 50 MB"
            />
            {audioError && <p className="field-error"><FiAlertCircle /> {audioError}</p>}
            {uploadingAudio && <UploadProgress progress={audioProgress} label="Uploading audio..." />}
            <button
              type="button"
              className={`upload-submit-btn${uploadingAudio || !audioFile || !trackTitle.trim() ? ' disabled' : ''}`}
              onClick={handleUploadAudio}
              disabled={uploadingAudio || !audioFile || !trackTitle.trim()}
            >
              {uploadingAudio
                ? <><span className="btn-spinner" /> Uploading...</>
                : <><FiUpload /> Upload Track</>
              }
            </button>
          </div>

          {/* Existing Tracks */}
          {tracks.length > 0 && (
            <div className="modal-section">
              <p className="modal-section-label"><FiList /> Uploaded Tracks ({tracks.length})</p>
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
                    <div className="admin-track-actions">
                      <a
                        href={track.audioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-action-btn edit icon-only"
                        title="Preview"
                      >
                        <FiEye />
                      </a>
                      <button
                        type="button"
                        className="admin-action-btn delete icon-only"
                        onClick={() => handleDeleteTrack(track)}
                        disabled={deletingTrack === track.id}
                        title="Delete"
                      >
                        {deletingTrack === track.id ? <span className="btn-spinner" /> : <FiTrash2 />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Dashboard View ─────────────────────────────────────────────── */
function DashboardView({ hymns }) {
  const totalTracks = hymns.reduce((s, h) => s + (h.trackCount || 0), 0);
  const withPdf = hymns.filter(h => h.pdfUrl).length;

  const stats = [
    { icon: <FiBookOpen />, color: 'green',  num: hymns.length, label: 'Total Hymns' },
    { icon: <FiHeadphones />, color: 'blue', num: totalTracks,  label: 'Audio Tracks' },
    { icon: <BsFilePdf />,   color: 'orange',num: withPdf,      label: 'With PDF' },
    { icon: <FiUsers />,     color: 'red',   num: 4,            label: 'Voice Parts' },
  ];

  return (
    <>
      <div className="admin-stats-grid">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            className="admin-stat-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <div className={`admin-stat-icon ${s.color}`}>{s.icon}</div>
            <div className="admin-stat-info">
              <div className="admin-stat-num">{s.num}</div>
              <div className="admin-stat-label">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3 className="admin-panel-title">Recent Hymns</h3>
        </div>
        <div className="admin-panel-body">
          {hymns.length === 0 ? (
            <div className="admin-empty-state">
              <FiMusic />
              <p>No hymns yet. Use "Add Hymn" to get started.</p>
            </div>
          ) : (
            <div className="admin-hymns-list">
              {hymns.slice(0, 6).map(h => (
                <div key={h.id} className="admin-hymn-item">
                  <div className="admin-hymn-item-icon"><FiMusic /></div>
                  <div className="admin-hymn-item-info">
                    <div className="admin-hymn-item-title">{h.title}</div>
                    <div className="admin-hymn-item-meta">
                      <span>{h.trackCount || 0} track{h.trackCount !== 1 ? 's' : ''}</span>
                      {h.pdfUrl && <span className="badge-pdf">PDF</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Add Hymn View ──────────────────────────────────────────────── */
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
      toast.success('Hymn created!');
      setTitle(''); setDescription('');
      onAdded(docRef.id);
    } catch {
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
          <button
            type="submit"
            className={`admin-action-btn primary create-btn${saving ? ' disabled' : ''}`}
            disabled={saving}
          >
            {saving ? <><span className="btn-spinner" /> Creating...</> : <><FiPlus /> Create Hymn</>}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Manage Hymns View ──────────────────────────────────────────── */
function ManageHymnsView({ hymns }) {
  const [managingHymn, setManagingHymn] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const startEdit = (hymn) => {
    setEditingId(hymn.id);
    setEditTitle(hymn.title);
    setEditDesc(hymn.description || '');
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'hymns', editingId), {
        title: editTitle.trim(),
        description: editDesc.trim(),
      });
      toast.success('Hymn updated!');
      setEditingId(null);
    } catch {
      toast.error('Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const deleteHymn = async (hymn) => {
    if (!window.confirm(`Delete "${hymn.title}"? This removes all its tracks too.`)) return;
    setDeleting(hymn.id);
    try {
      const q = query(collection(db, 'audioTracks'), where('hymnId', '==', hymn.id));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
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
          <h3 className="admin-panel-title">All Hymns</h3>
          <span className="admin-panel-count">{hymns.length}</span>
        </div>
        <div className="admin-panel-body">
          {hymns.length === 0 ? (
            <div className="admin-empty-state">
              <FiMusic />
              <p>No hymns yet. Add one first.</p>
            </div>
          ) : (
            <div className="admin-hymns-list">
              {hymns.map(hymn => (
                <div key={hymn.id} className={`admin-hymn-item${editingId === hymn.id ? ' editing' : ''}`}>
                  {editingId === hymn.id ? (
                    <div className="admin-hymn-edit-form">
                      <div className="form-group">
                        <label className="form-label">Title</label>
                        <div className="form-input-wrap">
                          <FiMusic className="form-input-icon" />
                          <input className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                      </div>
                      <div className="admin-edit-actions">
                        <button
                          type="button"
                          className={`admin-action-btn primary${saving ? ' disabled' : ''}`}
                          onClick={saveEdit}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" className="admin-action-btn edit" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-hymn-item-icon"><FiMusic /></div>
                      <div className="admin-hymn-item-info">
                        <div className="admin-hymn-item-title">{hymn.title}</div>
                        <div className="admin-hymn-item-meta">
                          <span>{hymn.trackCount || 0} track{hymn.trackCount !== 1 ? 's' : ''}</span>
                          {hymn.pdfUrl && <span className="badge-pdf">PDF</span>}
                        </div>
                      </div>
                      <div className="admin-hymn-item-actions">
                        <button
                          type="button"
                          className="admin-action-btn primary"
                          onClick={() => setManagingHymn(hymn)}
                          title="Manage tracks & PDF"
                        >
                          <FiUpload /> <span className="btn-label">Manage</span>
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn edit"
                          onClick={() => startEdit(hymn)}
                          title="Edit"
                        >
                          <FiEdit3 /> <span className="btn-label">Edit</span>
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn delete icon-only"
                          onClick={() => deleteHymn(hymn)}
                          disabled={deleting === hymn.id}
                          title="Delete"
                        >
                          {deleting === hymn.id ? <span className="btn-spinner" /> : <FiTrash2 />}
                        </button>
                      </div>
                    </>
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

/* ─── Settings View ──────────────────────────────────────────────── */
function SettingsView({ user }) {
  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3 className="admin-panel-title">Settings</h3>
      </div>
      <div className="admin-panel-body">
        <div className="settings-info-card">
          <p className="settings-info-label">Signed in as</p>
          <p className="settings-info-value">{user?.email}</p>
        </div>
        <p className="settings-help-text">
          To change your password or email, use the Firebase Console → Authentication.
        </p>
      </div>
    </div>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────── */
const NAV = [
  { key: 'dashboard', icon: <FiHome />,     label: 'Dashboard' },
  { key: 'add',       icon: <FiPlus />,     label: 'Add Hymn' },
  { key: 'manage',    icon: <FiList />,     label: 'Manage Hymns' },
  { key: 'settings',  icon: <FiSettings />, label: 'Settings' },
];

function Sidebar({ activeView, onNavigate, onLogout, open, onClose }) {
  return (
    <>
      <div
        className={`sidebar-overlay${open ? ' visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`admin-sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><FiMusic /></div>
          <div>
            <div className="sidebar-logo-text">TUCASA TIA</div>
            <div className="sidebar-logo-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          <p className="sidebar-nav-label">Navigation</p>
          {NAV.map(item => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-nav-item${activeView === item.key ? ' active' : ''}`}
              onClick={() => { onNavigate(item.key); onClose(); }}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout-btn" onClick={onLogout}>
            <FiLogOut /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── Main Admin Page ────────────────────────────────────────────── */
const TITLE_MAP = {
  dashboard: 'Dashboard', add: 'Add Hymn',
  manage: 'Manage Hymns', settings: 'Settings',
};

export default function Admin() {
  const [user, setUser]             = useState(undefined);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hymns, setHymns]           = useState([]);

  useEffect(() => onAuthStateChanged(auth, u => setUser(u || null)), []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'hymns'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setHymns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  useEffect(() => {
    const close = () => { if (window.innerWidth >= 900) setSidebarOpen(false); };
    window.addEventListener('resize', close, { passive: true });
    return () => window.removeEventListener('resize', close);
  }, []);

  if (user === undefined) return null;
  if (!user) return <AuthForm />;

  return (
    <div className="admin-layout">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={() => { signOut(auth); toast.success('Signed out.'); }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="admin-main">
        <div className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-hamburger"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <FiX /> : <FiMenu />}
            </button>
            <h1 className="admin-topbar-title">{TITLE_MAP[activeView]}</h1>
          </div>
          <div className="admin-topbar-right">
            <div className="admin-user-badge">
              <div className="admin-user-avatar">{user.email?.[0]?.toUpperCase()}</div>
              <span className="admin-user-email">{user.email}</span>
            </div>
          </div>
        </div>

        <div className="admin-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
            >
              {activeView === 'dashboard' && <DashboardView hymns={hymns} />}
              {activeView === 'add'       && <AddHymnView onAdded={() => setActiveView('manage')} />}
              {activeView === 'manage'    && <ManageHymnsView hymns={hymns} />}
              {activeView === 'settings'  && <SettingsView user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
