import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FiSearch, FiCalendar, FiUser, FiBarChart2, FiCheckCircle, FiX, FiClock, FiFileText } from 'react-icons/fi';
import '../styles/Attendance.css';

const STATUSES = ['present', 'absent', 'late', 'excused'];

function statusLabel(s) {
  return { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' }[s] || '—';
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function voiceClass(vp = '') { return 'att-voice-' + vp.toLowerCase(); }
function voiceColor(vp = '') {
  const v = vp.toLowerCase();
  if (v === 'soprano') return 'linear-gradient(135deg,#ff6b9d,#c44b7d)';
  if (v === 'alto')    return 'linear-gradient(135deg,#f5a623,#e07b10)';
  if (v === 'tenor')   return 'linear-gradient(135deg,#4ecdc4,#2aa198)';
  if (v === 'bass')    return 'linear-gradient(135deg,#4a90e2,#2d6ab4)';
  return 'var(--gradient-accent)';
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AttendancePortal() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching]     = useState(false);
  const [member, setMember]           = useState(null);
  const [records, setRecords]         = useState([]);
  const [notFound, setNotFound]       = useState(false);
  const [error, setError]             = useState('');

  const handleSearch = async e => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setMember(null);
    setRecords([]);
    setNotFound(false);
    setError('');

    try {
      const snap = await getDocs(collection(db, 'members'));
      const allMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const found = allMembers.find(m =>
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        (m.membershipId || '').toLowerCase() === q.toLowerCase()
      );

      if (!found) {
        setNotFound(true);
        return;
      }

      setMember(found);

      const rSnap = await getDocs(
        query(collection(db, 'attendanceRecords'), where('memberId', '==', found.id), orderBy('timestamp', 'desc'))
      );
      setRecords(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const stats = records.length > 0 ? {
    total:    records.length,
    present:  records.filter(r => r.status === 'present').length,
    absent:   records.filter(r => r.status === 'absent').length,
    late:     records.filter(r => r.status === 'late').length,
    excused:  records.filter(r => r.status === 'excused').length,
    rate:     Math.round(records.filter(r => r.status === 'present' || r.status === 'late').length / records.length * 100),
  } : null;

  return (
    <div className="att-portal-page">
      <div className="att-portal-header">
        <div className="att-portal-icon"><FiBarChart2 /></div>
        <h1 className="att-portal-title">My Attendance</h1>
        <p className="att-portal-subtitle">Search by your name or membership ID to view your attendance history.</p>
      </div>

      <div className="att-portal-card">
        <p className="att-portal-search-title">Search Your Record</p>
        <form onSubmit={handleSearch}>
          <div className="att-form-group">
            <label className="att-form-label">Full Name or Membership ID</label>
            <div className="att-form-input-wrap">
              <FiSearch className="att-form-input-icon" />
              <input
                className="att-form-input with-icon"
                placeholder="e.g. John Doe or TIA-ABC123"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="att-btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={searching}>
            {searching ? <><span className="att-spinner" /> Searching...</> : <><FiSearch /> Search</>}
          </button>
        </form>

        {notFound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiX /> No member found with that name or ID. Please check your input and try again.
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: '0.85rem' }}
          >
            {error}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {member && (
          <motion.div
            className="att-portal-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Member header */}
            <div className="att-portal-member-header">
              <div className="att-portal-member-avatar" style={{ background: voiceColor(member.voicePart) }}>
                {initials(member.name)}
              </div>
              <div>
                <div className="att-portal-member-name">{member.name}</div>
                <div className="att-portal-member-meta">
                  <span className={`att-voice-badge ${voiceClass(member.voicePart)}`}>{member.voicePart}</span>
                  &nbsp;· {member.gender}
                  {member.membershipId && <>&nbsp;· <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{member.membershipId}</span></>}
                </div>
              </div>
            </div>

            {/* Stats */}
            {stats ? (
              <>
                <div className="att-stats-grid" style={{ marginBottom: '24px' }}>
                  {[
                    { icon: <FiCalendar />,    color: 'blue',   num: stats.total,   label: 'Total Sessions' },
                    { icon: <FiCheckCircle />, color: 'green',  num: stats.present, label: 'Present' },
                    { icon: <FiX />,           color: 'red',    num: stats.absent,  label: 'Absent' },
                    { icon: <FiClock />,       color: 'amber',  num: stats.late,    label: 'Late' },
                    { icon: <FiFileText />,    color: 'purple', num: stats.excused, label: 'Excused' },
                    { icon: <FiBarChart2 />,   color: 'green',  num: `${stats.rate}%`, label: 'Attendance Rate' },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      className="att-stat-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className={`att-stat-icon ${s.color}`}>{s.icon}</div>
                      <div>
                        <div className="att-stat-num">{s.num}</div>
                        <div className="att-stat-label">{s.label}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* History table */}
                <div className="att-panel">
                  <div className="att-panel-header">
                    <span className="att-panel-title">Attendance History</span>
                    <span className="att-panel-count">{records.length}</span>
                  </div>
                  <div className="att-table-wrap">
                    <table className="att-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Session</th>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r, i) => (
                          <tr key={r.id}>
                            <td style={{ color: 'var(--color-text-dim)', textAlign: 'center' }}>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{r.sessionTitle || '—'}</td>
                            <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{r.sessionType || '—'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{r.sessionDate ? formatDate(r.sessionDate) : '—'}</td>
                            <td><span className={`att-status-badge ${r.status}`}>{statusLabel(r.status)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="att-panel">
                <div className="att-panel-body">
                  <div className="att-empty">
                    <FiCalendar />
                    <p>No attendance records found for <strong>{member.name}</strong> yet.</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
