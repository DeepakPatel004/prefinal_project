import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import LanguageToggle from "@/components/language-toggle";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { AuthProvider } from "@/lib/authContext";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import SubmitGrievance from "@/pages/submit-grievance";
import UserDashboard from "@/pages/user-dashboard";
import OfficialDashboard from "@/pages/official-dashboard";
import CommunityVerification from "@/pages/community-verification";
import AdminPanel from "@/pages/admin-panel";
import Help from "@/pages/help";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      {/* Citizen/User Routes */}
      <Route path="/submit">
        <ProtectedRoute roles={['citizen']}>
          <SubmitGrievance />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute roles={['citizen']}>
          <UserDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/community">
        <ProtectedRoute roles={['citizen']}>
          <CommunityVerification />
        </ProtectedRoute>
      </Route>

      {/* Official Routes */}
      <Route path="/official">
        <ProtectedRoute roles={['official', 'admin']}>
          <OfficialDashboard />
        </ProtectedRoute>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute roles={['admin']}>
          <AdminPanel />
        </ProtectedRoute>
      </Route>

      <Route path="/help" component={Help} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="grievance-theme">
          <TooltipProvider>
            <I18nProvider>
            <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <HeaderTitle />
                  </div>
                  <div className="flex items-center gap-2">
                    <LanguageToggle />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto pb-28 sm:pb-24 md:pb-20">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          </I18nProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function HeaderTitle() {
  const { t } = useI18n();
  return <h1 className="text-lg font-semibold hidden sm:block">{t('appTitle')}</h1>;
}

export default App;
 
