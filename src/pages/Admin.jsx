import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useNavigate } from 'react-router-dom';
import {
  FiMail, FiLock, FiX, FiHome, FiPlus,
  FiList, FiSettings, FiMusic, FiUpload, FiTrash2, FiEdit3,
  FiEye, FiHeadphones, FiBookOpen, FiAlertCircle,
  FiChevronRight, FiCalendar
} from 'react-icons/fi';
import { BsFilePdf } from 'react-icons/bs';
import AdminShell from '../components/AdminShell';
import { Loader } from '../components/Loader';
import { useConfirm } from '../hooks/useConfirm';
import { voiceKey, voiceLetter } from '../utils/voice';
import '../styles/Admin.css';

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
      aria-label={label}
      tabIndex={file ? -1 : 0}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && !file) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
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
            className="btn btn-danger btn-icon btn-sm"
            onClick={e => { e.stopPropagation(); onClear(); }}
            title="Remove file"
            aria-label="Remove file"
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
    <div className="upload-progress-wrap" role="status">
      <div className="upload-progress-header">
        <span className="upload-progress-label">{label}</span>
        <span className="upload-progress-pct num">{Math.round(progress)}%</span>
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="admin-auth-logo">
          <img className="admin-auth-logo-img" src="/logo-96.jpg" alt="" width="52" height="52" />
          <div>
            <h1 className="admin-auth-title">Admin Access</h1>
            <p className="admin-auth-subtitle">TUCASA TIA Choir — Secure Dashboard</p>
          </div>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">Email Address</label>
            <div className="form-input-wrap">
              <FiMail className="form-input-icon" />
              <input
                id="admin-email"
                type="email"
                className="form-input with-icon"
                placeholder="admin@tucasa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">Password</label>
            <div className="form-input-wrap">
              <FiLock className="form-input-icon" />
              <input
                id="admin-password"
                type="password"
                className="form-input with-icon"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="notice notice-error" role="alert">
              <FiAlertCircle /> {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading
              ? <><span className="spinner" /> Authenticating...</>
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
  const [confirm, confirmDialog] = useConfirm();
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

  useEffect(() => {
    // A confirm dialog open on top takes Escape for itself
    const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
      const { secure_url, public_id, original_filename, format } = await uploadPDF(pdfFile, setPdfProgress);
      const firestorePayload = { pdfUrl: secure_url, pdfPublicId: public_id, pdfOriginalName: original_filename, pdfFormat: format };
      console.log('[Admin] Saving sheet music to Firestore:', firestorePayload);
      await updateDoc(doc(db, 'hymns', hymn.id), firestorePayload);
      setPdfProgress(100);
      toast.success('Sheet music uploaded!');
      setPdfFile(null); setPdfProgress(0);
    } catch (err) {
      toast.error(err.message || 'PDF upload failed.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleDeleteTrack = async (track) => {
    const ok = await confirm({
      title: `Delete "${track.title}"?`,
      message: 'This removes the track from the hymn. This cannot be undone.',
    });
    if (!ok) return;
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-hymn-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
      >
        <div className="modal-header">
          <div className="modal-header-text">
            <h2 className="modal-title" id="manage-hymn-title">{hymn.title}</h2>
            <p className="modal-subtitle">Upload tracks and sheet music</p>
          </div>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose} type="button" aria-label="Close" autoFocus><FiX /></button>
        </div>

        <div className="modal-body">
          {/* PDF Upload */}
          <div className="modal-section">
            <p className="modal-section-label"><BsFilePdf /> Sheet Music</p>
            <FileDropZone
              accept=".pdf,application/pdf,.jpg,.jpeg,.png,image/jpeg,image/png"
              onFile={handlePdfFileSelect}
              file={pdfFile}
              onClear={() => setPdfFile(null)}
              Icon={BsFilePdf}
              label="Drop PDF or image here or click to browse"
              hint="PDF, JPG, PNG · max 20 MB"
            />
            {pdfError && <p className="field-error" role="alert"><FiAlertCircle /> {pdfError}</p>}
            {uploadingPdf && <UploadProgress progress={pdfProgress} label="Uploading..." />}
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleUploadPdf}
              disabled={uploadingPdf || !pdfFile}
            >
              {uploadingPdf
                ? <><span className="spinner" /> Uploading...</>
                : <><FiUpload /> Upload Sheet Music</>
              }
            </button>
          </div>

          {/* Audio Track Upload */}
          <div className="modal-section">
            <p className="modal-section-label"><FiHeadphones /> Add Voice Track</p>
            <div className="form-group">
              <label className="form-label" htmlFor="track-title">Track Title *</label>
              <div className="form-input-wrap">
                <FiMusic className="form-input-icon" />
                <input
                  id="track-title"
                  type="text"
                  className="form-input with-icon"
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
            {audioError && <p className="field-error" role="alert"><FiAlertCircle /> {audioError}</p>}
            {uploadingAudio && <UploadProgress progress={audioProgress} label="Uploading audio..." />}
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleUploadAudio}
              disabled={uploadingAudio || !audioFile || !trackTitle.trim()}
            >
              {uploadingAudio
                ? <><span className="spinner" /> Uploading...</>
                : <><FiUpload /> Upload Track</>
              }
            </button>
          </div>

          {/* Existing Tracks */}
          {tracks.length > 0 && (
            <div className="modal-section">
              <p className="modal-section-label"><FiList /> Uploaded Tracks (<span className="num">{tracks.length}</span>)</p>
              <div className="admin-tracks-list">
                {tracks.map(track => (
                  <div key={track.id} className="admin-track-item">
                    <div className={`voice-tile voice-fill ${voiceKey(track.title)}`} aria-hidden="true">
                      {voiceLetter(track.title)}
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
                        className="btn btn-secondary btn-icon btn-sm"
                        title="Preview"
                        aria-label={`Preview ${track.title}`}
                      >
                        <FiEye />
                      </a>
                      <button
                        type="button"
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={() => handleDeleteTrack(track)}
                        disabled={deletingTrack === track.id}
                        title="Delete"
                        aria-label={`Delete ${track.title}`}
                      >
                        {deletingTrack === track.id ? <span className="spinner" /> : <FiTrash2 />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
      {confirmDialog}
    </div>
  );
}

/* ─── Dashboard View ─────────────────────────────────────────────── */
function DashboardView({ hymns, onNavigate }) {
  const totalTracks = hymns.reduce((s, h) => s + (h.trackCount || 0), 0);
  const withPdf = hymns.filter(h => h.pdfUrl).length;

  const stats = [
    { icon: <FiBookOpen />,   tone: 'info',    num: hymns.length, label: 'Total Hymns' },
    { icon: <FiHeadphones />, tone: 'success', num: totalTracks,  label: 'Audio Tracks' },
    { icon: <BsFilePdf />,    tone: 'warning', num: withPdf,      label: 'Hymns with Sheet Music' },
  ];

  return (
    <>
      <div className="stats-grid">
        {stats.map(s => (
          <button
            key={s.label}
            type="button"
            className="stat-card"
            onClick={() => onNavigate('manage')}
          >
            <div className={`stat-icon ${s.tone}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Recent Hymns</h2>
          {hymns.length > 0 && (
            <button type="button" className="btn btn-tertiary btn-sm" onClick={() => onNavigate('manage')}>
              View all <FiChevronRight />
            </button>
          )}
        </div>
        <div className="panel-body">
          {hymns.length === 0 ? (
            <div className="inline-empty">
              <FiMusic />
              <p>No hymns yet. Use "Add Hymn" to get started.</p>
            </div>
          ) : (
            <div className="admin-hymns-list">
              {hymns.slice(0, 6).map(h => (
                <button
                  key={h.id}
                  type="button"
                  className="admin-hymn-item clickable"
                  onClick={() => onNavigate('manage', h.id)}
                >
                  <div className="admin-hymn-item-icon"><FiMusic /></div>
                  <div className="admin-hymn-item-info">
                    <div className="admin-hymn-item-title">{h.title}</div>
                    <div className="admin-hymn-item-meta">
                      <span><span className="num">{h.trackCount || 0}</span> track{h.trackCount !== 1 ? 's' : ''}</span>
                      {h.pdfUrl && <span className="badge badge-pdf">PDF</span>}
                    </div>
                  </div>
                  <FiChevronRight className="admin-hymn-item-arrow" />
                </button>
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
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Create New Hymn</h2>
      </div>
      <div className="panel-body">
        <form className="add-hymn-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="hymn-title">Hymn Title *</label>
            <div className="form-input-wrap">
              <FiMusic className="form-input-icon" />
              <input
                id="hymn-title"
                type="text"
                className="form-input with-icon"
                placeholder="Enter hymn title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="hymn-description">Description</label>
            <textarea
              id="hymn-description"
              className="form-textarea"
              placeholder="Brief description of the hymn..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary create-btn"
            disabled={saving}
          >
            {saving ? <><span className="spinner" /> Creating...</> : <><FiPlus /> Create Hymn</>}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Manage Hymns View ──────────────────────────────────────────── */
function ManageHymnsView({ hymns, highlightId }) {
  const [confirm, confirmDialog] = useConfirm();
  const [managingHymn, setManagingHymn] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const itemRefs = useRef({});

  useEffect(() => {
    if (!highlightId) return;
    const el = itemRefs.current[highlightId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlighted');
        setTimeout(() => el.classList.remove('highlighted'), 2200);
      }, 180);
    }
  }, [highlightId]);

  const closeManageModal = useCallback(() => setManagingHymn(null), []);

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
    const ok = await confirm({
      title: `Delete "${hymn.title}"?`,
      message: 'This removes the hymn and all its tracks. This cannot be undone.',
    });
    if (!ok) return;
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
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">All Hymns</h2>
          <span className="panel-count">{hymns.length}</span>
        </div>
        <div className="panel-body">
          {hymns.length === 0 ? (
            <div className="inline-empty">
              <FiMusic />
              <p>No hymns yet. Add one first.</p>
            </div>
          ) : (
            <div className="admin-hymns-list">
              {hymns.map(hymn => (
                <div
                  key={hymn.id}
                  ref={el => { if (el) itemRefs.current[hymn.id] = el; }}
                  className={`admin-hymn-item${editingId === hymn.id ? ' editing' : ''}`}
                >
                  {editingId === hymn.id ? (
                    <div className="admin-hymn-edit-form">
                      <div className="form-group">
                        <label className="form-label" htmlFor="edit-hymn-title">Title</label>
                        <div className="form-input-wrap">
                          <FiMusic className="form-input-icon" />
                          <input id="edit-hymn-title" className="form-input with-icon" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="edit-hymn-description">Description</label>
                        <textarea id="edit-hymn-description" className="form-textarea" rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                      </div>
                      <div className="admin-edit-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={saveEdit}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-hymn-item-icon"><FiMusic /></div>
                      <div className="admin-hymn-item-info">
                        <div className="admin-hymn-item-title">{hymn.title}</div>
                        <div className="admin-hymn-item-meta">
                          <span><span className="num">{hymn.trackCount || 0}</span> track{hymn.trackCount !== 1 ? 's' : ''}</span>
                          {hymn.pdfUrl && <span className="badge badge-pdf">PDF</span>}
                        </div>
                      </div>
                      <div className="admin-hymn-item-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setManagingHymn(hymn)}
                          title="Manage tracks & PDF"
                        >
                          <FiUpload /> Manage
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => startEdit(hymn)}
                          title="Edit"
                        >
                          <FiEdit3 /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => deleteHymn(hymn)}
                          disabled={deleting === hymn.id}
                          title="Delete"
                          aria-label={`Delete ${hymn.title}`}
                        >
                          {deleting === hymn.id ? <span className="spinner" /> : <FiTrash2 />}
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
          <ManageHymnModal hymn={managingHymn} onClose={closeManageModal} />
        )}
      </AnimatePresence>
      {confirmDialog}
    </>
  );
}

/* ─── Settings View ──────────────────────────────────────────────── */
function SettingsView({ user }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Settings</h2>
      </div>
      <div className="panel-body">
        <div className="settings-info-card">
          <p className="settings-info-label">Signed in as</p>
          <p className="settings-info-value">{user?.email}</p>
        </div>
        <p className="settings-help-text">
          To change your password or email, contact administrator. This panel is for managing hymns, tracks, and sheet music.
        </p>
      </div>
    </div>
  );
}

/* ─── Navigation ─────────────────────────────────────────────────── */
const NAV = [
  { key: 'dashboard', icon: <FiHome />,     label: 'Dashboard' },
  { key: 'add',       icon: <FiPlus />,     label: 'Add Hymn' },
  { key: 'manage',    icon: <FiList />,     label: 'Manage Hymns' },
  { key: 'settings',  icon: <FiSettings />, label: 'Settings' },
];

/* ─── Main Admin Page ────────────────────────────────────────────── */
const TITLE_MAP = {
  dashboard: 'Dashboard', add: 'Add Hymn',
  manage: 'Manage Hymns', settings: 'Settings',
};

export default function Admin() {
  const [user, setUser]               = useState(undefined);
  const [activeView, setActiveView]   = useState('dashboard');
  const [hymns, setHymns]             = useState([]);
  const [highlightHymnId, setHighlightHymnId] = useState(null);
  const navigate = useNavigate();

  const navigateTo = (view, hymnId = null) => {
    setHighlightHymnId(hymnId);
    setActiveView(view);
  };

  useEffect(() => onAuthStateChanged(auth, u => setUser(u || null)), []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'hymns'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setHymns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  if (user === undefined) return <div className="shell-loading"><Loader /></div>;
  if (!user) return <AuthForm />;

  return (
    <AdminShell
      title="TUCASA TIA"
      subtitle="Admin Panel"
      pageTitle={TITLE_MAP[activeView]}
      userEmail={user.email}
      nav={NAV}
      activeView={activeView}
      onNavigate={(view) => navigateTo(view)}
      onLogout={() => { signOut(auth); toast.success('Signed out.'); }}
      linksLabel="Modules"
      links={[{ icon: <FiCalendar />, label: 'Attendance', onClick: () => navigate('/admin/attendance') }]}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          {activeView === 'dashboard' && <DashboardView hymns={hymns} onNavigate={navigateTo} />}
          {activeView === 'add'       && <AddHymnView onAdded={() => navigateTo('manage')} />}
          {activeView === 'manage'    && <ManageHymnsView hymns={hymns} highlightId={highlightHymnId} />}
          {activeView === 'settings'  && <SettingsView user={user} />}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  );
}
