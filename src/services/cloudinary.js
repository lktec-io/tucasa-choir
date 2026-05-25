import axios from 'axios';

const ALLOWED_AUDIO_EXT  = ['mp3', 'wav', 'm4a'];
const ALLOWED_AUDIO_MIME = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/ogg', 'audio/x-wav'];
const MAX_AUDIO_BYTES    = 50 * 1024 * 1024;
const MAX_PDF_BYTES      = 15 * 1024 * 1024;

export function validateAudioFile(file) {
  if (!file) return 'Please select an audio file.';
  const ext = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_AUDIO_EXT.includes(ext) && !ALLOWED_AUDIO_MIME.includes(file.type)) {
    return 'Only MP3, WAV, and M4A audio files are allowed.';
  }
  if (file.size > MAX_AUDIO_BYTES) return `Audio file must be under ${MAX_AUDIO_BYTES / 1024 / 1024}MB.`;
  return null;
}

export function validatePDFFile(file) {
  if (!file) return 'Please select a PDF file.';
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'pdf' && file.type !== 'application/pdf') return 'Only PDF files are allowed.';
  if (file.size > MAX_PDF_BYTES) return `PDF must be under ${MAX_PDF_BYTES / 1024 / 1024}MB.`;
  return null;
} 

export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadToCloudinary(file, onProgress) {
  // Read env vars inside the function so they're evaluated at call-time.
  // In Vite, import.meta.env values are injected at build time — these MUST
  // be set in the Netlify dashboard (Site Settings → Environment Variables)
  // before deploying, or in a local .env file before running `npm run dev`.
const CLOUD_NAME = "dod8srxyj";
const UPLOAD_PRESET = "tucasa-choir";

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    const msg =
      'Cloudinary environment variables are missing.\n' +
      `  VITE_CLOUDINARY_CLOUD_NAME   = "${CLOUD_NAME}"\n` +
      `  VITE_CLOUDINARY_UPLOAD_PRESET = "${UPLOAD_PRESET}"\n\n` +
      'LOCAL  → Add both to your .env file, then restart the dev server (Ctrl+C → npm run dev).\n' +
      'NETLIFY → Go to Site Settings → Environment Variables and add both keys, then trigger a new deploy.';
    console.error('[Cloudinary]', msg);
    throw new Error(
      'Upload failed: Cloudinary is not configured. ' +
      'Check your .env file (local) or Netlify environment variables (production).'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

  const response = await axios.post(url, formData, {
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(Math.min(99, Math.round((event.loaded * 100) / event.total)));
      }
    },
  });

  if (!response.data?.secure_url) {
    throw new Error('Cloudinary upload completed but returned no URL. Check your upload preset settings.');
  }

  return response.data.secure_url;
}

export async function uploadAudio(file, onProgress) {
  return uploadToCloudinary(file, onProgress);
}

export async function uploadPDF(file, onProgress) {
  return uploadToCloudinary(file, onProgress);
}
