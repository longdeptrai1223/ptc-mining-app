import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import { useNotification } from "@/hooks/use-notification";

interface Referral {
  id: string;
  displayName: string;
  photoURL: string;
  joinedAt: Date;
  isActive: boolean;
}

interface ReferralContextType {
  inviteCode: string;
  referralCount: number;
  referralProgress: number;
  referralBoost: number;
  recentReferrals: Referral[];
  isInviteModalOpen: boolean;
  openInviteModal: () => void;
  closeInviteModal: () => void;
  copyInviteCode: () => void;
  copyReferralLink: () => void;
  shareViaWhatsapp: () => void;
  shareViaTwitter: () => void;
  shareViaFacebook: () => void;
  shareViaEmail: () => void;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

export function ReferralProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  const [inviteCode, setInviteCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [recentReferrals, setRecentReferrals] = useState<Referral[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // Derived state
  const referralProgress = Math.min(1, referralCount / 20);
  const referralBoost = Math.min(2, 1 + (referralCount * 0.1));

  // Load referral data from Firestore when user logs in
  useEffect(() => {
    if (!user) return;

    const loadReferralData = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setInviteCode(userData.inviteCode || "");
          setReferralCount(userData.referralCount || 0);
          
          // Fetch recent referrals
          const referralsQuery = query(
            collection(db, "referrals"),
            where("referrerId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(5)
          );
          
          const referralsSnapshot = await getDocs(referralsQuery);
          
          const referrals = await Promise.all(referralsSnapshot.docs.map(async (refDoc) => {
            const refData = refDoc.data();
            const referredUserDoc = await getDoc(doc(db, "users", refData.referredId));
            const referredUserData = referredUserDoc.exists() ? referredUserDoc.data() : {};
            
            // Check if user was active in the last week
            const lastActive = referredUserData.lastActive?.toDate() || new Date(0);
            const isActive = (Date.now() - lastActive.getTime()) < 7 * 24 * 60 * 60 * 1000;
            
            return {
              id: refDoc.id,
              displayName: referredUserData.displayName || "Anonymous",
              photoURL: referredUserData.photoURL || "",
              joinedAt: refData.createdAt.toDate(),
              isActive,
            };
          }));
          
          setRecentReferrals(referrals);
        }
      } catch (error) {
        console.error("Error loading referral data:", error);
      }
    };
    
    loadReferralData();
  }, [user]);

  // Open invite modal
  const openInviteModal = () => {
    setIsInviteModalOpen(true);
  };

  // Close invite modal
  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
  };

  // Copy invite code to clipboard
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode)
      .then(() => {
        showNotification("Invite code copied to clipboard!");
      })
      .catch(err => {
        console.error("Failed to copy invite code:", err);
      });
  };

  // Copy referral link to clipboard
  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/?ref=${inviteCode}`;
    
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        showNotification("Referral link copied to clipboard!");
      })
      .catch(err => {
        console.error("Failed to copy referral link:", err);
      });
  };

  // Share via WhatsApp
  const shareViaWhatsapp = () => {
    const referralLink = `${window.location.origin}/?ref=${inviteCode}`;
    const message = `Join me on PTC Coin and start mining virtual coins! Use my invite code: ${inviteCode} or click this link: ${referralLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  // Share via Twitter
  const shareViaTwitter = () => {
    const referralLink = `${window.location.origin}/?ref=${inviteCode}`;
    const message = `Join me on PTC Coin and start mining virtual coins! Use my invite code: ${inviteCode} ${referralLink}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    window.open(twitterUrl, "_blank");
  };

  // Share via Facebook
  const shareViaFacebook = () => {
    const referralLink = `${window.location.origin}/?ref=${inviteCode}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    window.open(facebookUrl, "_blank");
  };

  // Share via Email
  const shareViaEmail = () => {
    const referralLink = `${window.location.origin}/?ref=${inviteCode}`;
    const subject = "Join me on PTC Coin";
    const body = `Join me on PTC Coin and start mining virtual coins! Use my invite code: ${inviteCode} or click this link: ${referralLink}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
  };

  const value: ReferralContextType = {
    inviteCode,
    referralCount,
    referralProgress,
    referralBoost,
    recentReferrals,
    isInviteModalOpen,
    openInviteModal,
    closeInviteModal,
    copyInviteCode,
    copyReferralLink,
    shareViaWhatsapp,
    shareViaTwitter,
    shareViaFacebook,
    shareViaEmail,
  };

  return <ReferralContext.Provider value={value}>{children}</ReferralContext.Provider>;
}

export function useReferrals() {
  const context = useContext(ReferralContext);
  if (context === undefined) {
    throw new Error("useReferrals must be used within a ReferralProvider");
  }
  return context;
}
