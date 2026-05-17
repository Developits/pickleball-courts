import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Scanner } from '@yudiel/react-qr-scanner';
import { useSSE } from '../hooks/useSSE';

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInData, setCheckInData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [queueEntry, setQueueEntry] = useState(null);
  const [gamePreference, setGamePreference] = useState("any");
  const [queueData, setQueueData] = useState([]);

  // Determine available game formats based on gender
  const availableGameFormats = () => {
    if (user.gender === "male") {
      return [
        { value: "mens_double", label: "Men's Double" },
        { value: "mixed_double", label: "Mix Double" },
        { value: "any", label: "Any" }
      ];
    } else if (user.gender === "female") {
      return [
        { value: "womens_double", label: "Female's Double" },
        { value: "mixed_double", label: "Mix Double" },
        { value: "any", label: "Any" }
      ];
    }
    return [
      { value: "any", label: "Any" }
    ];
  };

  useEffect(() => {
    fetchCheckInStatus();
    fetchQueueStatus();
    const interval = setInterval(() => {
      fetchCheckInStatus();
      fetchQueueStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Use SSE for real-time updates
  const { data: sseData, connected: sseConnected } = useSSE('/api/events');
  
  // Update queue data when SSE data changes
  useEffect(() => {
    if (sseData && sseData.queue) {
      setQueueData(sseData.queue);
    }
    if (sseData && sseData.checkedIn) {
      const currentUserCheckedIn = sseData.checkedIn.find(c => c.user_id === user?.id);
      if (currentUserCheckedIn) {
        setCheckedIn(true);
        setCheckInData(currentUserCheckedIn);
      }
    }
  }, [sseData]);

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

  const fetchQueueStatus = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/queue", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQueueData(data.queue || []);
        // Check if current user is in queue
        if (data.queue) {
          const userEntry = data.all_queue_items?.find(item => item.user_id === user.id) ||
                            data.queue?.find(item => item.user_id === user.id);
          if (userEntry) {
            setInQueue(true);
            setQueueEntry(userEntry);
            if (userEntry.game_preference) {
              setGamePreference(userEntry.game_preference);
            }
          } else {
            setInQueue(false);
            setQueueEntry(null);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching queue status:", err);
    }
  };

  const handleScan = async (scannedData) => {
    console.log("handleScan called with data:", scannedData);
    setMessage("");
    
    // The Scanner returns an array of results, extract the rawValue
    const rawValue = Array.isArray(scannedData) ? scannedData[0]?.rawValue : scannedData;
    
    if (!rawValue) {
      setMessage("No QR code detected");
      return;
    }
    
    console.log("Extracted raw value:", rawValue);
    
    // Just use the raw value as the token!
    const token = rawValue;
    
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

  const joinQueue = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/queue/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_preference: gamePreference
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage("✅ " + (data.message || "Successfully joined the queue!"));
        fetchQueueStatus();
      } else {
        setMessage("❌ " + (data.error || "Failed to join queue"));
      }
    } catch (err) {
      console.error("Error joining queue:", err);
      setMessage("Error connecting to server");
    }
  };

  const leaveQueue = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/queue/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage("✅ Successfully left the queue");
        setInQueue(false);
        setQueueEntry(null);
        fetchQueueStatus();
      } else {
        setMessage("❌ " + (data.error || "Failed to leave queue"));
      }
    } catch (err) {
      console.error("Error leaving queue:", err);
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

  // Calculate win rate
  const totalMatches = user?.total_matches || 0;
  const wins = user?.wins || 0;
  const losses = user?.losses || 0;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Player Dashboard</h1>
      
      {/* Message Display */}
      {message && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          {message}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Matches</p>
              <p className="text-2xl font-bold">{totalMatches}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Wins</p>
              <p className="text-2xl font-bold text-green-600">{wins}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Losses</p>
              <p className="text-2xl font-bold text-red-600">{losses}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Win Rate</p>
              <p className="text-2xl font-bold text-purple-600">{winRate}%</p>
            </div>
          </div>
        </div>
      </div>
      
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
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              You need to check in before you can join the queue.
            </p>
            
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
                      onError={(error) => {
                        console.error("Scanner error:", error);
                        setMessage("Camera access denied. Please allow camera permissions in your browser settings.");
                        setScannerActive(false);
                      }}
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

      {/* Queue Section */}
      {checkedIn && (
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Queue</h3>
          
          {inQueue ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-blue-800">You're in Queue!</h4>
                  <p className="text-sm text-blue-600">
                    Game Preference: {queueEntry?.game_preference || 'Any'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={leaveQueue}
                className="btn btn-danger"
              >
                Leave Queue
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Choose Game Format</h4>
                <div className="space-y-3">
                  {availableGameFormats().map((format) => (
                  <label key={format.value} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="gamePreference"
                      value={format.value}
                      checked={gamePreference === format.value}
                      onChange={(e) => setGamePreference(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">{format.label}</span>
                  </label>
                ))}
                </div>
              </div>
              
              <button
                onClick={joinQueue}
                className="btn btn-primary"
              >
                Add to Queue
              </button>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Current Waiting Queue ({queueData.length})</h4>
                {queueData.length === 0 ? (
                  <p className="text-gray-500">No players in queue yet. Be the first!</p>
                ) : (
                  <div className="space-y-2">
                    {queueData.map((player, index) => (
                      <div key={player.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                        <span className="font-medium">{index + 1}. {player.user_name}</span>
                        <span className="text-xs text-blue-600">Priority: {player.priority_score}</span>
                      </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
