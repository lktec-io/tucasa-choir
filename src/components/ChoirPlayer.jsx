import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiPlay, FiPause, FiSquare, FiVolume2, FiVolume1,
  FiVolumeX, FiUsers, FiCheck
} from 'react-icons/fi';
import '../styles/ChoirPlayer.css';

/* ── helpers ─────────────────────────────────────────────────────────── */
function getVoiceInfo(title = '') {
  const t = title.toLowerCase();
  if (t.includes('soprano')) return { label: 'S', letter: 'Soprano', bg: 'linear-gradient(135deg,#ff6b9d,#c44b7d)', color: '#ff6b9d', check: '#ff6b9d' };
  if (t.includes('alto'))    return { label: 'A', letter: 'Alto',    bg: 'linear-gradient(135deg,#f5a623,#e07b10)', color: '#f5a623', check: '#f5a623' };
  if (t.includes('tenor'))   return { label: 'T', letter: 'Tenor',   bg: 'linear-gradient(135deg,#4ecdc4,#2aa198)', color: '#4ecdc4', check: '#4ecdc4' };
  if (t.includes('bass'))    return { label: 'B', letter: 'Bass',    bg: 'linear-gradient(135deg,#4a90e2,#2d6ab4)', color: '#4a90e2', check: '#4a90e2' };
  return { label: '♪', letter: title, bg: 'var(--gradient-accent)', color: '#4caf7d', check: '#4caf7d' };
}

function formatTime(s) {
  if (!s || isNaN(s) || s === Infinity) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Waveform bar colors cycle through voice parts
const BAR_COLORS = ['#ff6b9d', '#f5a623', '#4ecdc4', '#4a90e2'];

/* ── component ───────────────────────────────────────────────────────── */
export default function ChoirPlayer({ tracks, stopSignal = 0, stopOthers }) {
  // ── voice enable/disable ──────────────────────────────────────────
  const [enabled, setEnabled] = useState(() => new Set(tracks.map(t => t.id)));

  // ── playback state ────────────────────────────────────────────────
  const [playerState, setPlayerState] = useState('stopped'); // 'stopped'|'playing'|'paused'
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);

  // ── internal refs ─────────────────────────────────────────────────
  const audiosRef  = useRef({}); // { [trackId]: HTMLAudioElement }
  const timerRef   = useRef(null);
  const primaryRef = useRef(null); // reference audio for time/duration tracking
  const mountedRef = useRef(true);

  // ── build Audio objects once on mount ─────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    tracks.forEach(t => {
      const audio = new Audio(t.audioUrl);
      audio.preload = 'metadata';
      audio.volume  = volume;
      audiosRef.current[t.id] = audio;

      audio.addEventListener('loadedmetadata', () => {
        if (mountedRef.current) {
          // pick the track with the longest duration as the reference
          setDuration(prev => Math.max(prev, audio.duration || 0));
        }
      });
    });

    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
      Object.values(audiosRef.current).forEach(a => {
        a.pause();
        a.onended = null;
        // release src so browser can GC the decode buffer
        a.src = '';
      });
      audiosRef.current = {};
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount; tracks won't change identity

  // ── sync volume to all audio objects ─────────────────────────────
  useEffect(() => {
    Object.values(audiosRef.current).forEach(a => { a.volume = volume; });
  }, [volume]);

  // ── stop choir when an individual card starts playing ─────────────
  const isFirstStopSignal = useRef(true);
  useEffect(() => {
    if (isFirstStopSignal.current) { isFirstStopSignal.current = false; return; }
    doStop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopSignal]);

  // ── internal helpers ─────────────────────────────────────────────
  const getEnabledAudios = useCallback(() =>
    tracks
      .filter(t => enabled.has(t.id))
      .map(t => audiosRef.current[t.id])
      .filter(Boolean),
  [tracks, enabled]);

  const stopTimer = () => clearInterval(timerRef.current);

  const startTimer = (primary) => {
    stopTimer();
    timerRef.current = setInterval(() => {
      if (mountedRef.current) setCurrentTime(primary.currentTime || 0);
    }, 120);
  };

  const doStop = useCallback(() => {
    stopTimer();
    Object.values(audiosRef.current).forEach(a => {
      a.pause();
      a.onended = null;
      a.currentTime = 0;
    });
    primaryRef.current = null;
    if (mountedRef.current) {
      setPlayerState('stopped');
      setCurrentTime(0);
    }
  }, []);

  const doPlay = useCallback(async (fromStart = true) => {
    const audios = getEnabledAudios();
    if (!audios.length) return;

    // tell individual cards to stop first
    stopOthers?.();

    if (fromStart) {
      audios.forEach(a => { a.currentTime = 0; });
    }

    // launch all simultaneously — Promise.all keeps them in one microtask
    try {
      await Promise.all(audios.map(a => a.play()));
    } catch (err) {
      // AbortError is normal when switching states quickly
      if (err?.name !== 'AbortError') console.warn('[ChoirPlayer] play error:', err);
      return;
    }

    if (!mountedRef.current) return;
    setPlayerState('playing');

    const primary = audios[0];
    primaryRef.current = primary;
    startTimer(primary);

    // Attach ended handler: when primary finishes, stop everything
    primary.onended = () => {
      if (!mountedRef.current) return;
      doStop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getEnabledAudios, stopOthers, doStop]);

  const doPause = useCallback(() => {
    stopTimer();
    Object.values(audiosRef.current).forEach(a => a.pause());
    setPlayerState('paused');
  }, []);

  const doResume = useCallback(() => {
    doPlay(false); // resume from current position
  }, [doPlay]);

  // ── seek ─────────────────────────────────────────────────────────
  const seek = (e) => {
    if (!duration) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t     = ratio * duration;
    Object.values(audiosRef.current).forEach(a => { if (!isNaN(t)) a.currentTime = t; });
    setCurrentTime(t);
  };

  // ── toggle voice ─────────────────────────────────────────────────
  const toggleVoice = (trackId) => {
    if (playerState !== 'stopped') doStop();
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(trackId) && next.size > 1) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  // ── volume icon ─────────────────────────────────────────────────
  const VolumeIcon = volume === 0 ? FiVolumeX : volume < 0.5 ? FiVolume1 : FiVolume2;
  const toggleMute = () => setVolume(v => v > 0 ? 0 : 0.85);

  // ── progress ────────────────────────────────────────────────────
  const progress     = duration ? (currentTime / duration) * 100 : 0;
  const enabledCount = [...enabled].filter(id => audiosRef.current[id]).length;
  const isPlaying    = playerState === 'playing';
  const isPaused     = playerState === 'paused';
  const isActive     = isPlaying || isPaused;

  // waveform bar colors cycle through voice parts
  const WAVEFORM_BARS = 20;

  return (
    <motion.div
      className={`choir-player${isPlaying ? ' playing' : isPaused ? ' paused' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="choir-player-header">
        <div className="choir-header-left">
          <div className="choir-player-icon">
            <FiUsers />
          </div>
          <div>
            <div className="choir-player-title">Choir Mix</div>
            <div className="choir-player-subtitle">Play all voices together</div>
          </div>
        </div>
        <span className="choir-track-badge">
          {enabledCount} of {tracks.length} voice{tracks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Voice checkboxes ──────────────────────────────────────── */}
      <div className="choir-voices" role="group" aria-label="Select voices">
        {tracks.map(t => {
          const info     = getVoiceInfo(t.title);
          const isOn     = enabled.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className={`choir-voice-chip${isOn ? ' enabled' : ' disabled'}`}
              onClick={() => toggleVoice(t.id)}
              aria-pressed={isOn}
              title={`${isOn ? 'Remove' : 'Add'} ${info.letter}`}
            >
              <div
                className="choir-voice-check"
                style={isOn ? { background: info.check, borderColor: info.check } : {}}
              >
                {isOn && <FiCheck style={{ fontSize: '9px', strokeWidth: 3 }} />}
              </div>
              <div className="choir-voice-icon" style={{ background: info.bg }}>
                {info.label}
              </div>
              <span className="choir-voice-label">{info.letter}</span>
            </button>
          );
        })}
      </div>

      {/* ── Waveform visualiser ───────────────────────────────────── */}
      <div className="choir-waveform" aria-hidden="true">
        {Array.from({ length: WAVEFORM_BARS }, (_, i) => (
          <div
            key={i}
            className="choir-waveform-bar"
            style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
          />
        ))}
      </div>

      {/* ── Transport controls ────────────────────────────────────── */}
      <div className="choir-controls">
        {/* Play / Pause */}
        <button
          type="button"
          className="choir-play-btn"
          onClick={() => {
            if (isPlaying)  doPause();
            else if (isPaused) doResume();
            else            doPlay(true);
          }}
          disabled={enabledCount === 0}
          aria-label={isPlaying ? 'Pause choir' : isPaused ? 'Resume choir' : 'Play choir'}
        >
          {isPlaying ? <FiPause /> : <FiPlay style={{ marginLeft: '2px' }} />}
        </button>

        {/* Stop */}
        <div className="choir-secondary-btns">
          <button
            type="button"
            className="choir-ctrl-btn"
            onClick={doStop}
            disabled={!isActive}
            aria-label="Stop and reset"
            title="Stop"
          >
            <FiSquare />
          </button>
        </div>

        {/* Progress + time */}
        <div className="choir-progress-section">
          <div
            className="choir-progress-bar"
            onClick={seek}
            role="slider"
            aria-label="Playback position"
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
          >
            <div className="choir-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="choir-time-row">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* ── Master volume ─────────────────────────────────────────── */}
      <div className="choir-volume-row">
        <VolumeIcon
          className="choir-volume-icon"
          onClick={toggleMute}
          title={volume === 0 ? 'Unmute' : 'Mute'}
        />
        <input
          type="range"
          className="choir-volume-slider"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={e => setVolume(Number(e.target.value))}
          aria-label="Master volume"
          style={{ '--vol-pct': `${Math.round(volume * 100)}%` }}
        />
        <span className="choir-volume-pct">{Math.round(volume * 100)}%</span>
      </div>
    </motion.div>
  );
}
