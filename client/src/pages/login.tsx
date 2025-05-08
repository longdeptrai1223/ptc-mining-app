import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Phát hiện môi trường Android WebView
const isAndroid = /Android/i.test(navigator.userAgent);
const isWebView = /wv|WebView|PTCWV/.test(navigator.userAgent);

export default function Login() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [, navigate] = useLocation();
  const [waitingRedirect, setWaitingRedirect] = useState(false);
  const [androidWebViewDetected, setAndroidWebViewDetected] = useState(isAndroid || isWebView);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Xử lý trạng thái đăng nhập và chuyển hướng
  useEffect(() => {
    console.log("Login Page - Kiểm tra trạng thái đăng nhập:", 
                user ? `Đã đăng nhập (${user.displayName})` : "Chưa đăng nhập", 
                "Loading:", loading);
    
    // Kiểm tra nếu người dùng đăng nhập từ localStorage
    const savedUID = localStorage.getItem("auth_user_uid");
    const savedEmail = localStorage.getItem("auth_user_email");
    const isCompletedAuth = localStorage.getItem("auth_completed") === "true";
    
    if (savedUID && savedEmail || isCompletedAuth) {
      console.log("✅ Phát hiện thông tin đăng nhập đã lưu, chuyển hướng...");
      const timeoutId = setTimeout(() => {
        navigate("/dashboard");
      }, 200);
      return () => clearTimeout(timeoutId);
    }
    
    // Kiểm tra user đăng nhập thông thường
    if (user && !loading) {
      console.log("✅ Người dùng đã đăng nhập trong trang Login, chuyển hướng đến Dashboard");
      // Trì hoãn chuyển hướng với thời gian dài hơn để đảm bảo dữ liệu đã được lưu
      const timeoutId = setTimeout(() => {
        navigate("/dashboard");
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, loading, navigate]);

  // Parse referral code from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      // Store the referral code in local storage to use after login
      localStorage.setItem('ptc_referral_code', refCode);
    }
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <span className="material-icons text-white text-3xl">monetization_on</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Welcome to PTC Coin</CardTitle>
          <CardDescription className="text-center">Mine virtual coins, invite friends, and earn rewards!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Sign in with your Google account to start mining PTC coins. It's completely free!
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Key Features:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="material-icons text-primary mr-2 text-sm">check_circle</span>
                  <span>Mine 0.1 PTC every 24 hours</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons text-primary mr-2 text-sm">check_circle</span>
                  <span>Watch ads to boost mining rate by 5x</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons text-primary mr-2 text-sm">check_circle</span>
                  <span>Invite friends for permanent mining boosts</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons text-primary mr-2 text-sm">check_circle</span>
                  <span>Works offline and syncs automatically</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-primary hover:bg-indigo-700 text-white py-6 flex items-center justify-center gap-2"
            onClick={signInWithGoogle}
            disabled={loading}
          >
            {loading ? (
              <span className="material-icons animate-spin">refresh</span>
            ) : (
              <span className="material-icons">login</span>
            )}
            Sign in with Google
          </Button>
        </CardFooter>
      </Card>
      <div className="mt-4 text-center text-xs text-gray-500">
        <a href="/privacy-policy" className="hover:underline mr-4">Privacy Policy</a>
        <a href="/terms-of-service" className="hover:underline">Terms of Service</a>
      </div>
    </div>
  );
}
