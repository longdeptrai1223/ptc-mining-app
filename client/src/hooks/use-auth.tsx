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
     // Biến để kiểm soát chuyển hướng
    let redirectTriggered = false;
    let isAuthenticated = false;
    
    // Handle redirect result on component mount
    const handleRedirectResult = async () => {
      try {
        console.log("Đang xử lý kết quả chuyển hướng đăng nhập...");
        const result = await getRedirectResult(auth);
      if (result && result.user) {
          console.log("Đăng nhập thành công sau khi chuyển hướng:", result.user.displayName);
          isAuthenticated = true;
          
          // Đánh dấu đã xử lý redirect và chuyển hướng người dùng
          if (!redirectTriggered) {
            redirectTriggered = true;
            navigate("/dashboard");
          }
        }
      } catch (error) {
        console.error("Lỗi khi xử lý kết quả chuyển hướng:", error);
      }
    };

    // Xử lý kết quả redirect ngay khi component mount
    handleRedirectResult();
    
    // Xử lý trạng thái xác thực thông thường
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log("Trạng thái xác thực thay đổi:", authUser ? "Đã đăng nhập" : "Chưa đăng nhập");
      setLoading(true);
      
      if (authUser) {
        setUser(authUser);
        isAuthenticated = true;
        
        // Kiểm tra nếu tài liệu người dùng tồn tại trong Firestore
        const userDocRef = doc(db, "users", authUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.log("Tạo tài liệu người dùng mới cho:", authUser.displayName);
          // Tạo tài liệu người dùng mới
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
          // Cập nhật timestamp hoạt động gần nhất
          await setDoc(userDocRef, {
            lastActive: serverTimestamp(),
          }, { merge: true });
        }
       
        // Chỉ chuyển hướng nếu người dùng đã xác thực và chưa được chuyển hướng
        if (isAuthenticated && !redirectTriggered) {
          redirectTriggered = true;
          navigate("/dashboard");
        }
      } else {
        setUser(null);
        isAuthenticated = false;
      }
      
      setLoading(false);
    });

    // Cleanup khi component unmount
    return () => {
      unsubscribe();
    };
  }, [navigate]);

  const signInWithGoogle = async () => {
    try {
            // Kiểm tra nếu đang chạy trong môi trường mobile hoặc WebView
      const isMobile = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
      const isWebView = /Android.*wv/.test(navigator.userAgent) || 
                        window.navigator.userAgent.includes('AppWebView') ||
                        document.documentElement.classList.contains('pwa-builder-android') ||
                        /GSA\//.test(navigator.userAgent);

         // Sử dụng popup cho tất cả môi trường mobile và WebView để tránh chuyển hướng
      if (isMobile || isWebView) {
        console.log("Đăng nhập bằng Popup (môi trường mobile/WebView phát hiện)");
        console.log("UserAgent:", navigator.userAgent);
        
        // Luôn mở rộng phạm vi (scope) cho Google provider
        googleProvider.addScope('profile');
        googleProvider.addScope('email');
        
        // Đặt prompt='select_account' để luôn hiển thị tùy chọn tài khoản
        googleProvider.setCustomParameters({
          prompt: 'select_account'
        });
        
        try {
          const result = await signInWithPopup(auth, googleProvider);
          console.log("Đăng nhập thành công:", result.user?.displayName);
          // Đảm bảo chuyển hướng sau khi đăng nhập thành công
          if (result.user) {
            navigate("/dashboard");
          }
        } catch (popupError) {
          console.error("Lỗi popup:", popupError);
          // Nếu popup bị chặn, thử phương pháp redirect
          console.log("Thử phương pháp redirect sau khi popup thất bại");
          await signInWithRedirect(auth, googleProvider);
        }
      } else {
        // Sử dụng Redirect trong trình duyệt web thông thường
       console.log("Đăng nhập bằng Redirect (môi trường trình duyệt web)");
        await signInWithRedirect(auth, googleProvider);
        // Navigation xảy ra trong useEffect thông qua handleRedirectResult
      }
    } catch (error) {
       console.error("Lỗi đăng nhập với Google:", error);
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
