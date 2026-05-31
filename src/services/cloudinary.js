import axios from 'axios';

const CLOUD_NAME    = 'dod8srxyj';
const UPLOAD_PRESET = 'tucasa-choir';
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

const ALLOWED_AUDIO_EXT = ['mp3', 'wav', 'm4a'];
const MAX_AUDIO_BYTES   = 50 * 1024 * 1024;  // 50 MB
const MAX_PDF_BYTES     = 15 * 1024 * 1024;  // 15 MB

export function validateAudioFile(file) {
  if (!file) return 'Please select an audio file.';
  const ext = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_AUDIO_EXT.includes(ext)) return 'Only MP3, WAV, and M4A files are allowed.';
  if (file.size > MAX_AUDIO_BYTES) return `Audio file must be under ${MAX_AUDIO_BYTES / 1024 / 1024} MB.`;
  return null;
}

export function validatePDFFile(file) {
  if (!file) return 'Please select a PDF file.';
  if (file.name.split('.').pop().toLowerCase() !== 'pdf') return 'Only PDF files are allowed.';
  if (file.size > MAX_PDF_BYTES) return `PDF must be under ${MAX_PDF_BYTES / 1024 / 1024} MB.`;
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

    const { secure_url, public_id, original_filename, resource_type, format } = response.data;

    console.log('[Cloudinary] Upload response:', { secure_url, public_id, original_filename, resource_type, format });

    if (!secure_url) throw new Error('Upload succeeded but no secure_url was returned.');
    return { secure_url, public_id, original_filename: original_filename || file.name };

  } catch (err) {
    const cldMsg = err.response?.data?.error?.message;
    if (cldMsg) throw new Error(`Cloudinary: ${cldMsg}`);
    throw err;
  }
}

// Returns the secure_url string directly — no URL transformations applied
export async function uploadAudio(file, onProgress) {
  const { secure_url } = await uploadToCloudinary(file, onProgress);
  return secure_url;
}

// Returns { secure_url, public_id, original_filename } so callers can store all three
export async function uploadPDF(file, onProgress) {
  return uploadToCloudinary(file, onProgress);
}
