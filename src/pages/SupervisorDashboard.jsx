import { useAuth } from "../hooks/useAuth";
import PendingUsers from "../components/PendingUsers";
import { useState } from "react";

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Supervisor Dashboard</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Welcome, {user?.name}! Manage court operations and approve player registrations.
        </p>
        
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
            onClick={() => setActiveTab("court")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "court"
                ? "text-green-600 border-b-2 border-green-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Court Management
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "pending" && <PendingUsers />}
        {activeTab === "court" && (
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Court Management</h3>
            <p className="text-gray-600">
              Court management features coming soon! You'll be able to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-600">
              <li>View court status</li>
              <li>Generate QR codes for check-in</li>
              <li>Start and end matches</li>
              <li>Manage the queue</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
