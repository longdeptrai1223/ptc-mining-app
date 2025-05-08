import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  User, 
  signInWithRedirect, 
  signInWithPopup,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  GoogleAuthProvider
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
    console.log("=== KHỞI TẠO AUTH PROVIDER v3.0 ===");
    
    // Phát hiện môi trường đặc biệt
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isWebView = /wv|WebView|PTCWV/.test(navigator.userAgent);
    const isAndroidWebView = isAndroid && isWebView;
    
    // Biến để kiểm soát chuyển hướng
    let redirectTriggered = false;
    const wasRedirectTriggered = localStorage.getItem("auth_redirect_triggered") === "true";
    const wasAuthCompleted = localStorage.getItem("auth_completed") === "true";
    const isWebViewMode = localStorage.getItem("auth_webview_mode") === "true";
    
    console.log("🧪 Trạng thái auth cookies:", {
      authRedirectTriggered: wasRedirectTriggered,
      authCompleted: wasAuthCompleted,
      webViewMode: isWebViewMode,
      android: isAndroid,
      webView: isWebView
    });
    
    // LƯU Ý ĐẶC BIỆT: Phát hiện lỗi vòng lặp chuyển hướng
    const lastHandleTime = parseInt(localStorage.getItem("auth_last_handle_time") || "0");
    const currentTime = Date.now();
    const timeSinceLastHandle = currentTime - lastHandleTime;
    
    // Nếu xử lý quá nhanh (dưới 2 giây), có thể đang trong vòng lặp
    if (lastHandleTime > 0 && timeSinceLastHandle < 2000) {
      console.error("⚠️⚠️⚠️ PHÁT HIỆN VÒNG LẶP XỬ LÝ! Thời gian từ lần xử lý trước:", timeSinceLastHandle + "ms");
      // Xóa trạng thái để thoát vòng lặp
      localStorage.removeItem("auth_redirect_triggered");
      localStorage.removeItem("auth_webview_mode");
      localStorage.setItem("auth_loop_detected", "true");
    }
    
    // Cập nhật thời gian xử lý
    localStorage.setItem("auth_last_handle_time", currentTime.toString());
    
    // Xử lý kết quả redirect sau khi đăng nhập
    const handleRedirectResult = async () => {
      try {
        console.log("📋 KIỂM TRA KẾT QUẢ ĐĂNG NHẬP v3.0");
        console.log("- Redirect triggered:", wasRedirectTriggered);
        console.log("- Auth completed:", wasAuthCompleted);
        console.log("- WebView mode:", isWebViewMode);
        console.log("- Current path:", window.location.pathname);
        
        // XỬ LÝ THỦ CÔNG CHO WEBVIEW: Nếu đã đánh dấu trong localStorage
        if (isWebViewMode && isAndroidWebView) {
          console.log("🤖 XỬ LÝ ĐẶC BIỆT CHO WEBVIEW ANDROID");
          
          // Lấy token từ tham số URL (nếu có)
          const urlParams = new URLSearchParams(window.location.search);
          const authToken = urlParams.get('auth_token');
          
          if (authToken) {
            console.log("🔑 Phát hiện auth token trong URL:", authToken);
            
            // Xóa mode WebView để tránh xử lý lại
            localStorage.removeItem("auth_webview_mode");
            localStorage.setItem("auth_token_found", authToken);
            
            // Xử lý người dùng từ token nếu cần
            // ...
          }
          
          // Đánh dấu đã xử lý đặc biệt
          localStorage.setItem("auth_webview_processed", "true");
        }
        
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
        
        // Xử lý kết quả redirect
        if (wasRedirectTriggered) {
          console.log("📱 Đang xử lý kết quả sau redirect...");
          
          // Đánh dấu đã xử lý redirect để tránh vòng lặp
          localStorage.removeItem("auth_redirect_triggered");
          
          // QUAN TRỌNG: Timeout để đảm bảo Firebase Auth có thời gian xử lý
          setTimeout(async () => {
            try {
              console.log("⏱️ Bắt đầu lấy kết quả redirect sau timeout");
              const result = await getRedirectResult(auth);
              
              if (result && result.user) {
                console.log("✅ Đăng nhập redirect thành công:", result.user.displayName);
                
                // Lưu thông tin để tránh mất khi refresh
                localStorage.setItem("auth_user_email", result.user.email || "");
                localStorage.setItem("auth_user_name", result.user.displayName || "");
                localStorage.setItem("auth_user_uid", result.user.uid);
                localStorage.setItem("auth_completed", "true");
                localStorage.setItem("auth_success_time", Date.now().toString());
                
                if (!redirectTriggered) {
                  redirectTriggered = true;
                  console.log("🔄 Chuyển hướng đến dashboard sau khi redirect thành công");
                  navigate("/dashboard");
                }
              } else {
                console.log("⚠️ Không nhận được kết quả redirect");
                // Kiểm tra lỗi đăng nhập
                const errorMsg = localStorage.getItem("auth_webview_error") || 
                                localStorage.getItem("auth_popup_error") ||
                                localStorage.getItem("auth_critical_error");
                                
                if (errorMsg) {
                  console.error("🔍 Tìm thấy lỗi đã ghi trong quá trình đăng nhập:", errorMsg);
                }
              }
            } catch (error: any) {
              console.error("❌ Lỗi khi lấy kết quả redirect:", error);
              
              // Ghi lại lỗi để phân tích
              localStorage.setItem("auth_redirect_result_error", JSON.stringify({
                time: Date.now(),
                message: error?.message || "Unknown error",
                code: error?.code || 'unknown'
              }));
            }
          }, 1000); // Đợi 1 giây để xử lý redirect
        } else {
          console.log("ℹ️ Không có redirect trước đó cần xử lý");
        }
      } catch (error: any) {
        console.error("❌ Lỗi trong quá trình xử lý redirect:", error);
        localStorage.removeItem("auth_redirect_triggered");
        
        // Ghi lại lỗi
        localStorage.setItem("auth_handler_error", JSON.stringify({
          time: Date.now(),
          message: error?.message || "Unknown error",
          stack: error?.stack || ""
        }));
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
        } catch (err: any) {
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

  // PHƯƠNG PHÁP ĐĂNG NHẬP 3.0: SỬ DỤNG IFRAME POPUP CHO ANDROID
  const signInWithGoogle = async () => {
    try {
      console.log("=== BẮT ĐẦU QUÁ TRÌNH ĐĂNG NHẬP MỚI (v3) ===");
      console.log("User Agent:", navigator.userAgent);
      
      // Làm sạch các trạng thái trước đó
      sessionStorage.removeItem("auth_in_progress");
      localStorage.removeItem("auth_redirect_triggered");
      
      // Phát hiện môi trường
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isWebView = /wv|WebView|PTCWV/.test(navigator.userAgent);
      const isAndroidWebView = isAndroid && isWebView;
      const isChromeOnAndroid = isAndroid && /Chrome/.test(navigator.userAgent) && !isWebView;
      
      console.log("🔍 Phát hiện môi trường:", { 
        isAndroid, 
        isWebView, 
        isAndroidWebView,
        isChromeOnAndroid
      });
      
      // Cài đặt biến cờ để tạo điểm kiểm tra
      const loginTimestamp = Date.now().toString();
      localStorage.setItem("auth_login_timestamp", loginTimestamp);
      
      // Cấu hình Google provider tối ưu cho môi trường
      googleProvider.addScope('profile');
      googleProvider.addScope('email');
      googleProvider.setCustomParameters({
        prompt: 'select_account',
        login_hint: `user_${loginTimestamp}@gmail.com`, // Tránh cache
        access_type: 'offline',
        include_granted_scopes: 'true'
      });
      
      // ĐẶC BIỆT: Xử lý WebView Android - CẢI TIẾN v4
      if (isAndroidWebView) {
        console.log("🔴 ĐẶC BIỆT: PHÁT HIỆN ANDROID WEBVIEW - SỬ DỤNG PHƯƠNG PHÁP HYBRID v4");
        
        // PHƯƠNG PHÁP MỚI: Giúp tránh lỗi chuyển hướng
        // - Không sử dụng redirect trong WebView
        // - Cố gắng sử dụng popup dù trong WebView để tránh lỗi chuyển hướng
        
        // 1. Đánh dấu thiết bị
        const deviceId = `android_${Date.now()}`;
        localStorage.setItem("ptc_device_id", deviceId);
        sessionStorage.setItem("auth_attempt_time", Date.now().toString());
        
        // 2. Đặt thời gian lưu trạng thái đăng nhập
        // Tăng tính bền bỉ của dữ liệu đăng nhập để tránh mất do chuyển trang/refresh
        setPersistence(auth, browserLocalPersistence)
          .then(() => {
            console.log("✅ Đã thiết lập LOCAL persistence cho WebView");
          })
          .catch((err) => {
            console.error("❌ Lỗi khi thiết lập persistence:", err);
          });
          
        // 3. ĐẶC BIỆT: Thử dùng popup trên WebView Android thay vì redirect
        console.log("⏩ WebView Android: THỬ DÙNG POPUP (phương pháp v4)");
        
        try {
          // Xóa bỏ một số trường tham số có thể gây lỗi
          const simplifiedProvider = googleProvider;
          // Đảm bảo có các scope cần thiết
          simplifiedProvider.addScope('email');
          simplifiedProvider.addScope('profile');
          
          // Thêm login_hint để tránh cache
          simplifiedProvider.setCustomParameters({
            prompt: 'select_account', 
            login_hint: `user_${Date.now()}@gmail.com`
          });
          
          // Thử dùng signInWithPopup ngay cả trên WebView
          // Đôi khi phương pháp này vẫn hoạt động trên một số thiết bị/ROM tùy biến
          console.log("🔄 Đang thử phương pháp POPUP cho WebView...");
          
          signInWithPopup(auth, simplifiedProvider)
            .then((result) => {
              if (result && result.user) {
                console.log("✅ THÀNH CÔNG: Đăng nhập WebView bằng popup!");
                
                // Lưu thông tin xác thực vào localStorage ngay lập tức
                localStorage.setItem("auth_user_email", result.user.email || "");
                localStorage.setItem("auth_user_name", result.user.displayName || "");
                localStorage.setItem("auth_user_uid", result.user.uid);
                localStorage.setItem("auth_completed", "true");
                localStorage.setItem("auth_method", "popup_webview");
                
                // Chuyển hướng đến dashboard
                setTimeout(() => {
                  navigate("/dashboard");
                }, 500);
              }
            })
            .catch((popupError) => {
              console.log("❌ Lỗi khi dùng popup trong WebView:", popupError);
              
              // Ghi log lỗi
              localStorage.setItem("webview_popup_error", JSON.stringify({
                time: Date.now(),
                error: popupError?.message || "Unknown error"
              }));
              
              // DỰ PHÒNG: Thử phương pháp redirect nếu popup thất bại
              console.log("⏩ Thử phương pháp REDIRECT cho WebView (dự phòng)...");
              localStorage.setItem("auth_redirect_triggered", "true");
              
              // Đợi 1 chút để đảm bảo localStorage được lưu
              setTimeout(() => {
                try {
                  signInWithRedirect(auth, googleProvider)
                    .catch((redirectError) => {
                      console.error("❌❌ Cả popup và redirect đều thất bại:", redirectError);
                      localStorage.removeItem("auth_redirect_triggered");
                    });
                } catch (finalError: any) {
                  console.error("❌❌❌ Lỗi chí mạng:", finalError);
                  localStorage.setItem("auth_critical_error", JSON.stringify({
                    time: Date.now(),
                    error: finalError?.message || "Unknown error"
                  }));
                }
              }, 300);
            });
        } catch (error: any) {
          console.error("❌ Lỗi khi khởi tạo đăng nhập WebView:", error);
          
          // Xóa cờ đánh dấu để tránh vòng lặp
          localStorage.removeItem("auth_redirect_triggered");
        }
      } 
      // Xử lý Chrome trên Android
      else if (isChromeOnAndroid) {
        console.log("🟠 PHÁT HIỆN CHROME TRÊN ANDROID - THỰC HIỆN THỬ NGHIỆM POPUP");
        sessionStorage.setItem("auth_in_progress", "true");
        
        try {
          // Thử popup trên Chrome Android
          console.log("⏩ Chrome Android: Thử phương pháp POPUP");
          const result = await signInWithPopup(auth, googleProvider);
          
          if (result && result.user) {
            console.log("✅ Chrome Android: Đăng nhập với Popup thành công!");
            sessionStorage.removeItem("auth_in_progress");
            
            // Lưu thông tin vào localStorage 
            localStorage.setItem("auth_user_email", result.user.email || "");
            localStorage.setItem("auth_user_name", result.user.displayName || "");
            localStorage.setItem("auth_user_uid", result.user.uid);
            localStorage.setItem("auth_completed", "true");
            
            // Đảm bảo dữ liệu được lưu trước khi chuyển trang
            setTimeout(() => {
              navigate("/dashboard");
            }, 300);
          }
        } catch (popupError: any) {
          console.error("❌ Chrome Android: Lỗi Popup:", popupError);
          console.log("⏩ Chrome Android: Thử phương pháp REDIRECT");
          
          // Ghi log và thực hiện redirect 
          localStorage.setItem("auth_popup_error", JSON.stringify({
            time: Date.now(),
            message: popupError?.message || "Unknown popup error"
          }));
          localStorage.setItem("auth_redirect_triggered", "true");
          
          try {
            await signInWithRedirect(auth, googleProvider);
          } catch (redirectError) {
            console.error("❌❌ Chrome Android: Cả hai phương pháp đều thất bại:", redirectError);
            localStorage.removeItem("auth_redirect_triggered");
          }
        }
      }
      // Xử lý trình duyệt desktop và các trường hợp khác
      else {
        console.log("🟢 MÔI TRƯỜNG DESKTOP/WEB TIÊU CHUẨN - SỬ DỤNG REDIRECT");
        
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (err) {
          console.error("❌ Lỗi khi thực hiện redirect:", err);
        }
      }
    } catch (error: any) {
      console.error("❌❌❌ LỖI NGHIÊM TRỌNG TRONG QUÁ TRÌNH ĐĂNG NHẬP:", error);
      
      // Ghi lại lỗi để phân tích
      localStorage.setItem("auth_critical_error", JSON.stringify({
        time: Date.now(),
        userAgent: navigator.userAgent,
        message: error?.message || 'Unknown error',
        code: error?.code || 'no_code'
      }));
      
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
