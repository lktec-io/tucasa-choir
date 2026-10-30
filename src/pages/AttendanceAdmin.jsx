import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, onSnapshot, query, orderBy,
  where, getDocs, limit
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  FiHome, FiUsers, FiCalendar, FiClock, FiCheck, FiX,
  FiEdit3, FiTrash2, FiPlus, FiSearch,
  FiDownload, FiShare2, FiChevronLeft, FiChevronRight,
  FiArrowLeft, FiFileText, FiBarChart2,
  FiCopy, FiCheckCircle, FiUser, FiPhone, FiMail
} from 'react-icons/fi';
import AdminShell from '../components/AdminShell';
import { Loader } from '../components/Loader';
import { useConfirm } from '../hooks/useConfirm';
import { voiceKey } from '../utils/voice';
import '../styles/Attendance.css';

/* ── Constants ─────────────────────────────────────────────────────── */
const SESSION_TYPES = ['Choir Practice', 'Sabbath Service', 'Special Program', 'Meeting', 'Evangelism', 'Other'];
const VOICE_PARTS   = ['Soprano', 'Alto', 'Tenor', 'Bass'];
const GENDERS       = ['Male', 'Female'];
const STATUSES      = ['present', 'absent', 'late', 'excused'];

/* ── Helpers ────────────────────────────────────────────────────────── */
function statusLabel(s) {
  return { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' }[s] || '—';
}
const STATUS_ICONS = { present: FiCheck, absent: FiX, late: FiClock, excused: FiFileText };
function today() {
  return new Date().toISOString().slice(0, 10);
}
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ── AttDashboard ───────────────────────────────────────────────────── */
function AttDashboard({ members, sessions, onOpenSession, onNavigate }) {
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 });
  const todayStr = today();
  const todaySessions = sessions.filter(s => s.date === todayStr);
  const latestSession = sessions[0] || null;

  useEffect(() => {
    if (!latestSession) return;
    const q = query(collection(db, 'attendanceRecords'), where('sessionId', '==', latestSession.id));
    getDocs(q).then(snap => {
      const counts = { present: 0, absent: 0, late: 0, excused: 0 };
      snap.docs.forEach(d => { const s = d.data().status; if (counts[s] !== undefined) counts[s]++; });
      setTodayStats(counts);
    });
  }, [latestSession?.id]);

  const totalRecorded = Object.values(todayStats).reduce((a, b) => a + b, 0);
  const attendanceRate = totalRecorded > 0
    ? Math.round((todayStats.present + todayStats.late) / totalRecorded * 100)
    : 0;

  const stats = [
    { icon: <FiUsers />,       tone: 'info',    num: members.length,     label: 'Total Members' },
    { icon: <FiCalendar />,    tone: 'info',    num: sessions.length,    label: 'Total Sessions' },
    { icon: <FiCheckCircle />, tone: 'success', num: todayStats.present, label: 'Present (Latest)' },
    { icon: <FiX />,           tone: 'danger',  num: todayStats.absent,  label: 'Absent (Latest)' },
    { icon: <FiClock />,       tone: 'warning', num: todayStats.late,    label: 'Late (Latest)' },
    { icon: <FiBarChart2 />,   tone: 'neutral', num: `${attendanceRate}%`, label: 'Attendance Rate' },
  ];

  return (
    <>
      <div className="stats-grid six">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.tone}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Recent Sessions</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate('sessions')}>
            View all <FiChevronRight />
          </button>
        </div>
        <div className="panel-body">
          {sessions.length === 0 ? (
            <div className="inline-empty"><FiCalendar /><p>No sessions yet. Create one to get started.</p></div>
          ) : (
            <div className="att-recent-list">
              {sessions.slice(0, 5).map(s => (
                <button
                  key={s.id}
                  type="button"
                  className="att-recent-item"
                  onClick={() => onOpenSession(s)}
                >
                  <div className="att-recent-icon"><FiCalendar /></div>
                  <div className="att-recent-info">
                    <div className="att-recent-title">{s.title}</div>
                    <div className="att-recent-meta">{s.type} · <span className="num">{formatDate(s.date)}</span></div>
                  </div>
                  <FiChevronRight />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── MembersView ────────────────────────────────────────────────────── */
function MembersView({ members }) {
  const [confirm, confirmDialog] = useConfirm();
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);

  const [form, setForm] = useState({ name: '', gender: '', voicePart: '', phone: '', email: '' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openAdd = () => { setForm({ name: '', gender: '', voicePart: '', phone: '', email: '' }); setEditMember(null); setShowForm(true); };
  const openEdit = m => { setForm({ name: m.name, gender: m.gender, voicePart: m.voicePart, phone: m.phone || '', email: m.email || '' }); setEditMember(m); setShowForm(true); };

  const handleSave = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.voicePart || !form.gender) {
      toast.error('Name, gender and voice part are required.');
      return;
    }
    setSaving(true);
    try {
      if (editMember) {
        await updateDoc(doc(db, 'members', editMember.id), {
          name: form.name.trim(),
          gender: form.gender,
          voicePart: form.voicePart,
          phone: form.phone.trim(),
          email: form.email.trim(),
        });
        toast.success('Member updated.');
      } else {
        const ref = await addDoc(collection(db, 'members'), {
          name: form.name.trim(),
          gender: form.gender,
          voicePart: form.voicePart,
          phone: form.phone.trim(),
          email: form.email.trim(),
          createdAt: serverTimestamp(),
        });
        const membershipId = 'TIA-' + ref.id.slice(0, 6).toUpperCase();
        await updateDoc(ref, { membershipId });
        toast.success('Member added.');
      }
      setShowForm(false);
    } catch {
      toast.error('Failed to save member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async m => {
    const ok = await confirm({
      title: `Delete "${m.name}"?`,
      message: 'This removes the member from the choir list. This cannot be undone.',
    });
    if (!ok) return;
    setDeleting(m.id);
    try {
      await deleteDoc(doc(db, 'members', m.id));
      toast.success('Member deleted.');
    } catch {
      toast.error('Failed to delete member.');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.membershipId || '').toLowerCase().includes(search.toLowerCase())
  );

  const voiceGroups = ['Soprano', 'Alto', 'Tenor', 'Bass'];

  return (
    <>
      <div className="att-toolbar">
        <div className="form-input-wrap att-toolbar-search">
          <FiSearch className="form-input-icon" />
          <input
            className="form-input with-icon"
            placeholder="Search members..."
            aria-label="Search members"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd}>
          <FiPlus /> Add Member
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="att-inline-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="att-inline-form-title">
              <span>{editMember ? 'Edit Member' : 'Add New Member'}</span>
              <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setShowForm(false)} aria-label="Close form"><FiX /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="member-name">Full Name *</label>
                  <div className="form-input-wrap">
                    <FiUser className="form-input-icon" />
                    <input id="member-name" className="form-input with-icon" placeholder="e.g. John Doe" value={form.name} onChange={set('name')} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="member-gender">Gender *</label>
                  <select id="member-gender" className="form-select" value={form.gender} onChange={set('gender')} required>
                    <option value="">Select gender</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="member-voice">Voice Part *</label>
                  <select id="member-voice" className="form-select" value={form.voicePart} onChange={set('voicePart')} required>
                    <option value="">Select voice part</option>
                    {VOICE_PARTS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="member-phone">Phone (optional)</label>
                  <div className="form-input-wrap">
                    <FiPhone className="form-input-icon" />
                    <input id="member-phone" className="form-input with-icon" placeholder="+255..." value={form.phone} onChange={set('phone')} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="member-email">Email (optional)</label>
                <div className="form-input-wrap">
                  <FiMail className="form-input-icon" />
                  <input id="member-email" type="email" className="form-input with-icon" placeholder="member@email.com" value={form.email} onChange={set('email')} />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving...</> : <><FiCheck /> {editMember ? 'Save Changes' : 'Add Member'}</>}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <div className="inline-empty"><FiUsers /><p>{search ? 'No members match your search.' : 'No members yet. Add the first one!'}</p></div>
      ) : (
        voiceGroups.map(vp => {
          const group = filtered.filter(m => m.voicePart === vp);
          if (!group.length) return null;
          return (
            <div key={vp} className="panel">
              <div className="panel-header">
                <h2 className="panel-title">{vp}</h2>
                <span className="panel-count">{group.length}</span>
              </div>
              <div className="panel-body">
                <div className="att-list">
                  {group.map(m => (
                    <div key={m.id} className="att-member-item">
                      <div className={`avatar voice-fill ${voiceKey(m.voicePart)}`} aria-hidden="true">
                        {initials(m.name)}
                      </div>
                      <div className="att-member-info">
                        <div className="att-member-name">{m.name}</div>
                        <div className="att-member-meta">
                          <span>{m.gender}</span>
                          {m.membershipId && <span className="att-member-id num">{m.membershipId}</span>}
                          {m.phone && <span className="num">{m.phone}</span>}
                        </div>
                      </div>
                      <div className="att-member-actions">
                        <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(m)} title="Edit" aria-label={`Edit ${m.name}`}><FiEdit3 /></button>
                        <button type="button" className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(m)} disabled={deleting === m.id} title="Delete" aria-label={`Delete ${m.name}`}>
                          {deleting === m.id ? <span className="spinner" /> : <FiTrash2 />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })
      )}
      {confirmDialog}
    </>
  );
}

/* ── SessionsView ───────────────────────────────────────────────────── */
function SessionsView({ sessions, onOpenSession }) {
  const [confirm, confirmDialog] = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ title: '', type: '', date: today(), time: '', description: '' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async e => {
    e.preventDefault();
    if (!form.title.trim() || !form.type || !form.date) {
      toast.error('Title, type and date are required.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'attendanceSessions'), {
        title: form.title.trim(),
        type: form.type,
        date: form.date,
        time: form.time,
        description: form.description.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success('Session created!');
      setForm({ title: '', type: '', date: today(), time: '', description: '' });
      setShowForm(false);
    } catch {
      toast.error('Failed to create session.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async s => {
    const ok = await confirm({
      title: `Delete session "${s.title}"?`,
      message: 'All attendance records for this session will also be deleted. This cannot be undone.',
    });
    if (!ok) return;
    setDeleting(s.id);
    try {
      const q = query(collection(db, 'attendanceRecords'), where('sessionId', '==', s.id));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'attendanceSessions', s.id));
      toast.success('Session deleted.');
    } catch {
      toast.error('Failed to delete session.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="att-toolbar att-toolbar-end">
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          <FiPlus /> New Session
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="att-inline-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="att-inline-form-title">
              <span>Create Attendance Session</span>
              <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setShowForm(false)} aria-label="Close form"><FiX /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="session-title">Session Title *</label>
                  <input id="session-title" className="form-input" placeholder="e.g. Sunday Rehearsal" value={form.title} onChange={set('title')} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="session-type">Session Type *</label>
                  <select id="session-type" className="form-select" value={form.type} onChange={set('type')} required>
                    <option value="">Select type</option>
                    {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="session-date">Date *</label>
                  <input id="session-date" type="date" className="form-input num" value={form.date} onChange={set('date')} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="session-time">Time</label>
                  <input id="session-time" type="time" className="form-input num" value={form.time} onChange={set('time')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="session-description">Description (optional)</label>
                <textarea id="session-description" className="form-textarea" placeholder="Notes about this session..." value={form.description} onChange={set('description')} rows={2} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Creating...</> : <><FiPlus /> Create Session</>}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {sessions.length === 0 ? (
        <div className="inline-empty"><FiCalendar /><p>No sessions yet. Create one above.</p></div>
      ) : (
        <div className="att-sessions-grid">
          {sessions.map(s => (
            <div key={s.id} className="att-session-card">
              <div className="att-session-card-header">
                <span className="badge"><FiCalendar />{s.type}</span>
                <button
                  type="button"
                  className="btn btn-danger btn-icon btn-sm att-session-delete"
                  onClick={() => handleDelete(s)}
                  disabled={deleting === s.id}
                  title="Delete session"
                  aria-label={`Delete session ${s.title}`}
                >
                  {deleting === s.id ? <span className="spinner" /> : <FiTrash2 />}
                </button>
              </div>
              <button type="button" className="att-session-title" onClick={() => onOpenSession(s)}>
                {s.title}
              </button>
              <div className="att-session-date">
                <FiClock />
                <span className="num">{formatDate(s.date)}{s.time ? ` · ${s.time}` : ''}</span>
              </div>
              <div className="att-session-footer">
                <span className="att-session-stat"><FiUsers /> Record attendance</span>
                <span className="att-session-open-btn" aria-hidden="true">Open <FiChevronRight /></span>
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmDialog}
    </>
  );
}

/* ── RecordAttendance ───────────────────────────────────────────────── */
function RecordAttendance({ session, members, onBack }) {
  const [records, setRecords]   = useState({}); // { memberId: { id, status } }
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch]     = useState('');
  const [filterVoice, setFilterVoice] = useState('');
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'attendanceRecords'), where('sessionId', '==', session.id));
    getDocs(q).then(snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.data().memberId] = { id: d.id, status: d.data().status }; });
      setRecords(map);
      setLoaded(true);
    });
  }, [session.id]);

  const markAttendance = useCallback(async (member, status) => {
    const prev = records[member.id];
    if (prev?.status === status) return; // no change
    setSavingId(member.id);
    setRecords(r => ({ ...r, [member.id]: { ...(r[member.id] || {}), status } }));
    try {
      if (prev?.id) {
        await updateDoc(doc(db, 'attendanceRecords', prev.id), {
          status,
          memberName: member.name,
          memberVoicePart: member.voicePart,
          sessionTitle: session.title,
          sessionType: session.type,
          sessionDate: session.date,
          timestamp: serverTimestamp(),
        });
      } else {
        const ref = await addDoc(collection(db, 'attendanceRecords'), {
          memberId: member.id,
          sessionId: session.id,
          memberName: member.name,
          memberVoicePart: member.voicePart,
          sessionTitle: session.title,
          sessionType: session.type,
          sessionDate: session.date,
          status,
          timestamp: serverTimestamp(),
        });
        setRecords(r => ({ ...r, [member.id]: { id: ref.id, status } }));
      }
    } catch {
      toast.error('Failed to save. Try again.');
      setRecords(r => ({ ...r, [member.id]: prev || {} }));
    } finally {
      setSavingId(null);
    }
  }, [records, session]);

  const markAll = async (status) => {
    for (const m of members) {
      await markAttendance(m, status);
    }
    toast.success(`All members marked as ${status}.`);
  };

  const filtered = members.filter(m => {
    const nameMatch = m.name.toLowerCase().includes(search.toLowerCase());
    const voiceMatch = !filterVoice || m.voicePart === filterVoice;
    return nameMatch && voiceMatch;
  });

  const summary = STATUSES.reduce((acc, s) => {
    acc[s] = Object.values(records).filter(r => r.status === s).length;
    return acc;
  }, {});
  const unmarked = members.length - Object.keys(records).filter(id => records[id]?.status).length;

  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm att-back-link" onClick={onBack}>
        <FiArrowLeft /> Back to Sessions
      </button>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{session.title}</h2>
            <div className="panel-subtitle">
              {session.type} · <span className="num">{formatDate(session.date)}{session.time ? ` · ${session.time}` : ''}</span>
            </div>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => markAll('present')}>
            <FiCheck /> All Present
          </button>
        </div>
        <div className="panel-body">
          <div className="att-summary-bar">
            <span className="att-summary-chip present"><span className="dot"/><span className="num">{summary.present}</span> Present</span>
            <span className="att-summary-chip absent"><span className="dot"/><span className="num">{summary.absent}</span> Absent</span>
            <span className="att-summary-chip late"><span className="dot"/><span className="num">{summary.late}</span> Late</span>
            <span className="att-summary-chip excused"><span className="dot"/><span className="num">{summary.excused}</span> Excused</span>
            {unmarked > 0 && <span className="att-summary-unmarked"><span className="num">{unmarked}</span> unmarked</span>}
          </div>

          <div className="att-record-toolbar">
            <div className="form-input-wrap att-toolbar-search">
              <FiSearch className="form-input-icon" />
              <input
                className="form-input with-icon"
                placeholder="Search member..."
                aria-label="Search member"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="form-select att-filter" aria-label="Filter by voice part" value={filterVoice} onChange={e => setFilterVoice(e.target.value)}>
              <option value="">All voices</option>
              {VOICE_PARTS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {!loaded ? (
            <Loader text="Loading records..." />
          ) : filtered.length === 0 ? (
            <div className="inline-empty"><FiUsers /><p>No members found.</p></div>
          ) : (
            <div className="att-record-list">
              {filtered.map(m => {
                const rec = records[m.id];
                const status = rec?.status || null;
                const isSaving = savingId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`att-record-row${status ? ` ${status}-row` : ''}`}
                  >
                    <div className="att-record-member">
                      <div className={`avatar voice-fill ${voiceKey(m.voicePart)}`} aria-hidden="true">
                        {initials(m.name)}
                      </div>
                      <div className="att-record-text">
                        <div className="att-record-name">{m.name}</div>
                        <div className="att-record-voice">{m.voicePart}</div>
                      </div>
                    </div>
                    <div className="att-status-btns">
                      {STATUSES.map(s => {
                        const Icon = STATUS_ICONS[s];
                        return (
                          <button
                            key={s}
                            type="button"
                            title={statusLabel(s)}
                            aria-label={`Mark ${m.name} ${statusLabel(s).toLowerCase()}`}
                            aria-pressed={status === s}
                            className={`att-status-btn ${s}${status === s ? ' active' : ''}${isSaving ? ' saving' : ''}`}
                            onClick={() => !isSaving && markAttendance(m, s)}
                            disabled={isSaving}
                          >
                            {isSaving && status === s ? <span className="spinner" /> : <Icon />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── HistoryView ────────────────────────────────────────────────────── */
function HistoryView({ members, sessions }) {
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterMember, setFilterMember] = useState('');
  const [filterVoice, setFilterVoice]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate]     = useState('');
  const [page, setPage]           = useState(1);
  const PER_PAGE = 20;

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'attendanceRecords'),
      orderBy('timestamp', 'desc'),
      limit(500)
    );
    const unsub = onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = records.filter(r => {
    if (filterMember && r.memberId !== filterMember) return false;
    if (filterVoice  && r.memberVoicePart !== filterVoice) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterDate   && r.sessionDate !== filterDate) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const resetFilters = () => { setFilterMember(''); setFilterVoice(''); setFilterStatus(''); setFilterDate(''); setPage(1); };

  return (
    <>
      <div className="att-filters">
        <select className="form-select att-filter" aria-label="Filter by member" value={filterMember} onChange={e => { setFilterMember(e.target.value); setPage(1); }}>
          <option value="">All Members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="form-select att-filter" aria-label="Filter by voice part" value={filterVoice} onChange={e => { setFilterVoice(e.target.value); setPage(1); }}>
          <option value="">All Voices</option>
          {VOICE_PARTS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="form-select att-filter" aria-label="Filter by status" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <input
          type="date"
          className="form-input att-filter num"
          aria-label="Filter by date"
          value={filterDate}
          onChange={e => { setFilterDate(e.target.value); setPage(1); }}
        />
        {(filterMember || filterVoice || filterStatus || filterDate) && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
            <FiX /> Clear
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Attendance Records</h2>
          <span className="panel-count">{filtered.length}</span>
        </div>
        <div>
          {loading ? (
            <Loader text="Loading records..." />
          ) : paged.length === 0 ? (
            <div className="inline-empty"><FiFileText /><p>No records match your filters.</p></div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Voice Part</th>
                      <th>Session</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(r => (
                      <tr key={r.id}>
                        <td data-label="Member" className="cell-strong">{r.memberName || '—'}</td>
                        <td data-label="Voice Part"><span className={`voice-badge ${voiceKey(r.memberVoicePart || '')}`}>{r.memberVoicePart || '—'}</span></td>
                        <td data-label="Session">{r.sessionTitle || '—'}</td>
                        <td data-label="Date" className="cell-date">{r.sessionDate ? formatDate(r.sessionDate) : '—'}</td>
                        <td data-label="Status"><span className={`status-badge ${r.status}`}>{statusLabel(r.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button type="button" className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1} aria-label="Previous page"><FiChevronLeft /></button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
                    if (p < 1 || p > totalPages) return null;
                    return <button key={p} type="button" className={`page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)} aria-label={`Page ${p}`} aria-current={page === p ? 'page' : undefined}>{p}</button>;
                  })}
                  <button type="button" className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages} aria-label="Next page"><FiChevronRight /></button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ── ReportsView ────────────────────────────────────────────────────── */
function ReportsView({ sessions, members }) {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [generating, setGenerating] = useState('');

  const session = sessions.find(s => s.id === selectedSessionId) || null;

  const getSessionRecords = async () => {
    if (!session) return [];
    const q = query(collection(db, 'attendanceRecords'), where('sessionId', '==', session.id));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  };

  const buildRows = (records) => {
    const recMap = {};
    records.forEach(r => { recMap[r.memberId] = r.status; });
    return members.map(m => ({
      name: m.name,
      voicePart: m.voicePart,
      gender: m.gender,
      status: statusLabel(recMap[m.id] || 'absent'),
      statusRaw: recMap[m.id] || 'absent',
    }));
  };

  const exportPDF = async () => {
    if (!session) { toast.error('Please select a session.'); return; }
    setGenerating('pdf');
    try {
      const records = await getSessionRecords();
      const rows = buildRows(records);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFillColor(26, 74, 46);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('TUCASA TIA CHOIR', 105, 13, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Attendance Report', 105, 22, { align: 'center' });

      doc.setTextColor(30, 61, 42);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text(session.title, 14, 42);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(90, 138, 106);
      doc.text(`${session.type}  ·  ${formatDate(session.date)}${session.time ? '  ·  ' + session.time : ''}`, 14, 49);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 55);

      const present  = rows.filter(r => r.statusRaw === 'present').length;
      const absent   = rows.filter(r => r.statusRaw === 'absent').length;
      const late     = rows.filter(r => r.statusRaw === 'late').length;
      const excused  = rows.filter(r => r.statusRaw === 'excused').length;
      const rate     = rows.length > 0 ? Math.round((present + late) / rows.length * 100) : 0;

      doc.setFillColor(240, 248, 244);
      doc.roundedRect(14, 60, 182, 20, 2, 2, 'F');
      doc.setTextColor(30, 61, 42);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      const summaryX = [20, 56, 92, 128, 164];
      const summaryLabels = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'RATE'];
      const summaryVals   = [present, absent, late, excused, `${rate}%`];
      summaryLabels.forEach((l, i) => {
        doc.text(l, summaryX[i], 67);
        doc.setFontSize(11);
        doc.text(String(summaryVals[i]), summaryX[i], 74);
        doc.setFontSize(8);
      });

      autoTable(doc, {
        startY: 86,
        head: [['#', 'Member Name', 'Voice Part', 'Gender', 'Status']],
        body: rows.map((r, i) => [i + 1, r.name, r.voicePart, r.gender, r.status]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [26, 74, 46], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 252, 248] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          4: { fontStyle: 'bold' },
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            const s = rows[data.row.index]?.statusRaw;
            const colors = { present: [76,175,125], absent: [248,113,113], late: [245,158,11], excused: [96,165,250] };
            if (colors[s]) doc.setTextColor(...colors[s]);
          }
        },
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`TUCASA TIA Choir  ·  Page ${i} of ${pageCount}`, 105, 292, { align: 'center' });
      }

      doc.save(`attendance_${session.title.replace(/\s+/g, '_')}_${session.date}.pdf`);
      toast.success('PDF downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF.');
    } finally {
      setGenerating('');
    }
  };

  const exportExcel = async () => {
    if (!session) { toast.error('Please select a session.'); return; }
    setGenerating('excel');
    try {
      const records = await getSessionRecords();
      const rows = buildRows(records);

      const data = rows.map((r, i) => ({
        '#': i + 1,
        'Member Name': r.name,
        'Voice Part': r.voicePart,
        'Gender': r.gender,
        'Status': r.status,
        'Session': session.title,
        'Session Type': session.type,
        'Date': session.date,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 24 }, { wch: 16 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `attendance_${session.title.replace(/\s+/g, '_')}_${session.date}.xlsx`);
      toast.success('Excel downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate Excel.');
    } finally {
      setGenerating('');
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/attendance`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => toast.error('Copy failed.'));
  };

  return (
    <>
      <div className="att-session-select-wrap">
        <label htmlFor="report-session">Select Session to Export</label>
        <select id="report-session" className="form-select" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
          <option value="">— Choose a session —</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.title} · {formatDate(s.date)}</option>
          ))}
        </select>
      </div>

      <div className="att-reports-grid">
        <div className="att-report-card">
          <div className="att-report-card-icon pdf"><FiFileText /></div>
          <div className="att-report-card-title">PDF Report</div>
          <div className="att-report-card-desc">Generate a professional PDF with member list, attendance status and summary statistics.</div>
          <button type="button" className="btn btn-primary" onClick={exportPDF} disabled={!!generating || !selectedSessionId}>
            {generating === 'pdf' ? <><span className="spinner" /> Generating...</> : <><FiDownload /> Download PDF</>}
          </button>
        </div>

        <div className="att-report-card">
          <div className="att-report-card-icon excel"><FiFileText /></div>
          <div className="att-report-card-title">Excel Report</div>
          <div className="att-report-card-desc">Export attendance data as an XLSX spreadsheet for further analysis or record keeping.</div>
          <button type="button" className="btn btn-primary" onClick={exportExcel} disabled={!!generating || !selectedSessionId}>
            {generating === 'excel' ? <><span className="spinner" /> Generating...</> : <><FiDownload /> Download Excel</>}
          </button>
        </div>

        <div className="att-report-card">
          <div className="att-report-card-icon share"><FiShare2 /></div>
          <div className="att-report-card-title">Member Portal</div>
          <div className="att-report-card-desc">Share the public attendance portal link where members can view their own attendance history.</div>
          <button type="button" className="btn btn-secondary" onClick={copyLink}>
            <FiCopy /> Copy Portal Link
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Navigation ─────────────────────────────────────────────────────── */
const ATT_NAV = [
  { key: 'dashboard', icon: <FiHome />,      label: 'Dashboard' },
  { key: 'members',   icon: <FiUsers />,     label: 'Members' },
  { key: 'sessions',  icon: <FiCalendar />,  label: 'Sessions' },
  { key: 'history',   icon: <FiFileText />,  label: 'History' },
  { key: 'reports',   icon: <FiBarChart2 />, label: 'Reports' },
];

/* ── Main ───────────────────────────────────────────────────────────── */
const TITLE_MAP = {
  dashboard: 'Dashboard',
  members:   'Members',
  sessions:  'Sessions',
  history:   'Attendance History',
  reports:   'Reports & Export',
  'record':  'Record Attendance',
};

export default function AttendanceAdmin() {
  const [user, setUser]               = useState(undefined);
  const [activeView, setActiveView]   = useState('dashboard');
  const [members, setMembers]         = useState([]);
  const [sessions, setSessions]       = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => onAuthStateChanged(auth, u => setUser(u || null)), []);

  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, 'members'), orderBy('createdAt', 'asc'));
    const q2 = query(collection(db, 'attendanceSessions'), orderBy('createdAt', 'desc'));
    const unsub1 = onSnapshot(q1, snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub2 = onSnapshot(q2, snap => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsub1(); unsub2(); };
  }, [user]);

  useEffect(() => {
    if (user === null) navigate('/admin');
  }, [user, navigate]);

  if (user === undefined) return <div className="shell-loading"><Loader /></div>;
  if (!user) return null;

  const openSession = (session) => {
    setSelectedSession(session);
    setActiveView('record');
  };

  const handleLogout = () => { signOut(auth); toast.success('Signed out.'); navigate('/admin'); };

  const currentTitle = activeView === 'record' && selectedSession
    ? selectedSession.title
    : (TITLE_MAP[activeView] || 'Attendance');

  return (
    <AdminShell
      title="Attendance"
      subtitle="TUCASA TIA Choir"
      pageTitle={currentTitle}
      userEmail={user.email}
      nav={ATT_NAV}
      activeView={activeView}
      onNavigate={v => { setActiveView(v); setSelectedSession(null); }}
      onLogout={handleLogout}
      linksLabel="Modules"
      links={[{ icon: <FiArrowLeft />, label: 'Back to Admin', onClick: () => navigate('/admin') }]}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView === 'record' ? `record-${selectedSession?.id}` : activeView}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          {activeView === 'dashboard' && (
            <AttDashboard
              members={members}
              sessions={sessions}
              onOpenSession={openSession}
              onNavigate={v => setActiveView(v)}
            />
          )}
          {activeView === 'members' && <MembersView members={members} />}
          {activeView === 'sessions' && <SessionsView sessions={sessions} onOpenSession={openSession} />}
          {activeView === 'record' && selectedSession && (
            <RecordAttendance
              session={selectedSession}
              members={members}
              onBack={() => setActiveView('sessions')}
            />
          )}
          {activeView === 'history' && <HistoryView members={members} sessions={sessions} />}
          {activeView === 'reports' && <ReportsView sessions={sessions} members={members} />}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  );
}
