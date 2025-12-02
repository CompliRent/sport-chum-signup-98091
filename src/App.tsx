import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Leagues from "./pages/Leagues";
import LeagueDetail from "./pages/LeagueDetail";
import JoinLeague from "./pages/JoinLeague";
import Profile from "./pages/Profile";
import Betting from "./pages/Betting";
import MemberCard from "./pages/MemberCard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/leagues"
              element={
                <ProtectedRoute>
                  <Leagues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:id"
              element={
                <ProtectedRoute>
                  <LeagueDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/join/:inviteCode"
              element={
                <ProtectedRoute>
                  <JoinLeague />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:leagueId/betting"
              element={
                <ProtectedRoute>
                  <Betting />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:leagueId/member/:userId"
              element={
                <ProtectedRoute>
                  <MemberCard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
