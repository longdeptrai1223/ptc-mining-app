import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMining } from "@/hooks/use-mining";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { openDB } from "idb";
import { useNotification } from "@/hooks/use-notification";

interface SyncContextType {
  isOffline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  forceSyncData: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const DB_NAME = "ptc-mining-db";
const MINING_STORE = "mining-data";
const SYNC_STORE = "sync-data";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { totalCoins, miningActive, adBuffActive, adBuffTimeRemaining } = useMining();
  const { showNotification } = useNotification();
  
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [periodicSyncRegistered, setPeriodicSyncRegistered] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showNotification("You're back online! Syncing data...");
      forceSyncData();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      showNotification("You're offline. Mining will continue in the background.");
    };
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Register service worker and periodic sync
  useEffect(() => {
    if (periodicSyncRegistered) return;
    
    const registerPeriodicSync = async () => {
      if (!('serviceWorker' in navigator) || !('PeriodicSyncManager' in window)) {
        console.log('Periodic Sync not supported');
        return;
      }
      
      try {
        const registration = await navigator.serviceWorker.ready;
        
        if (!('periodicSync' in registration)) {
          console.log('Periodic Sync not available in service worker');
          return;
        }
        
        // Check if we already have permission
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });
        
        if (status.state === 'granted') {
          // Register periodic sync with tag and minimum interval
          await registration.periodicSync.register('mining-sync', {
            minInterval: 60 * 60 * 1000, // 1 hour in milliseconds
          });
          
          console.log('Periodic sync registered');
          setPeriodicSyncRegistered(true);
        } else {
          console.log('Permission for periodic sync not granted');
        }
      } catch (error) {
        console.error('Error registering periodic sync:', error);
      }
    };
    
    registerPeriodicSync();
  }, [periodicSyncRegistered]);

  // Automatic sync every 30 minutes if the app is open
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (user && !isOffline) {
        syncData();
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => clearInterval(syncInterval);
  }, [user, isOffline]);

  // Sync data when user state changes
  useEffect(() => {
    if (user && !isOffline) {
      syncData();
    }
  }, [user, totalCoins, miningActive, adBuffActive, adBuffTimeRemaining]);

  // Initialize IndexedDB
  const initializeDB = async () => {
    return openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(MINING_STORE)) {
          db.createObjectStore(MINING_STORE);
        }
        if (!db.objectStoreNames.contains(SYNC_STORE)) {
          db.createObjectStore(SYNC_STORE);
        }
      },
    });
  };

  // Sync data between IndexedDB and Firestore
  const syncData = async () => {
    if (!user || isSyncing) return;
    
    try {
      setIsSyncing(true);
      
      const db = await initializeDB();
      const miningData = await db.get(MINING_STORE, user.uid);
      
      if (miningData) {
        // Update Firestore with the latest data
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          totalCoins,
          lastActive: serverTimestamp(),
        });
        
        // Update sync timestamp
        const now = new Date();
        await db.put(SYNC_STORE, now, 'lastSyncTime');
        setLastSyncTime(now);
      }
    } catch (error) {
      console.error("Error syncing data:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Force sync data (triggered manually or after coming back online)
  const forceSyncData = async () => {
    if (!user || !navigator.onLine) return;
    
    try {
      setIsSyncing(true);
      
      // Update Firestore with the latest data
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        totalCoins,
        lastActive: serverTimestamp(),
      });
      
      // Update sync timestamp
      const now = new Date();
      const db = await initializeDB();
      await db.put(SYNC_STORE, now, 'lastSyncTime');
      setLastSyncTime(now);
      
      showNotification("Data synced successfully!");
    } catch (error) {
      console.error("Error forcing data sync:", error);
      showNotification("Error syncing data. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const value: SyncContextType = {
    isOffline,
    isSyncing,
    lastSyncTime,
    forceSyncData,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
}
