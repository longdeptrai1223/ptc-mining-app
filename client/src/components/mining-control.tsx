import { useEffect, useState } from "react";
import { useMining } from "@/hooks/use-mining";
import { useAdMob } from "@/hooks/use-admob";
import { useReferrals } from "@/hooks/use-referrals";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Card, 
  CardHeader, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function MiningControl() {
  const { 
    miningActive, 
    miningTimeRemaining, 
    toggleMining, 
    adBuffActive, 
    adBuffTimeRemaining, 
    permanentBuffMultiplier 
  } = useMining();
  
  const { watchRewardedAd } = useAdMob();
  const { referralBoost } = useReferrals();
  
  const [timeRemainingText, setTimeRemainingText] = useState("");
  const [adTimeRemainingText, setAdTimeRemainingText] = useState("");
  const [countdownProgress, setCountdownProgress] = useState(0);
  const [adBuffProgress, setAdBuffProgress] = useState(0);

  // Update countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (miningActive && miningTimeRemaining !== null) {
        const hours = Math.floor(miningTimeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((miningTimeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemainingText(`${hours}h ${minutes}m remaining`);
        
        // Calculate progress (0-100%)
        const totalDuration = 24 * 60 * 60 * 1000; // 24 hours in ms
        const elapsed = totalDuration - miningTimeRemaining;
        const progress = (elapsed / totalDuration) * 100;
        setCountdownProgress(progress);
      } else {
        setTimeRemainingText("Ready to mine");
        setCountdownProgress(0);
      }
      
      if (adBuffActive && adBuffTimeRemaining !== null) {
        const hours = Math.floor(adBuffTimeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((adBuffTimeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        setAdTimeRemainingText(`${hours}h ${minutes}m remaining`);
        
        // Calculate progress (0-100%)
        const totalDuration = 2 * 60 * 60 * 1000; // 2 hours in ms
        const progress = (adBuffTimeRemaining / totalDuration) * 100;
        setAdBuffProgress(Math.min(100, progress));
      } else {
        setAdTimeRemainingText("Not active");
        setAdBuffProgress(0);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [miningActive, miningTimeRemaining, adBuffActive, adBuffTimeRemaining]);

  const handleWatchAd = async () => {
    await watchRewardedAd();
  };

  return (
    <Card className="lg:col-span-2 bg-white rounded-xl shadow overflow-hidden">
      <CardHeader className="p-6 bg-gradient-to-r from-indigo-500 to-indigo-600">
        <h2 className="text-xl font-bold text-white mb-1">Mining Control</h2>
        <p className="text-indigo-100">Mine 0.1 PTC every 24 hours</p>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Mining Status */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="relative mr-4">
              <svg className="w-16 h-16" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                <circle 
                  className="countdown-ring" 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#6366F1" 
                  strokeWidth="8" 
                  strokeDashoffset={283 - (283 * countdownProgress / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-icons text-primary text-2xl">history</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium">Mining Status</h3>
              <p className="text-gray-500 text-sm">
                {timeRemainingText}
              </p>
            </div>
          </div>
          
          <Button 
            className={`${miningActive ? 'mining-pulse' : ''} bg-primary hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg shadow-lg flex items-center transition-all duration-300`}
            onClick={toggleMining}
          >
            <span className="material-icons mr-2">flash_on</span>
            <span>{miningActive ? 'Mining Active' : 'Start Mining'}</span>
          </Button>
        </div>
        
        {/* Boost Mining Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Boost Your Mining</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ad Boost */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="material-icons text-accent mr-2">movie</span>
                  <h4 className="font-medium">Ad Boost</h4>
                </div>
                <span className="bg-accent/10 text-accent text-xs font-medium px-2 py-1 rounded">+5x for 2h</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">Watch an ad to boost your mining rate by 5x for 2 hours. Stackable up to 24 hours.</p>
              <Button 
                variant="outline"
                className="w-full bg-white hover:bg-gray-50 text-accent border border-accent font-medium py-2 px-4 rounded flex items-center justify-center transition-all"
                onClick={handleWatchAd}
              >
                <span className="material-icons mr-2">play_circle</span>
                Watch Ad
              </Button>
            </div>
            
            {/* Referral Boost */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="material-icons text-secondary mr-2">people</span>
                  <h4 className="font-medium">Referral Boost</h4>
                </div>
                <span className="bg-secondary/10 text-secondary text-xs font-medium px-2 py-1 rounded">+0.1x per referral</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">Invite friends to get a permanent mining boost. Current boost: {referralBoost.toFixed(1)}x</p>
              <Button 
                variant="outline"
                className="w-full bg-white hover:bg-gray-50 text-secondary border border-secondary font-medium py-2 px-4 rounded flex items-center justify-center transition-all"
                onClick={() => document.dispatchEvent(new CustomEvent('open-invite-modal'))}
              >
                <span className="material-icons mr-2">share</span>
                Invite Friends
              </Button>
            </div>
          </div>
        </div>
        
        {/* Active Boosts */}
        <div>
          <h3 className="text-lg font-medium mb-3">Active Boosts</h3>
          
          <div className="space-y-3">
            {/* Ad Boost Status */}
            {adBuffActive && (
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="material-icons text-accent mr-3">movie</span>
                  <div>
                    <h4 className="font-medium">Ad Boost</h4>
                    <p className="text-sm text-gray-600">5.0x multiplier</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{adTimeRemainingText}</p>
                  <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                    <div 
                      className="h-2 bg-accent rounded-full" 
                      style={{ width: `${adBuffProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Referral Boost Status */}
            {permanentBuffMultiplier > 1 && (
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="material-icons text-secondary mr-3">people</span>
                  <div>
                    <h4 className="font-medium">Referral Boost</h4>
                    <p className="text-sm text-gray-600">{Math.floor((permanentBuffMultiplier - 1) * 10)} referrals</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{permanentBuffMultiplier.toFixed(1)}x permanent</p>
                  <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                    <div 
                      className="h-2 bg-secondary rounded-full" 
                      style={{ width: `${Math.min(100, (permanentBuffMultiplier - 1) * 50)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {!adBuffActive && permanentBuffMultiplier === 1 && (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                <p>No active boosts. Watch an ad or invite friends to boost your mining rate!</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
