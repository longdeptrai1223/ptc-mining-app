// Service Worker for PTC Coin PWA
const CACHE_NAME = 'ptc-coin-cache-v1';
const DATA_CACHE_NAME = 'ptc-coin-data-cache-v1';

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME;
          }).map((cacheName) => {
            console.log('Removing old cache', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('fonts.googleapis.com') && 
      !event.request.url.includes('fonts.gstatic.com')) {
    return;
  }
  
  // Handle API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME)
        .then((cache) => {
          return fetch(event.request)
            .then((response) => {
              // Cache the fresh data
              if (response.status === 200) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
            .catch(() => {
              // If network fails, try to get from cache
              return cache.match(event.request);
            });
        })
    );
    return;
  }
  
  // Handle static assets - Cache-First strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache the new asset if it's a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'mining-sync') {
    console.log('Executing background sync: mining-sync');
    event.waitUntil(syncMiningData());
  }
});

// Periodic Background Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mining-sync') {
    console.log('Executing periodic sync: mining-sync');
    event.waitUntil(syncMiningData());
  }
});

// Push Notification
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) return;
  
  const data = event.data.json();
  const title = data.title || 'PTC Coin';
  const options = {
    body: data.body || 'New notification from PTC Coin',
    icon: '/logo192.png',
    badge: '/favicon.ico',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // If we have a client, focus it
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

// Function to sync mining data with the server
async function syncMiningData() {
  try {
    // Open the IndexedDB database
    const DB_NAME = 'ptc-mining-db';
    const MINING_STORE = 'mining-data';
    
    // Check for a user ID
    const idbRequest = indexedDB.open(DB_NAME, 1);
    
    idbRequest.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction(MINING_STORE, 'readonly');
      const store = transaction.objectStore(MINING_STORE);
      
      // Get all mining data
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = function() {
        const miningData = getAllRequest.result;
        
        if (miningData && miningData.length > 0) {
          // Send mining data to the server
          fetch('/api/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: miningData }),
            credentials: 'include'
          })
          .then(response => {
            if (response.ok) {
              console.log('Mining data synced successfully');
            } else {
              console.error('Error syncing mining data:', response.statusText);
            }
          })
          .catch(error => {
            console.error('Error syncing mining data:', error);
          });
        }
      };
      
      getAllRequest.onerror = function(error) {
        console.error('Error getting mining data from IndexedDB:', error);
      };
    };
    
    idbRequest.onerror = function(error) {
      console.error('Error opening IndexedDB:', error);
    };
  } catch (error) {
    console.error('Error in syncMiningData:', error);
  }
}
