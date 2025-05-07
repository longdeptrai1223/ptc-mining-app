import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import { useNotification } from "@/hooks/use-notification";
import { openDB } from "idb";
import { useReferrals } from "@/hooks/use-referrals";

interface MiningContextType {
  miningActive: boolean;
  miningTimeRemaining: number | null;
  adBuffActive: boolean;
  adBuffTimeRemaining: number | null;
  adBuffMultiplier: number;
  permanentBuffMultiplier: number;
  totalMultiplier: number;
  totalCoins: number;
  miningRate: number;
  recentEarnings: number;
  toggleMining: () => Promise<void>;
  activateAdBuff: () => Promise<void>;
  miningHistory: MiningHistoryItem[];
  fetchMiningHistory: () => Promise<void>;
}

interface MiningHistoryItem {
  id: string;
  date: Date;
  amount: number;
  multiplier: number;
  status: string;
}

interface MiningData {
  userId: string;
  miningStartTime: number | null;
  miningEndTime: number | null;
  adBuffExpiry: number | null;
  totalCoins: number;
  syncedAt: number;
}

const MiningContext = createContext<MiningContextType | undefined>(undefined);

const DB_NAME = "ptc-mining-db";
const MINING_STORE = "mining-data";

// Initialize IndexedDB
const initializeDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(MINING_STORE)) {
        db.createObjectStore(MINING_STORE);
      }
    },
  });
};

export function MiningProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { referralCount } = useReferrals();
  
  const [miningActive, setMiningActive] = useState(false);
  const [miningStartTime, setMiningStartTime] = useState<number | null>(null);
  const [miningEndTime, setMiningEndTime] = useState<number | null>(null);
  const [adBuffActive, setAdBuffActive] = useState(false);
  const [adBuffExpiry, setAdBuffExpiry] = useState<number | null>(null);
  const [adBuffMultiplier, setAdBuffMultiplier] = useState(5);
  const [permanentBuffMultiplier, setPermanentBuffMultiplier] = useState(1);
  const [totalCoins, setTotalCoins] = useState(0);
  const [miningRate, setMiningRate] = useState(0.1);
  const [recentEarnings, setRecentEarnings] = useState(0);
  const [miningHistory, setMiningHistory] = useState<MiningHistoryItem[]>([]);
  const [intervalId, setIntervalId] = useState<number | null>(null);

  // Derived state
  const miningTimeRemaining = miningEndTime ? Math.max(0, miningEndTime - Date.now()) : null;
  const adBuffTimeRemaining = adBuffExpiry ? Math.max(0, adBuffExpiry - Date.now()) : null;
  const totalMultiplier = Math.min(10, permanentBuffMultiplier * (adBuffActive ? adBuffMultiplier : 1));

  // Load mining data from Firestore when user logs in
  useEffect(() => {
    if (!user) return;

    const loadMiningData = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Set mining rate and total coins
          setMiningRate(userData.miningRate || 0.1);
          setTotalCoins(userData.totalCoins || 0);
          
          // Set permanent buff multiplier based on referral count
          const referralBuff = Math.min(2, 1 + (referralCount * 0.1));
          setPermanentBuffMultiplier(referralBuff);
          
          // Check if ad buff is active
          if (userData.temporaryBuffExpiry && userData.temporaryBuffExpiry.toMillis() > Date.now()) {
            setAdBuffActive(true);
            setAdBuffExpiry(userData.temporaryBuffExpiry.toMillis());
            setAdBuffMultiplier(userData.temporaryBuffMultiplier || 5);
          }
          
          // Check for active mining session
          const miningSessionsQuery = query(
            collection(db, "miningSessions"),
            where("userId", "==", user.uid),
            where("status", "==", "active"),
            limit(1)
          );
          
          const sessionsSnapshot = await getDocs(miningSessionsQuery);
          
          if (!sessionsSnapshot.empty) {
            const sessionData = sessionsSnapshot.docs[0].data();
            setMiningActive(true);
            setMiningStartTime(sessionData.startTime.toMillis());
            setMiningEndTime(sessionData.endTime.toMillis());
          }
          
          // Get recent earnings (last 24 hours)
          const recentEarningsQuery = query(
            collection(db, "miningSessions"),
            where("userId", "==", user.uid),
            where("status", "==", "completed"),
            where("endTime", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000))
          );
          
          const recentSnapshot = await getDocs(recentEarningsQuery);
          const totalRecent = recentSnapshot.docs.reduce(
            (sum, doc) => sum + (doc.data().amount || 0),
            0
          );
          
          setRecentEarnings(totalRecent);
        }
        
        // Also load data from IndexedDB for offline support
        await loadFromIndexedDB();
        
        // Fetch mining history
        await fetchMiningHistory();
      } catch (error) {
        console.error("Error loading mining data:", error);
      }
    };
    
    loadMiningData();
    startRefreshInterval();
    
    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [user, referralCount]);

  // Update ad buff status when timer expires
  useEffect(() => {
    if (!adBuffActive || !adBuffExpiry) return;
    
    const checkAdBuffExpiry = () => {
      if (Date.now() >= adBuffExpiry) {
        setAdBuffActive(false);
        setAdBuffExpiry(null);
        
        // Update user document in Firestore
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          updateDoc(userDocRef, {
            temporaryBuffMultiplier: 1,
            temporaryBuffExpiry: null,
          }).catch(error => {
            console.error("Error updating ad buff status:", error);
          });
        }
      }
    };
    
    const timer = window.setInterval(checkAdBuffExpiry, 1000);
    return () => window.clearInterval(timer);
  }, [adBuffActive, adBuffExpiry, user]);

  // Check for mining completion
  useEffect(() => {
    if (!miningActive || !miningEndTime) return;
    
    const checkMiningCompletion = () => {
      if (Date.now() >= miningEndTime) {
        completeMiningCycle();
      }
    };
    
    const timer = window.setInterval(checkMiningCompletion, 1000);
    return () => window.clearInterval(timer);
  }, [miningActive, miningEndTime]);

  // Load data from IndexedDB
  const loadFromIndexedDB = async () => {
    if (!user) return;
    
    try {
      const db = await initializeDB();
      const miningData = await db.get(MINING_STORE, user.uid) as MiningData;
      
      if (miningData) {
        // If the data is newer than what we have, use it
        if (!miningStartTime || (miningData.miningStartTime && miningData.miningStartTime > miningStartTime)) {
          setMiningActive(!!miningData.miningStartTime);
          setMiningStartTime(miningData.miningStartTime);
          setMiningEndTime(miningData.miningEndTime);
        }
        
        if (!adBuffExpiry || (miningData.adBuffExpiry && miningData.adBuffExpiry > (adBuffExpiry || 0))) {
          setAdBuffActive(!!miningData.adBuffExpiry);
          setAdBuffExpiry(miningData.adBuffExpiry);
        }
        
        // Always use the highest coin count to avoid losing coins
        if (miningData.totalCoins > totalCoins) {
          setTotalCoins(miningData.totalCoins);
        }
      }
    } catch (error) {
      console.error("Error loading from IndexedDB:", error);
    }
  };

  // Save data to IndexedDB
  const saveToIndexedDB = async () => {
    if (!user) return;
    
    try {
      const db = await initializeDB();
      
      await db.put(MINING_STORE, {
        userId: user.uid,
        miningStartTime,
        miningEndTime,
        adBuffExpiry,
        totalCoins,
        syncedAt: Date.now(),
      }, user.uid);
    } catch (error) {
      console.error("Error saving to IndexedDB:", error);
    }
  };

  // Refresh interval for updating timers
  const startRefreshInterval = () => {
    const id = window.setInterval(() => {
      saveToIndexedDB();
    }, 10000); // Save to IndexedDB every 10 seconds
    
    setIntervalId(id);
  };

  // Toggle mining status
  const toggleMining = async () => {
    if (!user) return;
    
    try {
      if (miningActive) {
        // Stop mining
        setMiningActive(false);
        setMiningStartTime(null);
        setMiningEndTime(null);
        
        // Update Firestore
        const miningSessionsQuery = query(
          collection(db, "miningSessions"),
          where("userId", "==", user.uid),
          where("status", "==", "active"),
          limit(1)
        );
        
        const sessionsSnapshot = await getDocs(miningSessionsQuery);
        
        if (!sessionsSnapshot.empty) {
          const sessionRef = doc(db, "miningSessions", sessionsSnapshot.docs[0].id);
          await updateDoc(sessionRef, {
            status: "cancelled",
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        // Start mining
        const startTime = Date.now();
        const endTime = startTime + (24 * 60 * 60 * 1000); // 24 hours
        
        setMiningActive(true);
        setMiningStartTime(startTime);
        setMiningEndTime(endTime);
        
        // Create new mining session in Firestore
        await addDoc(collection(db, "miningSessions"), {
          userId: user.uid,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: "active",
          multiplier: totalMultiplier,
          expectedAmount: miningRate * totalMultiplier,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      
      // Save to IndexedDB
      await saveToIndexedDB();
    } catch (error) {
      console.error("Error toggling mining status:", error);
    }
  };

  // Activate ad buff
  const activateAdBuff = async () => {
    if (!user) return;
    
    try {
      // Calculate new expiry time (add 2 hours or extend current time)
      const now = Date.now();
      const newExpiry = adBuffActive && adBuffExpiry 
        ? Math.min(adBuffExpiry + (2 * 60 * 60 * 1000), now + (24 * 60 * 60 * 1000)) 
        : now + (2 * 60 * 60 * 1000);
      
      setAdBuffActive(true);
      setAdBuffExpiry(newExpiry);
      setAdBuffMultiplier(5);
      
      // Update user document in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        temporaryBuffMultiplier: 5,
        temporaryBuffExpiry: new Date(newExpiry),
      });
      
      // Save to IndexedDB
      await saveToIndexedDB();
      
      // Show notification
      showNotification("Mining buff activated! 5x boost for 2 hours.");
    } catch (error) {
      console.error("Error activating ad buff:", error);
    }
  };

  // Complete mining cycle
  const completeMiningCycle = async () => {
    if (!user || !miningStartTime || !miningEndTime) return;
    
    try {
      // Calculate rewards
      const amount = miningRate * totalMultiplier;
      const newTotalCoins = totalCoins + amount;
      
      setTotalCoins(newTotalCoins);
      setMiningActive(false);
      setMiningStartTime(null);
      setMiningEndTime(null);
      
      // Update Firestore
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        totalCoins: newTotalCoins,
        lastActive: serverTimestamp(),
      });
      
      // Update mining session
      const miningSessionsQuery = query(
        collection(db, "miningSessions"),
        where("userId", "==", user.uid),
        where("status", "==", "active"),
        limit(1)
      );
      
      const sessionsSnapshot = await getDocs(miningSessionsQuery);
      
      if (!sessionsSnapshot.empty) {
        const sessionRef = doc(db, "miningSessions", sessionsSnapshot.docs[0].id);
        await updateDoc(sessionRef, {
          status: "completed",
          amount,
          updatedAt: serverTimestamp(),
        });
      }
      
      // Add to recent earnings
      setRecentEarnings(prev => prev + amount);
      
      // Save to IndexedDB
      await saveToIndexedDB();
      
      // Show notification
      showNotification(`Mining cycle completed! You earned ${amount.toFixed(2)} PTC`);
      
      // Refresh mining history
      await fetchMiningHistory();
    } catch (error) {
      console.error("Error completing mining cycle:", error);
    }
  };

  // Fetch mining history
  const fetchMiningHistory = async () => {
    if (!user) return;
    
    try {
      const historyQuery = query(
        collection(db, "miningSessions"),
        where("userId", "==", user.uid),
        where("status", "in", ["completed", "cancelled"]),
        orderBy("endTime", "desc"),
        limit(10)
      );
      
      const historySnapshot = await getDocs(historyQuery);
      
      const history = historySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.endTime.toDate(),
          amount: data.amount || 0,
          multiplier: data.multiplier || 1,
          status: data.status,
        };
      });
      
      setMiningHistory(history);
    } catch (error) {
      console.error("Error fetching mining history:", error);
    }
  };

  const value: MiningContextType = {
    miningActive,
    miningTimeRemaining,
    adBuffActive,
    adBuffTimeRemaining,
    adBuffMultiplier,
    permanentBuffMultiplier,
    totalMultiplier,
    totalCoins,
    miningRate,
    recentEarnings,
    toggleMining,
    activateAdBuff,
    miningHistory,
    fetchMiningHistory,
  };

  return <MiningContext.Provider value={value}>{children}</MiningContext.Provider>;
}

export function useMining() {
  const context = useContext(MiningContext);
  if (context === undefined) {
    throw new Error("useMining must be used within a MiningProvider");
  }
  return context;
}
