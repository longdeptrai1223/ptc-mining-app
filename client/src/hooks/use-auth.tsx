import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  User, 
  signInWithRedirect, 
  signInWithPopup,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { nanoid } from "nanoid";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Handle redirect result on component mount
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // Successfully signed in after redirect
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
      }
    };
    
    handleRedirectResult();
    
    // Normal auth state handling
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      
      if (authUser) {
        setUser(authUser);
        
        // Check if user document exists in Firestore
        const userDocRef = doc(db, "users", authUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          // Create new user document
          const inviteCode = nanoid(8).toUpperCase();
          await setDoc(userDocRef, {
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
            inviteCode,
            totalCoins: 0,
            miningRate: 0.1,
            permanentBuffMultiplier: 1,
            temporaryBuffMultiplier: 1,
            temporaryBuffExpiry: null,
            referralCount: 0,
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp(),
          });
        } else {
          // Update last active timestamp
          await setDoc(userDocRef, {
            lastActive: serverTimestamp(),
          }, { merge: true });
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const signInWithGoogle = async () => {
    try {
      // Kiểm tra nếu đang chạy trong môi trường giả lập/Android WebView
      // navigator.userAgent thường có chứa "Android" hoặc "wv" nếu đang chạy trong WebView
      const isWebView = /Android.*wv/.test(navigator.userAgent) || 
                        window.navigator.userAgent.includes('AppWebView') ||
                        document.documentElement.classList.contains('pwa-builder-android');
      
      if (isWebView) {
        // Sử dụng Popup trong WebView vì Redirect thường gặp vấn đề
        console.log("Đăng nhập bằng Popup (đang chạy trong WebView/Giả lập)");
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
          navigate("/dashboard");
        }
      } else {
        // Sử dụng Redirect trong trình duyệt web thông thường
        console.log("Đăng nhập bằng Redirect (đang chạy trong trình duyệt web)");
        await signInWithRedirect(auth, googleProvider);
        // Navigation xảy ra trong useEffect thông qua handleRedirectResult
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
