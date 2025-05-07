import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function Header() {
  const { user, logout } = useAuth();
  
  // Format the current date for the "Last active" text
  const formattedDate = format(new Date(), "MMM d, h:mm a");

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="material-icons text-white">monetization_on</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">PTC Coin</h1>
        </div>
        
        {/* User Profile Section */}
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-700">{user?.email}</p>
            <p className="text-xs text-gray-500">Last active: {formattedDate}</p>
          </div>
          <div className="relative">
            <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="User profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-icons text-gray-400 flex items-center justify-center h-full">
                  person
                </span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1">
              <Button 
                size="icon" 
                variant="outline" 
                className="h-6 w-6 rounded-full bg-white"
                onClick={logout}
              >
                <span className="material-icons text-gray-500 text-sm">logout</span>
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
          <button className="text-gray-500 hover:text-gray-700 sm:hidden">
            <span className="material-icons">menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
