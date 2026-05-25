import axios from 'axios';

const CLOUD_NAME    = 'dod8srxyj';
const UPLOAD_PRESET = 'tucasa-choir';
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

// Debug banner – remove after confirming cache is cleared
console.log('%c[Cloudinary] LOADED v3 – preset=tucasa-choir cloud=dod8srxyj', 'color:lime;font-weight:bold');

const ALLOWED_AUDIO_EXT  = ['mp3', 'wav', 'm4a'];
const MAX_AUDIO_BYTES    = 50 * 1024 * 1024;  // 50 MB
const MAX_PDF_BYTES      = 15 * 1024 * 1024;  // 15 MB

export function validateAudioFile(file) {
  if (!file) return 'Please select an audio file.';
  const ext = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_AUDIO_EXT.includes(ext)) {
    return 'Only MP3, WAV, and M4A audio files are allowed.';
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return `Audio file must be under ${MAX_AUDIO_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

export function validatePDFFile(file) {
  if (!file) return 'Please select a PDF file.';
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'pdf') return 'Only PDF files are allowed.';
  if (file.size > MAX_PDF_BYTES) {
    return `PDF must be under ${MAX_PDF_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadToCloudinary(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await axios.post(UPLOAD_URL, formData, {
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.min(99, Math.round((event.loaded * 100) / event.total)));
        }
      },
    });

    const url = response.data?.secure_url;
    if (!url) throw new Error('Upload succeeded but Cloudinary returned no URL.');
    return url;

  } catch (err) {
    // Surface Cloudinary's own error message when available
    const cldMsg = err.response?.data?.error?.message;
    if (cldMsg) throw new Error(`Cloudinary: ${cldMsg}`);
    throw err;
  }
}

export const uploadAudio = (file, onProgress) => uploadToCloudinary(file, onProgress);
export const uploadPDF   = (file, onProgress) => uploadToCloudinary(file, onProgress);
