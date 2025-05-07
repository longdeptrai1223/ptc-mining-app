import { useSync } from "@/hooks/use-sync";

export function OfflineIndicator() {
  const { isOffline } = useSync();
  
  if (!isOffline) return null;
  
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-red-500 text-white px-4 py-2 text-center">
      <div className="flex items-center justify-center">
        <span className="material-icons mr-2">wifi_off</span>
        <p className="text-sm font-medium">You're offline. Mining will continue in the background.</p>
      </div>
    </div>
  );
}
