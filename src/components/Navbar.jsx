import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "./NotificationBell";
import logo from "../assets/Logo.png";

export default function Navbar() {
  const { user, logout, isAuthenticated, isSupervisor, isAdmin } = useAuth();

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-green-500">
            <img src={logo} alt="Pickleball Courts" className="h-full w-16" />
          </Link>

          <div className="flex gap-6 items-center">
            <Link
              to="/"
              className="text-gray-700 hover:text-green-500 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/rules"
              className="text-gray-700 hover:text-green-500 transition-colors"
            >
              Rules
            </Link>

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
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-gray-700 hover:text-green-500 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                {isSupervisor && (
                  <Link
                    to="/supervisor"
                    className="text-gray-700 hover:text-green-500 transition-colors"
                  >
                    Supervisor
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-green-500 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-700 hover:text-red-500 transition-colors"
                >
                  Logout ({user.name})
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
