import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import OnboardingGate from '@/components/OnboardingGate';
import AppShell from '@/components/AppShell';

// Auth pages (boilerplate)
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// App pages
import Onboarding from '@/pages/Onboarding';
import Discover from '@/pages/Discover';
import Network from '@/pages/Network';
import Messages from '@/pages/Messages';
import Activity from '@/pages/Activity';
import Profile from '@/pages/Profile';
import OpportunityDetail from '@/pages/OpportunityDetail';
import PlayerProfilePage from '@/pages/PlayerProfilePage';
import CreateOpportunity from '@/pages/CreateOpportunity';
import CoachDashboard from '@/pages/CoachDashboard';
import TeamProfilePage from '@/pages/TeamProfilePage';
import CoachProfilePage from '@/pages/CoachProfilePage';
import OrganizationProfilePage from '@/pages/OrganizationProfilePage';
import AdminDashboard from '@/pages/AdminDashboard';
import Settings from '@/pages/Settings';
import Tournaments from '@/pages/Tournaments';
import TournamentDetail from '@/pages/TournamentDetail';
import TournamentSourcesAdmin from '@/pages/TournamentSourcesAdmin';

const AuthenticatedApp = () => {
  const location = useLocation();
  const isPublicRoute = location.pathname.startsWith('/public/');
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
  const isUnprotectedRoute = isPublicRoute || isAuthRoute;
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0B1528' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#1E293B', borderTopColor: '#2563EB' }} />
          <p className="text-sm font-semibold" style={{ color: '#64748B' }}>Loading GameDay Roster...</p>
        </div>
      </div>
    );
  }

  if (authError && !isUnprotectedRoute) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/welcome" element={<Onboarding />} />
      <Route path="/public/player/:id" element={<PlayerProfilePage publicView />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<OnboardingGate />}>
        {/* Routes with bottom nav */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/network" element={<Network />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/coach-dashboard" element={<CoachDashboard />} />
        </Route>

        {/* Full-screen routes (no bottom nav) */}
        <Route path="/opportunity/:id" element={<OpportunityDetail />} />
        <Route path="/player/:id" element={<PlayerProfilePage />} />
        <Route path="/team/:id" element={<TeamProfilePage />} />
        <Route path="/coach/:id" element={<CoachProfilePage />} />
        <Route path="/organization/:id" element={<OrganizationProfilePage />} />
        <Route path="/create-opportunity" element={<CreateOpportunity />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournament/:id" element={<TournamentDetail />} />
        <Route path="/admin/tournament-sources" element={<TournamentSourcesAdmin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App