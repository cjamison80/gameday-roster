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
import GameDayLogo from '@/components/GameDayLogo';

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
import TeamEditPage from '@/pages/TeamEditPage';
import CoachProfilePage from '@/pages/CoachProfilePage';
import CoachEditPage from '@/pages/CoachEditPage';
import OrganizationProfilePage from '@/pages/OrganizationProfilePage';
import AdminDashboard from '@/pages/AdminDashboard';
import Settings from '@/pages/Settings';
import Billing from '@/pages/Billing';
import Tournaments from '@/pages/Tournaments';
import TournamentDetail from '@/pages/TournamentDetail';
import TournamentSourcesAdmin from '@/pages/TournamentSourcesAdmin';
import SportsPage from '@/pages/SportsPage';
import Legal from '@/pages/Legal';
import HowItWorks from '@/pages/HowItWorks';

const AuthenticatedApp = () => {
  const location = useLocation();
  const isPublicRoute = location.pathname.startsWith('/public/') || location.pathname.startsWith('/legal') || location.pathname === '/how-it-works' || location.pathname === '/about';
  const isAuthRoute = ['/welcome', '/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
  const isUnprotectedRoute = isPublicRoute || isAuthRoute;
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isUnprotectedRoute) {
    return (
      <Routes>
        <Route path="/welcome" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/public/player/:id" element={<PlayerProfilePage publicView />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/legal/:slug" element={<Legal />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/about" element={<HowItWorks />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    );
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 gdr-clean-splash flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#0B1528' }}>
        <div className="gdr-splash-glow gdr-splash-glow-red" aria-hidden="true" />
        <div className="gdr-splash-glow gdr-splash-glow-blue" aria-hidden="true" />
        <div className="gdr-splash-linework" aria-hidden="true">
          <span className="gdr-splash-plate" />
          <span className="gdr-splash-diagonal gdr-splash-diagonal-left" />
          <span className="gdr-splash-diagonal gdr-splash-diagonal-right" />
          <span className="gdr-splash-arc" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-5 px-8 text-center">
          <GameDayLogo size={64} showText={true} light={true} />
          <p className="text-sm font-semibold max-w-xs" style={{ color: '#CBD5E1' }}>
            The marketplace for travel baseball opportunities.
          </p>
          <div className="w-48 h-1.5 rounded-full overflow-hidden mt-2" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <div className="h-full rounded-full gdr-splash-loader" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#94A3B8' }}>
            Every connection creates an opportunity.
          </p>
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
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/about" element={<HowItWorks />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/welcome" replace />} />}>
        <Route element={<OnboardingGate />}>
        {/* Routes with bottom nav */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/network" element={<Network />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/coach-dashboard" element={<CoachDashboard />} />
        </Route>

        {/* Full-screen routes (no bottom nav) */}
        <Route path="/opportunity/:id" element={<OpportunityDetail />} />
        <Route path="/player/:id" element={<PlayerProfilePage />} />
        <Route path="/team/:id" element={<TeamProfilePage />} />
        <Route path="/team/:id/edit" element={<TeamEditPage />} />
        <Route path="/coach/:id" element={<CoachProfilePage />} />
        <Route path="/coach/:id/edit" element={<CoachEditPage />} />
        <Route path="/organization/:id" element={<OrganizationProfilePage />} />
        <Route path="/create-opportunity" element={<CreateOpportunity />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/tournament/:id" element={<TournamentDetail />} />
        <Route path="/admin/tournament-sources" element={<TournamentSourcesAdmin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/sports" element={<SportsPage />} />
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