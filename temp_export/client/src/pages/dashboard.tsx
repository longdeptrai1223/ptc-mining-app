import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAdMob } from "@/hooks/use-admob";
import { useNotification } from "@/hooks/use-notification";
import Header from "@/components/header";
import DashboardStats from "@/components/dashboard-stats";
import MiningControl from "@/components/mining-control";
import ReferralPanel from "@/components/referral-panel";
import MiningHistory from "@/components/mining-history";
import BottomNav from "@/components/bottom-nav";
import NotificationToast from "@/components/notification-toast";
import InviteModal from "@/components/invite-modal";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { initializeAdMob } = useAdMob();
  const { requestNotificationPermission } = useNotification();
  const [, navigate] = useLocation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Initialize AdMob
  useEffect(() => {
    initializeAdMob();
  }, [initializeAdMob]);

  // Request notification permission
  useEffect(() => {
    if (user) {
      requestNotificationPermission();
    }
  }, [user, requestNotificationPermission]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <DashboardStats />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <MiningControl />
          <ReferralPanel />
        </div>
        
        <MiningHistory />
      </main>
      
      <BottomNav />
      <NotificationToast />
      <InviteModal />
    </div>
  );
}
