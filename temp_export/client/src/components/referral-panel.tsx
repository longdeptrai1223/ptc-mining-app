import { useEffect } from "react";
import { useReferrals } from "@/hooks/use-referrals";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

export default function ReferralPanel() {
  const { 
    inviteCode, 
    referralCount, 
    referralProgress, 
    referralBoost, 
    recentReferrals, 
    copyInviteCode, 
    openInviteModal
  } = useReferrals();

  // Listen for open-invite-modal event
  useEffect(() => {
    const handleOpenModal = () => {
      openInviteModal();
    };
    
    document.addEventListener('open-invite-modal', handleOpenModal);
    
    return () => {
      document.removeEventListener('open-invite-modal', handleOpenModal);
    };
  }, [openInviteModal]);

  return (
    <Card className="bg-white rounded-xl shadow overflow-hidden">
      <CardHeader className="p-6 bg-gradient-to-r from-emerald-500 to-emerald-600">
        <h2 className="text-xl font-bold text-white mb-1">Referral Network</h2>
        <p className="text-emerald-100">Earn permanent mining boosts</p>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Referral Stats */}
        <div className="flex items-center justify-between mb-6 bg-gray-50 p-4 rounded-lg">
          <div>
            <h3 className="text-lg font-medium">Your Network</h3>
            <p className="text-gray-500 text-sm">{referralCount} of 20 referrals</p>
          </div>
          <div className="w-16 h-16 relative">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <circle 
                className="countdown-ring" 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="#10B981" 
                strokeWidth="8" 
                strokeDashoffset={283 - (283 * referralProgress)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-bold text-secondary">{Math.round(referralProgress * 100)}%</span>
            </div>
          </div>
        </div>
        
        {/* Referral Link */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Your Invite Code</h3>
          <div className="flex items-center">
            <Input
              type="text"
              value={inviteCode}
              className="flex-grow bg-gray-50 p-3 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
              readOnly
            />
            <Button 
              className="bg-secondary hover:bg-emerald-700 text-white p-3 rounded-r-lg transition-all"
              onClick={copyInviteCode}
            >
              <span className="material-icons">content_copy</span>
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Share this code with friends or use the sharing options below</p>
        </div>
        
        {/* Sharing Options */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Share With Friends</h3>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              className="flex-1 bg-white hover:bg-gray-50 text-blue-600 border border-gray-200 font-medium py-2 rounded transition-all"
              onClick={openInviteModal}
            >
              <span className="material-icons">share</span>
            </Button>
            <Button 
              variant="outline"
              className="flex-1 bg-white hover:bg-gray-50 text-blue-600 border border-gray-200 font-medium py-2 rounded transition-all"
              onClick={openInviteModal}
            >
              <span className="material-icons">whatsapp</span>
            </Button>
            <Button 
              variant="outline"
              className="flex-1 bg-white hover:bg-gray-50 text-blue-600 border border-gray-200 font-medium py-2 rounded transition-all"
              onClick={openInviteModal}
            >
              <span className="material-icons">facebook</span>
            </Button>
            <Button 
              variant="outline"
              className="flex-1 bg-white hover:bg-gray-50 text-blue-600 border border-gray-200 font-medium py-2 rounded transition-all"
              onClick={openInviteModal}
            >
              <span className="material-icons">email</span>
            </Button>
          </div>
        </div>
        
        {/* Referral Benefits */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium mb-2">Referral Benefits</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="material-icons text-secondary mr-2 text-sm">check_circle</span>
              <span>+0.1x permanent mining boost per referral</span>
            </li>
            <li className="flex items-start">
              <span className="material-icons text-secondary mr-2 text-sm">check_circle</span>
              <span>Up to 2.0x boost from 20 referrals</span>
            </li>
            <li className="flex items-start">
              <span className="material-icons text-secondary mr-2 text-sm">check_circle</span>
              <span>After 20 referrals, earn 5% of your network's mining</span>
            </li>
          </ul>
        </div>
        
        {/* Recent Referrals */}
        <div>
          <h3 className="text-lg font-medium mb-3">Recent Referrals</h3>
          {recentReferrals.length > 0 ? (
            <div className="space-y-3">
              {recentReferrals.map(referral => (
                <div key={referral.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden mr-3">
                      {referral.photoURL ? (
                        <img 
                          src={referral.photoURL} 
                          alt="User" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="material-icons text-gray-400 flex items-center justify-center h-full">
                          person
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{referral.displayName.split(' ')[0]} {referral.displayName.split(' ')[1]?.charAt(0) || ''}.</p>
                      <p className="text-xs text-gray-500">Joined {formatDistanceToNow(referral.joinedAt, { addSuffix: true })}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${referral.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} px-2 py-1 rounded`}>
                    {referral.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <p>No referrals yet. Invite friends to start earning rewards!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
