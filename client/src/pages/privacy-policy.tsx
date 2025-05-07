import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import PrivacyPolicyContent from "@/components/privacy-policy-content";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button
        onClick={() => setLocation("/")}
        className="flex items-center mb-4 text-primary hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Quay lại
      </button>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <article>
          <PrivacyPolicyContent />
        </article>
      </div>
    </div>
  );
}