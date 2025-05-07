import { useEffect } from "react";
import { useReferrals } from "@/hooks/use-referrals";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InviteModal() {
  const { 
    isInviteModalOpen, 
    closeInviteModal, 
    inviteCode, 
    copyInviteCode, 
    copyReferralLink, 
    shareViaWhatsapp, 
    shareViaTwitter, 
    shareViaFacebook, 
    shareViaEmail 
  } = useReferrals();
  
  // Generate referral link
  const referralLink = `${window.location.origin}/?ref=${inviteCode}`;

  return (
    <Dialog open={isInviteModalOpen} onOpenChange={closeInviteModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">Invite Friends</DialogTitle>
          <DialogDescription className="text-gray-600">
            Share your invite code with friends and earn permanent mining boosts!
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Your Invite Link</h3>
          <div className="flex mb-2">
            <Input
              type="text"
              value={referralLink}
              className="flex-grow bg-white p-2 rounded-l-lg border border-gray-300 focus:outline-none text-sm"
              readOnly
            />
            <Button 
              className="bg-primary hover:bg-indigo-700 text-white p-2 rounded-r-lg transition-all"
              onClick={copyReferralLink}
            >
              <span className="material-icons text-sm">content_copy</span>
            </Button>
          </div>
          <p className="text-xs text-gray-500">Or share your code: <span className="font-medium">{inviteCode}</span></p>
        </div>
        
        <div className="space-y-4">
          <Button 
            className="w-full bg-[#25D366] hover:bg-opacity-90 text-white font-medium py-2 px-4 rounded flex items-center justify-center transition-all"
            onClick={shareViaWhatsapp}
          >
            <span className="material-icons mr-2">whatsapp</span>
            Share via WhatsApp
          </Button>
          
          <Button 
            className="w-full bg-[#1DA1F2] hover:bg-opacity-90 text-white font-medium py-2 px-4 rounded flex items-center justify-center transition-all"
            onClick={shareViaTwitter}
          >
            <span className="material-icons mr-2">twitter</span>
            Share via Twitter
          </Button>
          
          <Button 
            className="w-full bg-[#4267B2] hover:bg-opacity-90 text-white font-medium py-2 px-4 rounded flex items-center justify-center transition-all"
            onClick={shareViaFacebook}
          >
            <span className="material-icons mr-2">facebook</span>
            Share via Facebook
          </Button>
          
          <Button 
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-2 px-4 rounded flex items-center justify-center transition-all"
            onClick={copyInviteCode}
          >
            <span className="material-icons mr-2">content_copy</span>
            Copy to Clipboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
