import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiDownload, FiAlertCircle } from 'react-icons/fi';
import { voiceKey, voiceLetter } from '../utils/voice';
import '../styles/AudioTrackCard.css';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioTrackCard({ track, index = 0, stopSignal = 0, onPlay }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  const voiceClass = voiceKey(track.title);
  const voiceLabel = voiceLetter(track.title);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setPlaying(false);
      setFailed(true);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Stop this card when choir player starts
  const isFirstSignal = useRef(true);
  useEffect(() => {
    if (isFirstSignal.current) { isFirstSignal.current = false; return; }
    const audio = audioRef.current;
    if (audio && playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      setCurrentTime(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopSignal]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      onPlay?.(); // tell choir player to stop
      audio.play().catch(() => setPlaying(false));
    }
    setPlaying(v => !v);
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const safeDuration = Number.isFinite(duration) ? duration : 0;
  const progress = safeDuration ? (currentTime / safeDuration) * 100 : 0;

  return (
    <motion.div
      className={`audio-track-card${playing ? ' playing' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <audio ref={audioRef} src={track.audioUrl} preload="metadata" />

      <div className="audio-track-card-header">
        <div className="audio-track-voice-badge">
          <div className={`voice-tile voice-fill ${voiceClass}`} aria-hidden="true">{voiceLabel}</div>
          <div className="audio-track-text">
            <div className="audio-track-title">{track.title}</div>
            <div className="audio-track-duration num">{playing ? 'Playing' : formatTime(duration)}</div>
          </div>
        </div>

        <a
          href={track.audioUrl}
          download
          className="btn btn-secondary btn-icon btn-sm"
          title="Download track"
          aria-label={`Download ${track.title}`}
          onClick={e => e.stopPropagation()}
        >
          <FiDownload />
        </a>
      </div>

      {failed ? (
        <p className="field-error"><FiAlertCircle /> This track could not be loaded.</p>
      ) : (
        <div className="audio-player-controls">
          <button
            type="button"
            className="btn btn-primary btn-icon"
            onClick={togglePlay}
            aria-label={`${playing ? 'Pause' : 'Play'} ${track.title}`}
          >
            {playing ? <FiPause /> : <FiPlay />}
          </button>
          <div className="audio-progress-wrap">
            <input
              type="range"
              className="range-slider"
              min={0}
              max={safeDuration}
              step={0.1}
              value={currentTime}
              onChange={seek}
              disabled={!safeDuration}
              aria-label={`Seek ${track.title}`}
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(safeDuration)}`}
              style={{ '--range-pct': `${progress}%` }}
            />
            <div className="audio-time-labels num">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
