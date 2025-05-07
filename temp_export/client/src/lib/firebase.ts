import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ""}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || ""}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

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
