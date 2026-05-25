import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useSSE } from "../hooks/useSSE";

export default function PlayerDashboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const userGender = user?.gender;
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInData, setCheckInData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [queueEntry, setQueueEntry] = useState(null);
  const [gamePreference, setGamePreference] = useState("any");
  const [queueData, setQueueData] = useState([]);
  const [isCourtOpen, setIsCourtOpen] = useState(false);
  const [courtDate, setCourtDate] = useState("");
  const [isQueueLocked, setIsQueueLocked] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Determine available game formats based on gender
  const availableGameFormats = () => {
    if (userGender === "male") {
      return [
        { value: "mens_double", label: "Men's Double" },
        { value: "mixed_double", label: "Mix Double" },
        { value: "any", label: "Any" },
      ];
    } else if (userGender === "female") {
      return [
        { value: "womens_double", label: "Female's Double" },
        { value: "mixed_double", label: "Mix Double" },
        { value: "any", label: "Any" },
      ];
    }
    return [{ value: "any", label: "Any" }];
  };

  // Use SSE for real-time updates
  const { data: sseData } = useSSE("/api/events");

  const fetchCheckInStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/checkin", {
        headers: {
          Authorization: `Bearer ${token}`,
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
  }, []);

  const fetchQueueStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/queue", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQueueData(data.queue || []);
        // Check if current user is in queue
        if (data.queue) {
          const userEntry =
            data.all_queue_items?.find((item) => item.user_id === userId) ||
            data.queue?.find((item) => item.user_id === userId);
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
  }, [userId]);

  const fetchCourtStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/court/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsCourtOpen(data.is_open);
        setCourtDate(data.date || "");
        setIsQueueLocked(data.is_queue_locked || false);
      }
    } catch (err) {
      console.error("Error fetching court status:", err);
    }
  }, []);

  const handleGeolocationCheckIn = async () => {
    setMessage("");
    setIsCheckingIn(true);

    try {
      // Request location permission
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Send to backend
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/checkin/geofence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ " + (data.message || "Successfully checked in!"));
        setCheckedIn(true);
        fetchCheckInStatus();
      } else {
        setMessage("❌ " + (data.error || "Failed to check in"));
      }
    } catch (err) {
      console.error("Error in geolocation check-in:", err);
      if (err.code === 1) {
        setMessage(
          "❌ Location access denied. Please allow location permissions or use the QR scanner instead.",
        );
      } else if (err.code === 2) {
        setMessage(
          "❌ Unable to get your location. Please check your GPS and try again, or use the QR scanner.",
        );
      } else if (err.code === 3) {
        setMessage(
          "❌ Location request timed out. Please try again or use the QR scanner.",
        );
      } else {
        setMessage(
          "❌ Error checking in. Please try again or use the QR scanner.",
        );
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  useEffect(() => {
    // Initial fetch on component mount
    Promise.resolve().then(() => {
      fetchCheckInStatus();
      fetchQueueStatus();
      fetchCourtStatus();
    });
  }, [fetchCheckInStatus, fetchQueueStatus, fetchCourtStatus]);

  // Update all data when SSE data changes (replace polling)
  useEffect(() => {
    if (!sseData) return;
    Promise.resolve().then(() => {
      if (sseData.queue) {
        setQueueData(sseData.queue);
        // Check if current user is in queue using SSE data
        const userEntry = sseData.queue?.find(
          (item) => item.user_id === userId,
        );
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

      if (sseData.checkedIn) {
        const currentUserCheckedIn = sseData.checkedIn.find(
          (c) => c.user_id === userId,
        );
        if (currentUserCheckedIn) {
          setCheckedIn(true);
          setCheckInData(currentUserCheckedIn);
        } else {
          setCheckedIn(false);
          setCheckInData(null);
        }
      }
    });
  }, [sseData, userId]);

  const handleScan = async (scannedData) => {
    console.log("handleScan called with data:", scannedData);
    setMessage("");

    // The Scanner returns an array of results, extract the rawValue
    const rawValue = Array.isArray(scannedData)
      ? scannedData[0]?.rawValue
      : scannedData;

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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_preference: gamePreference,
        }),
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
          Authorization: `Bearer ${token}`,
        },
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
  const winRate =
    totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
        Player Dashboard
      </h1>

      {/* Message Display */}
      {message && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm sm:text-base">
          {message}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 sm:w-6 sm:h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Matches</p>
              <p className="text-lg sm:text-2xl font-bold">{totalMatches}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 sm:w-6 sm:h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Wins</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {wins}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 sm:w-6 sm:h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Losses</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600">
                {losses}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 sm:w-6 sm:h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Win Rate</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">
                {winRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Court Status Banner */}
      <div
        className={`mb-4 sm:mb-6 p-4 sm:p-6 rounded-xl border-2 ${isCourtOpen ? "bg-linear-to-r from-green-50 to-green-100 border-green-300" : "bg-linear-to-r from-gray-50 to-gray-100 border-gray-300"}`}
      >
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${isCourtOpen ? "bg-green-500" : "bg-gray-500"}`}
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isCourtOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              )}
            </svg>
          </div>
          <div className="flex-1">
            <h2
              className={`text-lg sm:text-xl font-bold ${isCourtOpen ? "text-green-800" : "text-gray-800"}`}
            >
              {isCourtOpen ? "Court is OPEN!" : "Court is Closed"}
            </h2>
            {courtDate && (
              <p className="text-xs sm:text-sm mt-1 text-gray-600">
                Today: {courtDate}
              </p>
            )}
          </div>
        </div>

        {isCourtOpen && !checkedIn && (
          <button
            onClick={handleGeolocationCheckIn}
            disabled={isCheckingIn}
            className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isCheckingIn ? (
              <div className="flex items-center gap-2 justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Checking your location...
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Check In (Use My Location)
              </div>
            )}
          </button>
        )}

        {isQueueLocked && (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700 text-sm sm:text-base">
              ⚠️ Queue is locked - court closing soon! No new players can join
              the queue.
            </p>
          </div>
        )}
      </div>

      {/* Check-in Status */}
      <div className="card mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
          Check-in Status
        </h3>

        {checkedIn ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 sm:w-6 sm:h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-green-800 text-sm sm:text-base">
                  You're Checked In!
                </h4>
                <p className="text-xs sm:text-sm text-green-600">
                  Checked in at{" "}
                  {checkInData
                    ? new Date(checkInData.checked_in_at).toLocaleString()
                    : "just now"}
                </p>
                {checkInData?.geofence_verified && (
                  <p className="text-xs text-green-500 mt-1">
                    ✓ Verified via geolocation
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {isCourtOpen && (
              <p className="text-gray-600 text-sm sm:text-base">
                Check in using your location (primary), or scan a QR code
                (fallback).
              </p>
            )}

            {!isCourtOpen && (
              <p className="text-gray-500 text-sm sm:text-base">
                Court is currently closed. Check back later!
              </p>
            )}

            {/* QR Scanner - Fallback */}
            {isCourtOpen && (
              <div className="border-t pt-3 sm:pt-4">
                <h4 className="font-bold mb-2 text-sm sm:text-base">
                  Or Scan QR Code (Fallback)
                </h4>

                {!scannerActive ? (
                  <button
                    onClick={() => setScannerActive(true)}
                    className="btn btn-secondary mb-3 sm:mb-4 w-full sm:w-auto"
                  >
                    Open QR Scanner
                  </button>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div
                      className="border-2 border-gray-300 rounded-lg overflow-hidden"
                      style={{ maxWidth: "320px" }}
                    >
                      <Scanner
                        onScan={handleScan}
                        onError={(error) => {
                          console.error("Scanner error:", error);
                          setMessage(
                            "Camera access denied. Please allow camera permissions in your browser settings, or ask for help.",
                          );
                          setScannerActive(false);
                        }}
                      />
                    </div>
                    <button
                      onClick={() => setScannerActive(false)}
                      className="btn btn-secondary w-full sm:w-auto"
                    >
                      Close Scanner
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Queue Section */}
      {checkedIn && (
        <div className="card">
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Queue</h3>

          {inQueue ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 sm:w-6 sm:h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-blue-800 text-sm sm:text-base">
                    You're in Queue!
                  </h4>
                  <p className="text-xs sm:text-sm text-blue-600">
                    Game Preference: {queueEntry?.game_preference || "Any"}
                  </p>
                </div>
              </div>

              <button
                onClick={leaveQueue}
                className="btn btn-danger w-full sm:w-auto"
              >
                Leave Queue
              </button>
            </div>
          ) : (
            <div className="space-y-5 sm:space-y-6">
              {!isQueueLocked ? (
                <>
                  <div>
                    <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">
                      Choose Game Format
                    </h4>
                    <div className="space-y-2 sm:space-y-3">
                      {availableGameFormats().map((format) => (
                        <label
                          key={format.value}
                          className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="radio"
                            name="gamePreference"
                            value={format.value}
                            checked={gamePreference === format.value}
                            onChange={(e) => setGamePreference(e.target.value)}
                            className="w-4 h-4"
                          />
                          <span className="font-medium text-sm sm:text-base">
                            {format.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={joinQueue}
                    className="btn btn-primary w-full sm:w-auto"
                  >
                    Add to Queue
                  </button>
                </>
              ) : (
                <div className="p-4 sm:p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700 text-sm sm:text-base">
                    ⚠️ Queue is locked. No new players can join at this time.
                  </p>
                </div>
              )}

              <div className="border-t pt-3 sm:pt-4">
                <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">
                  Current Waiting Queue ({queueData.length})
                </h4>
                {queueData.length === 0 ? (
                  <p className="text-gray-500 text-sm sm:text-base">
                    No players in queue yet. Be the first!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {queueData.map((player, index) => (
                      <div
                        key={player.id}
                        className="p-2 sm:p-3 border rounded-lg"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm sm:text-base">
                            {index + 1}. {player.user_name}
                          </span>
                          <span className="text-xs text-blue-600">
                            Priority: {player.priority_score}
                          </span>
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
