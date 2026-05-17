import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export default function PendingUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    setError("");
    
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      // Filter only pending users
      const pendingUsers = data.users.filter(u => !u.is_approved);
      setUsers(pendingUsers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId, action) => {
    setProcessing(userId);
    setError("");

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          action: action, // 'approve' or 'reject'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process user");
      }

      // Remove the user from the list
      setUsers(users.filter(u => u.id !== userId));
      
      // Show success message
      alert(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Pending Approvals</h3>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading pending users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Pending Approvals</h3>
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
          {users.length} {users.length === 1 ? 'user' : 'users'} waiting
        </span>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-medium">All caught up!</p>
          <p className="text-sm">No pending approvals at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((pendingUser) => (
            <div
              key={pendingUser.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-lg">{pendingUser.name}</h4>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {pendingUser.role}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Student ID:</span> {pendingUser.student_id}
                    </div>
                    <div>
                      <span className="font-medium">Department:</span> {pendingUser.department}
                    </div>
                    <div>
                      <span className="font-medium">Degree:</span> {pendingUser.degree}
                    </div>
                    <div>
                      <span className="font-medium">Year:</span> {pendingUser.year}
                    </div>
                    <div>
                      <span className="font-medium">Gender:</span> {pendingUser.gender}
                    </div>
                    <div>
                      <span className="font-medium">Registered:</span> {new Date(pendingUser.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleApproval(pendingUser.id, "approve")}
                    disabled={processing === pendingUser.id}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {processing === pendingUser.id ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      "✓ Approve"
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to reject ${pendingUser.name}? This will remove their account.`)) {
                        handleApproval(pendingUser.id, "reject");
                      }
                    }}
                    disabled={processing === pendingUser.id}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
