// Voice part names are matched against free-text titles such as "Soprano 1"
export function voiceKey(title = '') {
  const t = title.toLowerCase();
  if (t.includes('soprano')) return 'soprano';
  if (t.includes('alto')) return 'alto';
  if (t.includes('tenor')) return 'tenor';
  if (t.includes('bass')) return 'bass';
  return 'default';
}

const VOICE_LETTERS = { soprano: 'S', alto: 'A', tenor: 'T', bass: 'B' };
const VOICE_NAMES = { soprano: 'Soprano', alto: 'Alto', tenor: 'Tenor', bass: 'Bass' };

export function voiceLetter(title = '') {
  return VOICE_LETTERS[voiceKey(title)] || '♪';
}

export function voiceName(title = '') {
  return VOICE_NAMES[voiceKey(title)] || title;
}
