import { Switch, Route } from "wouter";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { MiningProvider } from "@/hooks/use-mining";
import { ReferralProvider } from "@/hooks/use-referrals";
import { NotificationProvider } from "@/hooks/use-notification";
import { SyncProvider } from "@/hooks/use-sync";
import { OfflineIndicator } from "@/components/offline-indicator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ReferralProvider>
          <MiningProvider>
            <SyncProvider>
              <OfflineIndicator />
              <Router />
            </SyncProvider>
          </MiningProvider>
        </ReferralProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
