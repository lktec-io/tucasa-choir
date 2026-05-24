import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiDownload } from 'react-icons/fi';
import '../styles/AudioTrackCard.css';

function getVoiceClass(title = '') {
  const t = title.toLowerCase();
  if (t.includes('soprano')) return 'soprano';
  if (t.includes('alto')) return 'alto';
  if (t.includes('tenor')) return 'tenor';
  if (t.includes('bass')) return 'bass';
  return 'default';
}

function getVoiceLabel(title = '') {
  const t = title.toLowerCase();
  if (t.includes('soprano')) return 'S';
  if (t.includes('alto')) return 'A';
  if (t.includes('tenor')) return 'T';
  if (t.includes('bass')) return 'B';
  return '♪';
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioTrackCard({ track, index = 0 }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const voiceClass = getVoiceClass(track.title);
  const voiceLabel = getVoiceLabel(track.title);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(v => !v);
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      className={`audio-track-card${playing ? ' playing' : ''}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <audio ref={audioRef} src={track.audioUrl} preload="metadata" />

      <div className="audio-track-card-header">
        <div className="audio-track-voice-badge">
          <div className={`voice-icon ${voiceClass}`}>{voiceLabel}</div>
          <div>
            <div className="audio-track-title">{track.title}</div>
            <div className="audio-track-duration">{formatTime(duration)}</div>
          </div>
        </div>

        <a
          href={track.audioUrl}
          download
          className="audio-track-download-btn"
          title="Download track"
          onClick={e => e.stopPropagation()}
        >
          <FiDownload />
        </a>
      </div>

      {/* Waveform */}
      <div className={`waveform${playing ? ' active' : ''}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="waveform-bar" />
        ))}
      </div>

      {/* Player */}
      <div className="audio-player">
        <div className="audio-player-controls">
          <button className="play-pause-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <FiPause /> : <FiPlay />}
          </button>
          <div className="audio-progress-wrap">
            <div
              className="audio-progress-bar"
              onClick={seek}
              role="slider"
              aria-label="Audio progress"
            >
              <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="audio-time-labels">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
