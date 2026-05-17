import { useAuth } from "../hooks/useAuth";
import PendingUsers from "../components/PendingUsers";
import AllUsers from "../components/AllUsers";
import { useState } from "react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const handleDailyReset = async () => {
    if (!confirm("Are you sure you want to perform a daily reset? This will clear queue, reset daily stats, and make all courts available.")) {
      return;
    }

    setResetting(true);
    setResetMessage("");

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch("/api/admin/daily-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to perform daily reset");
      }

      const data = await response.json();
      setResetMessage(data.message || "Daily reset completed successfully!");
    } catch (err) {
      setResetMessage("Error: " + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Welcome, {user?.name}! Manage users, approve registrations, and enforce rules.
        </p>

        {/* Daily Reset Button */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Daily Reset</h3>
          <p className="text-sm text-yellow-700 mb-3">
            Reset all daily stats, clear queue, and make all courts available.
          </p>
          <button
            onClick={handleDailyReset}
            disabled={resetting}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {resetting ? "Resetting..." : "Perform Daily Reset"}
          </button>
          {resetMessage && (
            <p className={`mt-2 text-sm ${resetMessage.includes("Error") ? "text-red-600" : "text-green-600"}`}>
              {resetMessage}
            </p>
          )}
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "pending"
                ? "text-green-600 border-b-2 border-green-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Pending Approvals
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "users"
                ? "text-green-600 border-b-2 border-green-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All Users
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "pending" && <PendingUsers />}
        {activeTab === "users" && <AllUsers />}
      </div>
    </div>
  );
}
