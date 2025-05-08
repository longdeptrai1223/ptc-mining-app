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
    console.log("=== KHỞI TẠO AUTH PROVIDER ===");
    
    // Biến để kiểm soát chuyển hướng
    let redirectTriggered = false;
    const wasRedirectTriggered = localStorage.getItem("auth_redirect_triggered") === "true";
    const wasAuthCompleted = localStorage.getItem("auth_completed") === "true";
    
    // Xử lý kết quả redirect sau khi đăng nhập
    const handleRedirectResult = async () => {
      try {
        console.log("📋 Kiểm tra kết quả chuyển hướng đăng nhập...");
        console.log("Was redirect triggered:", wasRedirectTriggered);
        console.log("Was auth completed:", wasAuthCompleted);
        
        // Nếu đã hoàn thành xác thực trong quá khứ (từ localStorage)
        if (wasAuthCompleted) {
          console.log("✅ Phát hiện đăng nhập thành công từ dữ liệu đã lưu");
          localStorage.removeItem("auth_completed");
          
          // Nếu đang ở trang login, chuyển đến dashboard
          if (window.location.pathname === "/") {
            redirectTriggered = true;
            console.log("🔄 Chuyển hướng từ trang login đến dashboard");
            navigate("/dashboard");
            return;
          }
        }
        
        // Chỉ tiếp tục nếu đã kích hoạt redirect trước đó
        if (wasRedirectTriggered) {
          console.log("📱 Đang xử lý kết quả sau redirect");
          localStorage.removeItem("auth_redirect_triggered");
          
          const result = await getRedirectResult(auth);
          if (result && result.user) {
            console.log("✅ Đăng nhập redirect thành công:", result.user.displayName);
            
            // Lưu thông tin để tránh mất khi refresh
            localStorage.setItem("auth_user_email", result.user.email || "");
            localStorage.setItem("auth_user_name", result.user.displayName || "");
            localStorage.setItem("auth_user_uid", result.user.uid);
            localStorage.setItem("auth_completed", "true");
            
            if (!redirectTriggered) {
              redirectTriggered = true;
              console.log("🔄 Chuyển hướng đến dashboard sau khi redirect thành công");
              navigate("/dashboard");
            }
          } else {
            console.log("⚠️ Không nhận được kết quả redirect");
          }
        } else {
          console.log("ℹ️ Không có redirect trước đó cần xử lý");
        }
      } catch (error) {
        console.error("❌ Lỗi khi xử lý kết quả chuyển hướng:", error);
        localStorage.removeItem("auth_redirect_triggered");
      }
    };
    
    // Xử lý kết quả redirect ngay khi component mount
    handleRedirectResult();
    
    // Xử lý trạng thái xác thực
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log("🔄 Trạng thái xác thực thay đổi:", authUser ? `Đã đăng nhập (${authUser.displayName})` : "Chưa đăng nhập");
      setLoading(true);
      
      if (authUser) {
        setUser(authUser);
        
        // Kiểm tra và cập nhật Firestore
        try {
          const userDocRef = doc(db, "users", authUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            console.log("🆕 Tạo hồ sơ người dùng mới cho:", authUser.displayName);
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
        } catch (err) {
          console.error("❌ Lỗi khi tương tác với Firestore:", err);
        }
        
        // Chuyển hướng đến dashboard nếu đang ở trang login
        const isLoginPage = window.location.pathname === "/";
        if (isLoginPage && !redirectTriggered) {
          redirectTriggered = true;
          console.log("🔄 Chuyển hướng đến dashboard sau khi phát hiện đăng nhập");
          setTimeout(() => {
            navigate("/dashboard");
          }, 100);
        }
      } else {
        console.log("➖ Không có người dùng đăng nhập");
        setUser(null);
        
        // Xóa thông tin đăng nhập đã lưu
        localStorage.removeItem("auth_user_email");
        localStorage.removeItem("auth_user_name");
        localStorage.removeItem("auth_user_uid");
        localStorage.removeItem("auth_completed");
      }
      
      setLoading(false);
    });
    
    // Cleanup khi component unmount
    return () => {
      console.log("🧹 Dọn dẹp Auth Provider");
      unsubscribe();
      sessionStorage.removeItem("auth_in_progress");
    };
  }, [navigate]);

  // PHƯƠNG PHÁP ĐĂNG NHẬP MỚI: SỬ DỤNG CHỈ POPUP CHO TẤT CẢ MÔI TRƯỜNG ANDROID
  const signInWithGoogle = async () => {
    try {
      console.log("=== BẮT ĐẦU QUÁ TRÌNH ĐĂNG NHẬP ===");
      console.log("User Agent:", navigator.userAgent);
      
      // Luôn xóa trạng thái lưu trữ đăng nhập cũ
      sessionStorage.removeItem("auth_in_progress");
      localStorage.removeItem("auth_redirect_triggered");
      
      // Luôn cấu hình Google provider
      googleProvider.addScope('profile');
      googleProvider.addScope('email');
      googleProvider.setCustomParameters({
        prompt: 'select_account',
        // Thêm cấu hình để tránh bộ nhớ cache
        login_hint: Date.now().toString(),
        access_type: 'offline'
      });

      // Ưu tiên phương pháp popup cho MỌI môi trường Android
      if (/Android/i.test(navigator.userAgent)) {
        console.log("🔴 PHÁT HIỆN MÔI TRƯỜNG ANDROID - SỬ DỤNG CHẾ ĐỘ ĐẶC BIỆT");
        sessionStorage.setItem("auth_in_progress", "true");
        
        try {
          // Thử đăng nhập với Popup
          console.log("Đang thử phương pháp Popup...");
          const result = await signInWithPopup(auth, googleProvider);
          
          if (result && result.user) {
            console.log("✅ Đăng nhập thành công với Popup!");
            sessionStorage.removeItem("auth_in_progress");
            
            // Lưu thông tin xác thực vào localStorage để tránh mất khi refresh
            localStorage.setItem("auth_user_email", result.user.email || "");
            localStorage.setItem("auth_user_name", result.user.displayName || "");
            localStorage.setItem("auth_user_uid", result.user.uid);
            localStorage.setItem("auth_completed", "true");
            
            // Trì hoãn chuyển hướng để đảm bảo dữ liệu được lưu
            setTimeout(() => {
              navigate("/dashboard");
            }, 300);
          }
        } catch (popupError) {
          console.error("❌ Lỗi khi sử dụng Popup:", popupError);
          console.log("Đang thử phương pháp redirect thay thế...");
          
          // Đánh dấu đã kích hoạt redirect để xử lý khi quay lại
          localStorage.setItem("auth_redirect_triggered", "true");
          
          // Thử phương pháp redirect nếu popup thất bại
          await signInWithRedirect(auth, googleProvider).catch(err => {
            console.error("❌❌ Cả hai phương pháp đều thất bại:", err);
          });
        }
      } else {
        // Môi trường không phải Android (web desktop)
        console.log("Phát hiện môi trường web tiêu chuẩn - sử dụng redirect");
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (error) {
      console.error("❌❌❌ LỖI NGHIÊM TRỌNG TRONG QUÁ TRÌNH ĐĂNG NHẬP:", error);
      
      // Xóa trạng thái đăng nhập khi có lỗi
      sessionStorage.removeItem("auth_in_progress");
      localStorage.removeItem("auth_redirect_triggered");
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
