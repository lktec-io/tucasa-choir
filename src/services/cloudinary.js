import axios from 'axios';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const ALLOWED_AUDIO_EXT = ['mp3', 'wav', 'm4a'];
const ALLOWED_AUDIO_MIME = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/ogg', 'audio/x-wav'];
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;  // 50 MB
const MAX_PDF_BYTES = 15 * 1024 * 1024;    // 15 MB

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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadToCloudinary(file, onProgress) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
console.log(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);
console.log(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  const response = await axios.post(url, formData, {
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(Math.min(99, Math.round((event.loaded * 100) / event.total)));
      }
    },
  });

  if (!response.data?.secure_url) throw new Error('Upload succeeded but no URL was returned.');
  return response.data.secure_url;
}

export async function uploadAudio(file, onProgress) {
  return uploadToCloudinary(file, onProgress);
}

export async function uploadPDF(file, onProgress) {
  return uploadToCloudinary(file, onProgress);
}
