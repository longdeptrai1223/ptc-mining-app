import { Link, useLocation } from "wouter";

export default function BottomNav() {
  const [location] = useLocation();
  
  return (
    <nav className="bg-white fixed bottom-0 inset-x-0 border-t border-gray-200 shadow-lg z-10 md:hidden">
      <div className="flex justify-around">
        <Link href="/dashboard">
          <a className={`flex flex-col items-center p-3 ${
            location === "/dashboard" ? "text-primary" : "text-gray-500"
          }`}>
            <span className="material-icons">dashboard</span>
            <span className="text-xs mt-1">Dashboard</span>
          </a>
        </Link>
        <Link href="/dashboard">
          <a className="flex flex-col items-center p-3 text-gray-500">
            <span className="material-icons">flash_on</span>
            <span className="text-xs mt-1">Mining</span>
          </a>
        </Link>
        <Link href="/dashboard">
          <a className="flex flex-col items-center p-3 text-gray-500" onClick={(e) => {
            e.preventDefault();
            document.dispatchEvent(new CustomEvent('open-invite-modal'));
          }}>
            <span className="material-icons">people</span>
            <span className="text-xs mt-1">Referrals</span>
          </a>
        </Link>
        <Link href="/dashboard">
          <a className="flex flex-col items-center p-3 text-gray-500">
            <span className="material-icons">account_circle</span>
            <span className="text-xs mt-1">Profile</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
