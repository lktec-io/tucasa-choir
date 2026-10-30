import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FiSearch, FiCalendar, FiBarChart2, FiCheckCircle, FiX, FiClock, FiFileText, FiAlertCircle } from 'react-icons/fi';
import { voiceKey } from '../utils/voice';
import '../styles/Attendance.css';

function statusLabel(s) {
  return { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' }[s] || '—';
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
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
        <h1 className="att-portal-title">My Attendance</h1>
        <p className="att-portal-subtitle">Search by your name or membership ID to view your attendance history.</p>
      </div>

      <div className="att-portal-card">
                <form className="form-stack" onSubmit={handleSearch}>
          <div className="form-group">
            <label className="form-label" htmlFor="portal-search">Full Name or Membership ID</label>
            <div className="form-input-wrap">
              <FiSearch className="form-input-icon" />
              <input
                id="portal-search"
                className="form-input with-icon"
                placeholder="e.g. John Doe or TIA-ABC123"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={searching}>
            {searching ? <><span className="spinner" /> Searching...</> : <><FiSearch /> Search</>}
          </button>
        </form>

        {notFound && (
          <div className="notice notice-error att-portal-notice" role="alert">
            <FiX /> No member found with that name or ID. Please check your input and try again.
          </div>
        )}
        {error && (
          <div className="notice notice-error att-portal-notice" role="alert">
            <FiAlertCircle /> {error}
          </div>
        )}
      </div>

      <AnimatePresence>
        {member && (
          <motion.div
            className="att-portal-results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Member header */}
            <div className="att-portal-member-header">
              <div className={`avatar lg voice-fill ${voiceKey(member.voicePart)}`} aria-hidden="true">
                {initials(member.name)}
              </div>
              <div>
                <h2 className="att-portal-member-name">{member.name}</h2>
                <div className="att-portal-member-meta">
                  <span className={`voice-badge ${voiceKey(member.voicePart)}`}>{member.voicePart}</span>
                  <span>{member.gender}</span>
                  {member.membershipId && <span className="num">{member.membershipId}</span>}
                </div>
              </div>
            </div>

            {/* Stats */}
            {stats ? (
              <>
                <div className="stats-grid six">
                  {[
                    { icon: <FiCalendar />,    tone: 'info',    num: stats.total,   label: 'Total Sessions' },
                    { icon: <FiCheckCircle />, tone: 'success', num: stats.present, label: 'Present' },
                    { icon: <FiX />,           tone: 'danger',  num: stats.absent,  label: 'Absent' },
                    { icon: <FiClock />,       tone: 'warning', num: stats.late,    label: 'Late' },
                    { icon: <FiFileText />,    tone: 'info',    num: stats.excused, label: 'Excused' },
                    { icon: <FiBarChart2 />,   tone: 'success', num: `${stats.rate}%`, label: 'Attendance Rate' },
                  ].map(s => (
                    <div key={s.label} className="stat-card">
                      <div className={`stat-icon ${s.tone}`}>{s.icon}</div>
                      <div className="stat-info">
                        <div className="stat-num">{s.num}</div>
                        <div className="stat-label">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* History table */}
                <div className="panel">
                  <div className="panel-header">
                    <h2 className="panel-title">Attendance History</h2>
                    <span className="panel-count">{records.length}</span>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
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
                            <td data-label="#" className="cell-muted num">{i + 1}</td>
                            <td data-label="Session" className="cell-strong">{r.sessionTitle || '—'}</td>
                            <td data-label="Type" className="cell-muted">{r.sessionType || '—'}</td>
                            <td data-label="Date" className="cell-date">{r.sessionDate ? formatDate(r.sessionDate) : '—'}</td>
                            <td data-label="Status"><span className={`status-badge ${r.status}`}>{statusLabel(r.status)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="panel">
                <div className="panel-body">
                  <div className="inline-empty">
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
