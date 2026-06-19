import { useAuth } from "../hooks/useAuth";
import PendingUsers from "../components/PendingUsers";
import AllUsers from "../components/AllUsers";
import { useState } from "react";
import { apiFetch } from "../api/client";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleDailyReset = async () => {
    setShowResetConfirm(false);
    setResetting(true);
    setResetMessage("");

    try {
      const response = await apiFetch("/api/admin/daily-reset", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to perform daily reset");
      }

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
            Close today&apos;s court session and clear all unfinished daily activity.
          </p>
          <button
            onClick={() => setShowResetConfirm(true)}
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

      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-reset-title"
        >
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2
              id="daily-reset-title"
              className="text-xl font-bold text-gray-900"
            >
              Confirm Daily Reset
            </h2>
            <p className="mt-3 text-sm text-gray-700">
              This action closes today&apos;s court session and immediately:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
              <li>Deletes all unfinished matches without changing player stats.</li>
              <li>Resets every player&apos;s daily match counter.</li>
              <li>Clears the queue and all court reservations.</li>
              <li>Checks out active players and invalidates QR tokens.</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-gray-800">
              Completed match history and lifetime statistics are preserved.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDailyReset}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Perform Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
