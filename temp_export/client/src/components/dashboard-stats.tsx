import { useMining } from "@/hooks/use-mining";
import { useReferrals } from "@/hooks/use-referrals";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardStats() {
  const { 
    totalCoins, 
    recentEarnings, 
    totalMultiplier, 
    adBuffActive, 
    permanentBuffMultiplier 
  } = useMining();
  
  const { referralCount } = useReferrals();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-white rounded-xl shadow">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Total Balance</h3>
              <p className="mt-1 text-3xl font-bold text-gray-900">{totalCoins.toFixed(1)} PTC</p>
            </div>
            <span className="material-icons text-primary text-2xl">account_balance_wallet</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <span className="material-icons text-secondary mr-1 text-sm">trending_up</span>
            <span>+{recentEarnings.toFixed(1)} PTC in last 24h</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white rounded-xl shadow">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Mining Power</h3>
              <div className="flex items-end">
                <p className="mt-1 text-3xl font-bold text-gray-900">{totalMultiplier.toFixed(1)}x</p>
                <p className="ml-2 text-sm text-gray-500 mb-1">base rate</p>
              </div>
            </div>
            <span className="material-icons text-primary text-2xl">speed</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {permanentBuffMultiplier > 1 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="material-icons text-xs mr-1">people</span>
                {permanentBuffMultiplier.toFixed(1)}x Referrals
              </span>
            )}
            
            {adBuffActive && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <span className="material-icons text-xs mr-1">movie</span>
                5.0x Ad Buff
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white rounded-xl shadow">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Network</h3>
              <p className="mt-1 text-3xl font-bold text-gray-900">{referralCount} Referrals</p>
            </div>
            <span className="material-icons text-primary text-2xl">share</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <span className="material-icons text-secondary mr-1 text-sm">people</span>
            <span>{Math.ceil(referralCount * 0.3)} active in last week</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
