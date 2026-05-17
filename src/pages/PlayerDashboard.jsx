import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Scanner } from '@yudiel/react-qr-scanner';

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInData, setCheckInData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    fetchCheckInStatus();
  }, []);

  const fetchCheckInStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/checkin", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCheckedIn(data.checked_in);
        setCheckInData(data.check_in);
      }
    } catch (err) {
      console.error("Error fetching check-in status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (rawValue) => {
    console.log("handleScan called with value:", rawValue);
    setMessage("");
    
    if (!rawValue) {
      setMessage("No QR code detected");
      return;
    }
    
    // Just use the raw value as the token!
    const token = rawValue;
    console.log("Using token:", token);
    
    try {
      const response = await fetch("/api/qr/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          user_id: user.id,
        }),
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (response.ok) {
        setMessage("✅ Successfully checked in!");
        setCheckedIn(true);
        setScannerActive(false);
        fetchCheckInStatus();
      } else {
        setMessage("❌ " + (data.error || "Failed to check in"));
      }
    } catch (err) {
      console.error("Error processing QR:", err);
      setMessage("Error connecting to server");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Player Dashboard</h1>
      
      {/* Check-in Status */}
      <div className="card mb-6">
        <h3 className="text-xl font-bold mb-4">Check-in Status</h3>
        
        {checkedIn ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-green-800">You're Checked In!</h4>
                <p className="text-sm text-green-600">
                  Checked in at {checkInData ? new Date(checkInData.checked_in_at).toLocaleString() : 'just now'}
                </p>
              </div>
            </div>
            
            {message && (
              <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
                {message}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              You need to check in before you can join the queue.
            </p>
            
            {message && (
              <div className="p-3 bg-yellow-100 text-yellow-800 rounded">
                {message}
              </div>
            )}
            
            {/* QR Scanner */}
            <div className="border-t pt-4">
              <h4 className="font-bold mb-2">Scan QR Code</h4>
              
              {!scannerActive ? (
                <button
                  onClick={() => setScannerActive(true)}
                  className="btn btn-primary mb-4"
                >
                  Open QR Scanner
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden" style={{ maxWidth: '320px' }}>
                    <Scanner
                      onScan={handleScan}
                      onError={(error) => console.error("Scanner error:", error)}
                    />
                  </div>
                  <button
                    onClick={() => setScannerActive(false)}
                    className="btn btn-secondary"
                  >
                    Close Scanner
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Queue Section Placeholder */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Queue</h3>
        <p className="text-gray-600">
          Queue features coming soon! Once checked in, you'll be able to join the waiting queue.
        </p>
      </div>
    </div>
  );
}