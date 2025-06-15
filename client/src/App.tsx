import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./components/ThemeProvider";
import { useAuth } from "./hooks/useAuth";
import { Sidebar } from "./components/Sidebar";
import { useState, useEffect } from "react";

// Pages
import Landing from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Calendar from "./pages/calendar";
import AIChat from "./pages/ai-chat";
import Analytics from "./pages/analytics";
import NotFound from "./pages/not-found";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";

// Layout wrapper for authenticated routes
function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (location === '/dashboard') setActiveTab('dashboard');
    else if (location === '/calendar') setActiveTab('calendar');
    else if (location === '/ai-chat') setActiveTab('ai-chat');
    else if (location === '/analytics') setActiveTab('analytics');
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="ml-64">{children}</div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Force redirect to landing page if not authenticated and on protected route
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const protectedRoutes = ['/dashboard', '/calendar', '/ai-chat', '/analytics'];
      if (protectedRoutes.includes(location)) {
        console.log('Redirecting unauthenticated user to landing page');
        setLocation('/');
      }
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  // Force redirect to dashboard if authenticated and on landing/auth pages
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const publicRoutes = ['/', '/auth/login', '/auth/register'];
      if (publicRoutes.includes(location)) {
        console.log('Redirecting authenticated user to dashboard');
        setLocation('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  console.log('Router State:', { isAuthenticated, isLoading, location });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes (always accessible) */}
      <Route path="/" component={isAuthenticated ? () => null : Landing} />
      <Route path="/auth/login" component={isAuthenticated ? () => null : Login} />
      <Route path="/auth/register" component={isAuthenticated ? () => null : Register} />
      
      {/* Protected routes (only for authenticated users) */}
      {isAuthenticated && (
        <>
          <Route path="/dashboard">
            <AuthenticatedApp>
              <Dashboard />
            </AuthenticatedApp>
          </Route>
          <Route path="/calendar">
            <AuthenticatedApp>
              <Calendar />
            </AuthenticatedApp>
          </Route>
          <Route path="/ai-chat">
            <AuthenticatedApp>
              <AIChat />
            </AuthenticatedApp>
          </Route>
          <Route path="/analytics">
            <AuthenticatedApp>
              <Analytics />
            </AuthenticatedApp>
          </Route>
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="flowtrack-theme">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
