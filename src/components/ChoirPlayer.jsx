import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiPlay, FiPause, FiSquare, FiVolume2, FiVolume1,
  FiVolumeX, FiUsers, FiCheck, FiAlertCircle
} from 'react-icons/fi';
import { voiceKey, voiceLetter, voiceName } from '../utils/voice';
import '../styles/ChoirPlayer.css';

/* ── helpers ─────────────────────────────────────────────────────────── */
function formatTime(s) {
  if (!s || isNaN(s) || s === Infinity) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* ── component ───────────────────────────────────────────────────────── */
export default function ChoirPlayer({ tracks, stopSignal = 0, stopOthers }) {
  // ── voice enable/disable ──────────────────────────────────────────
  const [enabled, setEnabled] = useState(() => new Set(tracks.map(t => t.id)));

  // ── playback state ────────────────────────────────────────────────
  const [playerState, setPlayerState] = useState('stopped'); // 'stopped'|'playing'|'paused'
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [playFailed, setPlayFailed] = useState(false);

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
    setPlayFailed(false);

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
      if (err?.name !== 'AbortError') {
        console.warn('[ChoirPlayer] play error:', err);
        if (mountedRef.current) setPlayFailed(true);
      }
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
    const t = Number(e.target.value);
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

  return (
    <motion.div
      className={`choir-player${isPlaying ? ' playing' : isPaused ? ' paused' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="choir-player-header">
        <div className="choir-header-left">
          <div className="choir-player-icon">
            <FiUsers />
          </div>
          <div>
            <div className="choir-player-title">Choir Mix</div>
            <div className="choir-player-subtitle" role="status">
              {isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Play all voices together'}
            </div>
          </div>
        </div>
        <span className="badge">
          <span className="num">{enabledCount}/{tracks.length}</span> voice{tracks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Voice checkboxes ──────────────────────────────────────── */}
      <div className="choir-voices" role="group" aria-label="Select voices">
        {tracks.map(t => {
          const key   = voiceKey(t.title);
          const name  = voiceName(t.title);
          const isOn  = enabled.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className={`choir-voice-chip${isOn ? ' enabled' : ' disabled'}`}
              onClick={() => toggleVoice(t.id)}
              aria-pressed={isOn}
              title={`${isOn ? 'Remove' : 'Add'} ${name}`}
            >
              <span className="choir-voice-check" aria-hidden="true">
                {isOn && <FiCheck />}
              </span>
              <span className={`voice-tile voice-fill ${key}`} aria-hidden="true">
                {voiceLetter(t.title)}
              </span>
              <span className="choir-voice-label">{name}</span>
            </button>
          );
        })}
      </div>

      {/* ── Transport controls ────────────────────────────────────── */}
      <div className="choir-controls">
        {/* Play / Pause */}
        <button
          type="button"
          className="btn btn-primary btn-icon choir-play-btn"
          onClick={() => {
            if (isPlaying)  doPause();
            else if (isPaused) doResume();
            else            doPlay(true);
          }}
          disabled={enabledCount === 0}
          aria-label={isPlaying ? 'Pause choir' : isPaused ? 'Resume choir' : 'Play choir'}
        >
          {isPlaying ? <FiPause /> : <FiPlay />}
        </button>

        {/* Stop */}
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={doStop}
          disabled={!isActive}
          aria-label="Stop and reset"
          title="Stop"
        >
          <FiSquare />
        </button>

        {/* Progress + time */}
        <div className="choir-progress-section">
          <input
            type="range"
            className="range-slider"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={seek}
            disabled={!duration}
            aria-label="Playback position"
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            style={{ '--range-pct': `${progress}%` }}
          />
          <div className="choir-time-row num">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {playFailed && (
        <p className="field-error choir-error"><FiAlertCircle /> A track could not be played. Please try again.</p>
      )}

      {/* ── Master volume ─────────────────────────────────────────── */}
      <div className="choir-volume-row">
        <button
          type="button"
          className="btn btn-tertiary btn-icon btn-sm"
          onClick={toggleMute}
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          title={volume === 0 ? 'Unmute' : 'Mute'}
        >
          <VolumeIcon />
        </button>
        <input
          type="range"
          className="range-slider"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={e => setVolume(Number(e.target.value))}
          aria-label="Master volume"
          style={{ '--range-pct': `${Math.round(volume * 100)}%` }}
        />
        <span className="choir-volume-pct num">{Math.round(volume * 100)}%</span>
      </div>
    </motion.div>
  );
}
