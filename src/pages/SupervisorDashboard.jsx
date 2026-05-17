import { useAuth } from "../hooks/useAuth";
import PendingUsers from "../components/PendingUsers";
import { useState } from "react";
import QRCode from 'qrcode.react';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [qrData, setQrData] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [errorQR, setErrorQR] = useState("");

  const generateQR = async () => {
    setLoadingQR(true);
    setErrorQR("");
    setQrData(null);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/qr/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate QR code");
      }

      setQrData(data);
    } catch (err) {
      setErrorQR(err.message);
    } finally {
      setLoadingQR(false);
    }
  };

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
          <div className="space-y-6">
            {/* QR Code Generator */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4">QR Code Check-In Generator</h3>
              <p className="text-gray-600 mb-4">
                Generate a QR code that players can scan to check in at the courts.
                The QR code will expire based on your settings (default: 2 minutes).
              </p>
              
              <button
                onClick={generateQR}
                disabled={loadingQR}
                className="btn btn-primary mb-4"
              >
                {loadingQR ? "Generating..." : "Generate New Check-In QR"}
              </button>
              
              {errorQR && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {errorQR}
                </div>
              )}
              
              {qrData && (
                <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                  <div className="flex flex-col items-center">
                    <h4 className="text-lg font-bold mb-4">Scan to Check In</h4>
                    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                      <QRCode 
                        value={`${qrData.scan_url}`} 
                        size={256} 
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      Expires in: {Math.floor(qrData.expires_in_seconds / 60)} minutes {qrData.expires_in_seconds % 60} seconds
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Valid until: {new Date(qrData.expires_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Court Status Placeholder */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4">Court Management</h3>
              <p className="text-gray-600">
                Additional court management features coming soon!
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-600">
                <li>View court status</li>
                <li>Start and end matches</li>
                <li>Manage the queue</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
