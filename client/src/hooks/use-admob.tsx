import { useCallback, useEffect, useState } from "react";
import { useMining } from "@/hooks/use-mining";
import { useNotification } from "@/hooks/use-notification";

// Định nghĩa kiểu window để bổ sung thuộc tính AdMob
declare global {
  interface Window {
    AdMob?: any;
  }
}

// ID AdMob
const ADMOB_APP_ID = "ca-app-pub-3940256099942544~3347511713"; // Thay bằng App ID thực của bạn
const TEST_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917"; // ID test của Google 
const REAL_AD_UNIT_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ"; // Thay bằng Ad Unit ID thực của bạn

export function useAdMob() {
  const { activateAdBuff } = useMining();
  const { showNotification } = useNotification();
  const [adInitialized, setAdInitialized] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);

  // Kiểm tra xem môi trường hiện tại có phải là web hay native
  const isNativeEnvironment = useCallback(() => {
    return typeof window !== 'undefined' && !!window.AdMob;
  }, []);

  // Khởi tạo AdMob
  const initializeAdMob = useCallback(() => {
    if (isNativeEnvironment()) {
      try {
        // Khởi tạo AdMob với App ID
        window.AdMob.initialize({
          appId: ADMOB_APP_ID, // Sử dụng App ID đã khai báo ở trên
        });
        console.log("AdMob initialized successfully");
        setAdInitialized(true);
      } catch (error) {
        console.error("Error initializing AdMob:", error);
        // Trong trường hợp lỗi, chuyển sang chế độ giả lập
        setAdInitialized(false);
      }
    } else {
      console.log("AdMob not available in this environment, using simulation mode");
    }
  }, [isNativeEnvironment]);

  // Tải quảng cáo có thưởng
  const loadRewardedAd = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (isNativeEnvironment() && adInitialized) {
        try {
          // Quyết định sử dụng ID thực tế hay ID test
          const isProduction = process.env.NODE_ENV === 'production';
          const adUnitId = isProduction ? REAL_AD_UNIT_ID : TEST_AD_UNIT_ID;
          
          console.log(`Using ${isProduction ? 'PRODUCTION' : 'TEST'} ad unit ID`);
            
          // Đăng ký các sự kiện quảng cáo
          window.AdMob.addListener('onRewardedVideoAdLoaded', () => {
            console.log("Rewarded ad loaded successfully");
            setAdLoaded(true);
            resolve();
          });
          
          window.AdMob.addListener('onRewardedVideoAdFailedToLoad', (error: any) => {
            console.error("Failed to load rewarded ad:", error);
            reject(error);
          });
          
          // Tải quảng cáo
          window.AdMob.loadRewardedVideoAd({
            adId: adUnitId,
          });
        } catch (error) {
          console.error("Error loading rewarded ad:", error);
          reject(error);
        }
      } else {
        // Giả lập tải quảng cáo trong môi trường web
        console.log("Simulating ad load in web environment");
        setTimeout(() => {
          setAdLoaded(true);
          resolve();
        }, 1000);
      }
    });
  }, [isNativeEnvironment, adInitialized]);

  // Hiển thị quảng cáo có thưởng
  const showRewardedAd = useCallback(() => {
    return new Promise<boolean>((resolve, reject) => {
      if (isNativeEnvironment() && adInitialized && adLoaded) {
        try {
          // Đăng ký các sự kiện quảng cáo
          window.AdMob.addListener('onRewardedVideoAdClosed', () => {
            console.log("Rewarded ad closed");
            setAdLoaded(false);
            loadRewardedAd(); // Tải quảng cáo mới khi đóng
          });
          
          window.AdMob.addListener('onRewarded', (reward: any) => {
            console.log("User rewarded:", reward);
            activateAdBuff();
            resolve(true);
          });
          
          window.AdMob.addListener('onRewardedVideoAdFailedToShow', (error: any) => {
            console.error("Failed to show rewarded ad:", error);
            reject(error);
          });
          
          // Hiển thị quảng cáo
          window.AdMob.showRewardedVideoAd();
        } catch (error) {
          console.error("Error showing rewarded ad:", error);
          reject(error);
        }
      } else {
        // Giả lập hiển thị quảng cáo trong môi trường web
        console.log("Simulating ad view in web environment");
        setTimeout(() => {
          activateAdBuff();
          showNotification("Ad reward granted!");
          resolve(true);
        }, 1000);
      }
    });
  }, [isNativeEnvironment, adInitialized, adLoaded, activateAdBuff, showNotification, loadRewardedAd]);

  // Xử lý toàn bộ quy trình quảng cáo
  const watchRewardedAd = useCallback(async () => {
    try {
      if (!adLoaded) {
        await loadRewardedAd();
      }
      const completed = await showRewardedAd();
      return completed;
    } catch (error) {
      console.error("Error in ad flow:", error);
      showNotification("Error showing ad. Please try again.");
      return false;
    }
  }, [loadRewardedAd, showRewardedAd, adLoaded, showNotification]);

  // Khởi tạo AdMob khi component được mount
  useEffect(() => {
    initializeAdMob();
    return () => {
      // Cleanup event listeners when component unmounts
      if (isNativeEnvironment() && window.AdMob) {
        window.AdMob.removeAllListeners();
      }
    };
  }, [initializeAdMob, isNativeEnvironment]);

  // Pre-load an ad when initialized
  useEffect(() => {
    if (adInitialized && !adLoaded) {
      loadRewardedAd().catch(err => console.error("Initial ad load failed:", err));
    }
  }, [adInitialized, adLoaded, loadRewardedAd]);

  return {
    initializeAdMob,
    watchRewardedAd,
    adInitialized,
  };
}
