import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../firebase/config';

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

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function uploadToStorage(file, path, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const metadata   = { contentType };
    const task       = uploadBytesResumable(storageRef, file, metadata);

    task.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          onProgress(
            Math.min(99, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))
          );
        }
      },
      (error) => {
        const msg = STORAGE_ERRORS[error.code] ?? error.message ?? 'Upload failed.';
        reject(new Error(msg));
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

const STORAGE_ERRORS = {
  'storage/unauthorized':   'Permission denied. Please make sure you are logged in.',
  'storage/canceled':       'Upload was cancelled.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
  'storage/invalid-format': 'Invalid file format.',
  'storage/retry-limit-exceeded': 'Upload failed after multiple retries. Check your connection.',
};

export function uploadAudio(file, hymnId, onProgress) {
  const path = `hymns/${hymnId}/audio/${Date.now()}_${sanitizeName(file.name)}`;
  return uploadToStorage(file, path, file.type || 'audio/mpeg', onProgress);
}

export function uploadPDF(file, hymnId, onProgress) {
  const path = `hymns/${hymnId}/pdf/${Date.now()}_${sanitizeName(file.name)}`;
  return uploadToStorage(file, path, 'application/pdf', onProgress);
}

export function deleteStorageFile(url) {
  if (!url) return Promise.resolve();
  try {
    const fileRef = ref(storage, url);
    return deleteObject(fileRef).catch(() => {});
  } catch {
    return Promise.resolve();
  }
}

// Downloads a Firebase Storage file via blob — bypasses cross-origin <a download> limitations
export async function downloadFile(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}).`);
  const blob    = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link    = document.createElement('a');
  link.href     = blobUrl;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}