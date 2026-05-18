import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "./NotificationBell";
import logo from "../assets/Logo.png";

export default function Navbar() {
  const { user, logout, isAuthenticated, isSupervisor, isAdmin } = useAuth();

  // Function to get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "??";
    const nameParts = user.name.split(" ");
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-green-500">
            <img src={logo} alt="Pickleball Courts" className="h-full w-16" />
          </Link>

          <div className="flex gap-4 items-center">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-green-500 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-gray-700 hover:text-green-500 transition-colors"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                <NotificationBell />

                {/* Admin Specific Nav */}
                {isAdmin && (
                  <>
                    <Link
                      to="/admin"
                      className="text-gray-700 hover:text-green-500 transition-colors"
                    >
                      Admin
                    </Link>
                    <Link
                      to="/supervisor"
                      className="text-gray-700 hover:text-green-500 transition-colors"
                    >
                      Supervisor
                    </Link>
                  </>
                )}

                {/* Supervisor Specific Nav */}
                {isSupervisor && !isAdmin && (
                  <Link
                    to="/supervisor"
                    className="text-gray-700 hover:text-green-500 transition-colors"
                  >
                    Supervisor
                  </Link>
                )}

                {/* Player Specific Nav */}
                {!isSupervisor && !isAdmin && (
                  <>
                    <Link
                      to="/dashboard"
                      className="text-gray-700 hover:text-green-500 transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
                    >
                      {getUserInitials()}
                    </Link>
                  </>
                )}

                {/* Logout for all users */}
                <button
                  onClick={logout}
                  className="text-gray-700 hover:text-red-500 transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
