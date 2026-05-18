import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export default function AllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(null);
  const [filter, setFilter] = useState("all"); // 'all', 'players', 'supervisors', 'admins'
  const { user } = useAuth();

  const fetchUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      // Filter only approved users
      const approvedUsers = data.users.filter((u) => u.is_approved);
      setUsers(approvedUsers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetchUsers);
  }, []);

  const handleManageUser = async (userId, action, duration = null) => {
    setProcessing(userId);
    setError("");

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          action: action,
          duration: duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to manage user");
      }

      // Refresh the user list
      fetchUsers();

      // Show success message
      alert(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filter === "all") return true;
    return u.role === filter;
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "supervisor":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (user) => {
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
          Banned until {new Date(user.banned_until).toLocaleDateString()}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
        Active
      </span>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4">All Users</h3>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">All Users</h3>
        <span className="text-gray-600">
          {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
        </span>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
            filter === "all"
              ? "bg-green-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("players")}
          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
            filter === "players"
              ? "bg-green-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Players
        </button>
        <button
          onClick={() => setFilter("supervisors")}
          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
            filter === "supervisors"
              ? "bg-green-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Supervisors
        </button>
        <button
          onClick={() => setFilter("admins")}
          className={`px-3 py-1 rounded-lg font-medium transition-colors ${
            filter === "admins"
              ? "bg-green-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Admins
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No users found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold">{u.name}</h4>
                    <span
                      className={`px-2 py-1 text-xs rounded ${getRoleBadgeColor(u.role)}`}
                    >
                      {u.role}
                    </span>
                    {getStatusBadge(u)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">ID:</span> {u.student_id}
                    </div>
                    <div>
                      <span className="font-medium">Dept:</span> {u.department}
                    </div>
                    <div>
                      <span className="font-medium">Matches:</span>{" "}
                      {u.total_matches}
                    </div>
                    <div>
                      <span className="font-medium">W/L:</span> {u.wins}/
                      {u.losses}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">
                      Warnings: {u.warnings}
                    </span>
                  </div>
                </div>

                {user.role === "admin" && u.id !== user.id && (
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => {
                        if (confirm(`Give a warning to ${u.name}?`)) {
                          handleManageUser(u.id, "warn");
                        }
                      }}
                      disabled={processing === u.id}
                      className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ⚠️ Warn
                    </button>

                    <div className="relative group">
                      <button
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                        disabled={processing === u.id}
                      >
                        🚫 Ban
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => handleManageUser(u.id, "ban", "hour")}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-t-lg"
                        >
                          1 Hour
                        </button>
                        <button
                          onClick={() => handleManageUser(u.id, "ban", "day")}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          1 Day
                        </button>
                        <button
                          onClick={() => handleManageUser(u.id, "ban", "week")}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          1 Week
                        </button>
                        <button
                          onClick={() =>
                            handleManageUser(u.id, "ban", "permanent")
                          }
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-b-lg"
                        >
                          Permanent
                        </button>
                      </div>
                    </div>

                    {u.banned_until &&
                      new Date(u.banned_until) > new Date() && (
                        <button
                          onClick={() => {
                            if (confirm(`Unban ${u.name}?`)) {
                              handleManageUser(u.id, "unban");
                            }
                          }}
                          disabled={processing === u.id}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✓ Unban
                        </button>
                      )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
