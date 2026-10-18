// BACKEND: 'local' (memory + localStorage, demo data) | 'firebase'
export const BACKEND = 'local';

// ===== FIREBASE_CONFIG — dán cấu hình Web app của Firebase vào đây (xem SETUP.md, bước 4) =====
// Firebase console → Project settings → Your apps → Web app → "firebaseConfig".
// Các giá trị này không phải bí mật; việc bảo vệ dữ liệu nằm ở firestore.rules.
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
// ===== hết FIREBASE_CONFIG =====

export const APP_VERSION = '0.1.0';
