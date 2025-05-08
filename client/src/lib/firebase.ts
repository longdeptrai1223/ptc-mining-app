import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator, browserLocalPersistence, browserSessionPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Phát hiện môi trường
const isAndroid = /Android/i.test(navigator.userAgent);
const isWebView = /wv|WebView|PTCWV/.test(navigator.userAgent);

console.log("🔍 Environment detection:");
console.log("- User Agent:", navigator.userAgent);
console.log("- Is Android:", isAndroid);
console.log("- Is WebView:", isWebView);

// Firebase configuration - với cấu hình tối ưu cho Android
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ""}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ""}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  // Thêm các cài đặt cho WebView Android
  persistenceEnabled: true, // Cho phép lưu trữ local
  popupRedirectResolver: undefined, // Để Firebase tự động chọn resolver phù hợp
};

// Initialize Firebase
console.log("🔥 Khởi tạo Firebase với config:", JSON.stringify(firebaseConfig, null, 2));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Cấu hình persistence cho Auth
(async () => {
  try {
    // Ưu tiên lưu trữ local cho môi trường Android
    if (isAndroid || isWebView) {
      console.log("📱 Cấu hình lưu trữ LOCAL cho Android/WebView");
      await setPersistence(auth, browserLocalPersistence);
    } else {
      console.log("🖥️ Cấu hình lưu trữ SESSION cho web thông thường");
      await setPersistence(auth, browserSessionPersistence);
    }
  } catch (err) {
    console.error("❌ Lỗi khi cấu hình auth persistence:", err);
  }
})();

// Cấu hình GoogleAuthProvider
const googleProvider = new GoogleAuthProvider();
// Thêm scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');
// Cấu hình tham số
googleProvider.setCustomParameters({
  // Luôn hiển thị màn hình chọn tài khoản
  prompt: 'select_account',
  // Hỗ trợ đăng nhập offline
  access_type: 'offline',
});

// Initialize Cloud Messaging
let messaging: any;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.error("Firebase messaging initialization failed:", error);
}

// Request notification permission and get FCM token
const requestNotificationPermissionAndToken = async () => {
  try {
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission not granted");
      return null;
    }

    // Get registration token
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "",
    });

    return token;
  } catch (error) {
    console.error("Error getting notification token:", error);
    return null;
  }
};

// Set up message listener
const setupMessageListener = (callback: (payload: any) => void) => {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    callback(payload);
  });
};

export {
  app,
  auth,
  db,
  googleProvider,
  requestNotificationPermissionAndToken,
  setupMessageListener,
};
