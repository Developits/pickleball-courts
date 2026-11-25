import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AuthProvider from "./contexts/AuthProvider";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import MemberHome from "./pages/MemberHome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PlayerDashboard from "./pages/PlayerDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import GameHistory from "./pages/GameHistory";
import { useAuth } from "./hooks/useAuth";
const TournamentList = lazy(() => import("./features/tournaments/pages/Tournaments").then(module => ({default:module.TournamentList})));
const TournamentEditor = lazy(() => import("./features/tournaments/pages/Tournaments").then(module => ({default:module.TournamentEditor})));
const OrganizerAdmin = lazy(() => import("./features/tournaments/pages/Tournaments").then(module => ({default:module.OrganizerAdmin})));
const tournamentFallback = <p role="status">Loading tournament workspace…</p>;

function AppContent() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl lg:max-w-6xl xl:max-w-7xl">
        <Routes>
            <Route path="/" element={isAuthenticated ? <MemberHome /> : <Home />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
            
            {/* Protected Routes */}
            <Route path="/tournaments" element={<ProtectedRoute><Suspense fallback={tournamentFallback}><TournamentList /></Suspense></ProtectedRoute>} />
            <Route path="/tournaments/:tournamentId" element={<ProtectedRoute><Suspense fallback={tournamentFallback}><TournamentEditor /></Suspense></ProtectedRoute>} />
            <Route path="/admin/tournament-organizers" element={<ProtectedRoute requireRole="admin"><Suspense fallback={tournamentFallback}><OrganizerAdmin /></Suspense></ProtectedRoute>} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <PlayerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            <Route path="/game-history" element={
              <ProtectedRoute>
                <GameHistory />
              </ProtectedRoute>
            } />
            
            <Route path="/supervisor" element={
              <ProtectedRoute requireRole="supervisor">
                <SupervisorDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute requireRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;
