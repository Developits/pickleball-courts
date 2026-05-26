import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import PendingUsers from "../components/PendingUsers";
import { useSSE } from "../hooks/useSSE";
import { apiFetch } from "../api/client";

export default function SupervisorDashboard() {
  const [qrData, setQrData] = useState(null);
  const [activeTab, setActiveTab] = useState("court");
  const [courts, setCourts] = useState([]);
  const [queue, setQueue] = useState([]);
  const [matches, setMatches] = useState([]);
  const [checkedInPlayers, setCheckedInPlayers] = useState([]);
  const [loadingQR, setLoadingQR] = useState(false);
  const [message, setMessage] = useState("");
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [cancelingMatch, setCancelingMatch] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [isEndingMatch, setIsEndingMatch] = useState(false);
  const [isCourtOpen, setIsCourtOpen] = useState(false);
  const [courtDate, setCourtDate] = useState("");
  const [isProcessingCourt, setIsProcessingCourt] = useState(false);
  // Confirm modal state for the destructive "Close Court" action
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Wrapped in useCallback so the fallback setInterval holds a stable reference
  const loadAllData = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");

      // Load courts first
      try {
        const courtsResponse = await fetch("/api/court/list");
        const courtsData = await courtsResponse.json();
        if (courtsData.courts) {
          setCourts(courtsData.courts);
        }
      } catch (err) {
        console.error("Courts API error:", err);
        setMessage("Failed to load courts. Please refresh the page.");
      }

      // Load queue
      try {
        const queueResponse = await apiFetch("/api/queue");
        const queueData = await queueResponse.json();
        if (queueData.queue) {
          setQueue(queueData.queue);
        }
      } catch (err) {
        console.error("Queue API error:", err);
        setMessage("Failed to load queue. Please refresh the page.");
      }

      // Load check-ins
      try {
        const checkinsResponse = await apiFetch("/api/checkin/list");
        const checkinsData = await checkinsResponse.json();
        if (checkinsData.checked_in_players) {
          setCheckedInPlayers(checkinsData.checked_in_players);
        }
      } catch (err) {
        console.error("Checkins API error:", err);
        setMessage("Failed to load check-ins. Please refresh the page.");
      }

      // Load matches
      try {
        const matchesResponse = await apiFetch("/api/matches");
        const matchesData = await matchesResponse.json();
        if (matchesData.matches) {
          setMatches(matchesData.matches);
        }
      } catch (err) {
        console.error("Matches API error:", err);
        setMessage("Failed to load matches. Please refresh the page.");
      }
    } catch (error) {
      console.error("Global error loading data:", error);
    }
  }, []);

  // Wrapped in useCallback so the fallback interval holds a stable reference.
  // IMPORTANT: must be declared BEFORE the useEffect that lists it as a dependency,
  // otherwise JavaScript's Temporal Dead Zone rule throws a ReferenceError on render.
  const loadCourtStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/api/court/status");
      const data = await res.json();
      if (data.success) {
        setIsCourtOpen(data.is_open);
        setCourtDate(data.date || "");
      }
    } catch (error) {
      console.error("Error loading court status:", error);
    }
  }, []);

  // Use SSE for real-time updates
  const { data: sseData, connected: sseConnected } = useSSE("/api/events");

  // Update state when SSE data changes
  useEffect(() => {
    if (!sseData) return;
    if (sseData.courts) setCourts(sseData.courts);
    if (sseData.queue) setQueue(sseData.queue);
    if (sseData.matches) setMatches(sseData.matches);
    if (sseData.checkedIn) setCheckedInPlayers(sseData.checkedIn);
  }, [sseData]);

  useEffect(() => {
    // Initial load — directly, no Promise.resolve indirection
    loadAllData();
    loadCourtStatus();

    // Fallback polling every 10 seconds in case SSE fails
    const fallbackTimer = setInterval(() => {
      if (!sseConnected) {
        loadAllData();
        loadCourtStatus();
      }
    }, 10000);

    return () => clearInterval(fallbackTimer);
  }, [sseConnected, loadAllData, loadCourtStatus]);

  const generateQR = async () => {
    setLoadingQR(true);
    try {
      const res = await apiFetch("/api/qr/generate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setQrData(data);
      }
    } catch (error) {
      console.error("Error generating QR:", error);
    } finally {
      setLoadingQR(false);
    }
  };

  const openCourt = async () => {
    setIsProcessingCourt(true);
    try {
      const res = await apiFetch("/api/court/open", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIsCourtOpen(true);
        setCourtDate(data.date);
        setMessage("✅ " + data.message);
      } else {
        setMessage("❌ " + (data.error || "Failed to open court"));
      }
    } catch (error) {
      console.error("Error opening court:", error);
      setMessage("Error connecting to server");
    } finally {
      setIsProcessingCourt(false);
    }
  };

  // FIX: Use a React modal instead of window.confirm() which blocks the event loop
  const closeCourt = async () => {
    setShowCloseConfirm(false);
    setIsProcessingCourt(true);
    try {
      const res = await apiFetch("/api/court/close", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIsCourtOpen(false);
        setMessage("✅ " + data.message);
        loadAllData();
      } else {
        setMessage("❌ " + (data.error || "Failed to close court"));
      }
    } catch (error) {
      console.error("Error closing court:", error);
      setMessage("Error connecting to server");
    } finally {
      setIsProcessingCourt(false);
    }
  };

  // FIX: Unified DRY version — no more duplicated try/catch blocks
  const changeCourtState = async (courtId, action) => {
    const endpoints = {
      reserve: "/api/court/reserve",
      unreserve: "/api/court/unreserve",
    };
    const bodies = {
      reserve: { court_id: courtId, reserved_for: "Chinese Students" },
      unreserve: { court_id: courtId },
    };

    try {
      const response = await apiFetch(endpoints[action], {
        method: "POST",
        body: JSON.stringify(bodies[action]),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage("✅ " + (data.message || "Court updated"));
        loadAllData();
      } else {
        setMessage("❌ " + (data.error || "Failed to update court"));
      }
    } catch (err) {
      console.error(`Error ${action} court:`, err);
      setMessage("Error connecting to server");
    }
  };

  const autoAssignMatch = async () => {
    setIsAutoAssigning(true);
    setMessage("");
    try {
      const response = await apiFetch("/api/matches/auto-assign", {
        method: "POST",
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("✅ " + data.message);
        loadAllData();
      } else {
        setMessage("❌ " + (data.error || "Failed to auto-assign match"));
      }
    } catch (err) {
      console.error("Error auto-assigning:", err);
      setMessage("Error connecting to server");
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleEndMatchClick = (match) => {
    setSelectedMatch(match);
    setTeam1Score("");
    setTeam2Score("");
    setShowScoreModal(true);
  };

  const submitEndMatch = async () => {
    if (!selectedMatch) return;

    // Validate scores
    if (!team1Score || !team2Score) {
      setMessage("❌ Please enter scores for both teams");
      return;
    }

    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);

    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      setMessage("❌ Invalid scores. Please enter positive numbers");
      return;
    }

    setIsEndingMatch(true);
    // FIX: Do NOT close the modal before the API call completes.
    // Keep it open so the user retains context if the request fails.

    try {
      const response = await apiFetch("/api/matches/end", {
        method: "POST",
        body: JSON.stringify({
          match_id: selectedMatch.id,
          team1_score: score1,
          team2_score: score2,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // Only close the modal on success
        setShowScoreModal(false);
        setSelectedMatch(null);
        setMessage(
          `✅ Match ended! ${data.winner_name} won ${score1}-${score2}`,
        );
        loadAllData();
      } else {
        // Keep modal open so user can correct their input
        setMessage("❌ " + (data.error || "Failed to end match"));
      }
    } catch (err) {
      console.error("Error ending match:", err);
      setMessage("Error connecting to server");
    } finally {
      setIsEndingMatch(false);
    }
  };

  const cancelMatch = async (matchId) => {
    setCancelingMatch(matchId);
    try {
      const response = await apiFetch("/api/matches/cancel", {
        method: "POST",
        body: JSON.stringify({ match_id: matchId }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("✅ " + data.message);
        loadAllData();
      } else {
        setMessage("❌ " + (data.error || "Failed to cancel match"));
      }
    } catch (err) {
      console.error("Error canceling match:", err);
      setMessage("Error connecting to server");
    } finally {
      setCancelingMatch(null);
    }
  };

  const getCourtStatusBadge = (court) => {
    if (court.status === "available") {
      return <span className="text-green-600 font-bold">Free</span>;
    } else if (court.status === "reserved") {
      return (
        <div>
          <span className="text-orange-600 font-bold">Reserved</span>
          {court.reserved_for && (
            <div className="text-xs text-gray-600">
              for {court.reserved_for}
            </div>
          )}
        </div>
      );
    } else {
      return <span className="text-gray-600">In Use</span>;
    }
  };

  const getCourtCardClass = (court) => {
    if (court.status === "available") {
      return "bg-green-50 border-green-400";
    } else if (court.status === "reserved") {
      return "bg-red-50 border-red-400";
    } else {
      return "bg-gray-50 border-gray-400";
    }
  };

  const getCourtStatusIcon = (court) => {
    if (court.status === "available") {
      return (
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      );
    } else if (court.status === "reserved") {
      return (
        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      );
    }
  };

  const getCourtStatusClass = (court) => {
    if (court.status === "available") {
      return "bg-green-100 text-green-700";
    } else if (court.status === "reserved") {
      return "bg-orange-100 text-orange-700";
    } else {
      return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Supervisor Control Panel</h1>

      {/* Message Display */}
      {message && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          {message}
        </div>
      )}

      {/* Court Open/Close Control */}
      <div className="card mb-4 sm:mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Court Session Control
            </h2>
            {courtDate && (
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Today: {courtDate}
              </p>
            )}
          </div>
          <div className="flex gap-2 sm:gap-3">
            {!isCourtOpen ? (
              <button
                onClick={openCourt}
                disabled={isProcessingCourt}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isProcessingCourt ? "Opening..." : "Open Court"}
              </button>
            ) : (
              <button
                onClick={() => setShowCloseConfirm(true)}
                disabled={isProcessingCourt}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {isProcessingCourt ? "Closing..." : "Close Court & Reset"}
              </button>
            )}
          </div>
        </div>
        <div className={`mt-3 sm:mt-4 px-4 sm:px-5 py-3 rounded-lg flex items-center gap-2 sm:gap-3 ${isCourtOpen ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${isCourtOpen ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
          <span className={`font-semibold text-sm sm:text-base ${isCourtOpen ? "text-green-700" : "text-gray-600"}`}>
            {isCourtOpen ? "Court is OPEN for play" : "Court is CLOSED"}
          </span>
        </div>
      </div>

      {/* Close Court Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-3 text-red-700">Close Court?</h3>
            <p className="text-gray-600 mb-6">
              This will <strong>delete all ongoing matches</strong>, clear the queue, and check out all players. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeCourt}
                className="btn btn-danger flex-1"
              >
                Yes, Close Court
              </button>
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Input Modal */}
      {showScoreModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Enter Match Results</h3>
            <p className="mb-4 text-sm text-gray-600">
              Enter the final scores for both teams
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="font-bold text-blue-800 mb-2">Team 1</div>
                <div className="text-sm text-gray-600 mb-2">
                  {selectedMatch.team1_player1_name} &{" "}
                  {selectedMatch.team1_player2_name}
                </div>
                <input
                  type="number"
                  value={team1Score}
                  onChange={(e) => setTeam1Score(e.target.value)}
                  placeholder="Score"
                  className="w-full px-4 py-3 text-2xl text-center border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  autoFocus
                />
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-800 mb-2">Team 2</div>
                <div className="text-sm text-gray-600 mb-2">
                  {selectedMatch.team2_player1_name} &{" "}
                  {selectedMatch.team2_player2_name}
                </div>
                <input
                  type="number"
                  value={team2Score}
                  onChange={(e) => setTeam2Score(e.target.value)}
                  placeholder="Score"
                  className="w-full px-4 py-3 text-2xl text-center border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitEndMatch}
                disabled={isEndingMatch}
                className="btn btn-primary flex-1 py-3"
              >
                {isEndingMatch
                  ? "Ending Match..."
                  : "End Match & Record Results"}
              </button>
              <button
                onClick={() => setShowScoreModal(false)}
                disabled={isEndingMatch}
                className="btn btn-secondary flex-1 py-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 sm:mb-6 flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("court")}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 font-medium transition-colors whitespace-nowrap ${activeTab === "court" ? "text-green-600 border-b-2 border-green-600" : "text-gray-600 hover:text-gray-900"}`}
        >
          Court Management
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 font-medium transition-colors whitespace-nowrap ${activeTab === "pending" ? "text-green-600 border-b-2 border-green-600" : "text-gray-600 hover:text-gray-900"}`}
        >
          Pending Users
        </button>
      </div>

      {activeTab === "pending" && <PendingUsers />}

      {activeTab === "court" && (
        <div className="py-3 sm:py-4">
          {/* QR Checkin Area */}
          <div className="card mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
              Player On-site Check-in QR
            </h2>
            <button
              onClick={generateQR}
              disabled={loadingQR}
              className="btn btn-primary w-full sm:w-auto"
            >
              {loadingQR ? "Generating..." : "Refresh New QR Code"}
            </button>
            {qrData && (
              <div className="mt-3 sm:mt-4 flex flex-col items-center">
                <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md mb-2">
                  <QRCodeSVG
                    value={qrData.token}
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs sm:text-sm text-gray-600">
                  Expires in: {Math.floor(qrData.expires_in_seconds / 60)}{" "}
                  minutes {qrData.expires_in_seconds % 60} seconds
                </p>
              </div>
            )}
          </div>

          {/* Core: Court Quick Control Panel */}
          <div className="card mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Real-time Court Management
                </h2>
                <p className="text-xs sm:text-sm text-orange-600">
                  Click button to reserve court — reserved court will be kept empty for Chinese students
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {courts.map((court) => (
                <div
                  key={court.id}
                  className={`relative overflow-hidden p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${getCourtCardClass(court)}`}
                >
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg sm:text-xl text-gray-800">
                        {court.name || `Court ${court.id}`}
                      </h3>
                      {getCourtStatusIcon(court)}
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getCourtStatusClass(court)}`}>
                        {court.status === "available" ? "🟢 Available" : court.status === "reserved" ? "🟡 Reserved" : "🔴 Occupied"}
                      </span>
                    </div>
                    {court.status === "available" && (
                      <button
                        onClick={() => changeCourtState(court.id, "reserve")}
                        className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                      >
                        Reserve For Chinese Students
                      </button>
                    )}
                    {court.status === "reserved" && (
                      <button
                        onClick={() => changeCourtState(court.id, "unreserve")}
                        className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                      >
                        Release Reservation
                      </button>
                    )}
                    {court.status === "occupied" && (
                      <div className="flex items-center justify-center gap-2 py-3 bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-600">Court in use</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue & Match Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="card">
              <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                Waiting Queue ({queue.length})
              </h2>
              {queue.length === 0 ? (
                <p className="text-sm text-gray-600">No players in queue.</p>
              ) : (
                <div className="space-y-2">
                  {queue.map((player, index) => (
                    <div
                      key={player.id}
                      className="p-2 sm:p-3 border rounded-lg bg-gray-50"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm sm:text-base">
                          {index + 1}. {player.user_name}
                        </span>
                        <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Priority: {player.priority_score}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        {player.game_preference &&
                          player.game_preference !== "any" && (
                            <span className="mr-2">
                              🎮 {player.game_preference}
                            </span>
                          )}
                        <span className="mr-2">
                          ⚽ {player.total_matches_today} matches today
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {queue.length >= 4 && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                  <button
                    onClick={autoAssignMatch}
                    disabled={isAutoAssigning}
                    className="btn btn-primary w-full"
                  >
                    {isAutoAssigning
                      ? "Assigning Match..."
                      : "Auto-Assign Next Match"}
                  </button>
                </div>
              )}
            </div>
            <div className="card">
              <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                Checked-in Players ({checkedInPlayers.length})
              </h2>
              {checkedInPlayers.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No players checked in yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {checkedInPlayers.map((player) => (
                    <div key={player.id} className="border-b pb-2">
                      <div className="font-medium text-sm sm:text-base">
                        {player.name}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {player.student_id && (
                          <span>ID: {player.student_id} | </span>
                        )}
                        {player.total_matches_today > 0 && (
                          <span>
                            {player.total_matches_today} matches today
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Checked in:{" "}
                        {new Date(player.checked_in_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card mt-4 sm:mt-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
              Ongoing Matches ({matches.length})
            </h2>
            {matches.length === 0 ? (
              <p className="text-sm text-gray-600">No ongoing matches.</p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="p-3 sm:p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3 gap-2">
                      <h3 className="font-bold text-sm sm:text-base">
                        {match.court_name} - {match.game_type}
                      </h3>
                      <span className="text-xs text-gray-500">
                        Started:{" "}
                        {new Date(match.started_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="p-2 sm:p-3 border rounded-lg bg-blue-50">
                        <div className="font-semibold text-blue-800 mb-1 text-sm sm:text-base">
                          Team 1
                        </div>
                        <div className="text-xs sm:text-sm">
                          {match.team1_player1_name}
                        </div>
                        <div className="text-xs sm:text-sm">
                          {match.team1_player2_name}
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 border rounded-lg bg-orange-50">
                        <div className="font-semibold text-orange-800 mb-1 text-sm sm:text-base">
                          Team 2
                        </div>
                        <div className="text-xs sm:text-sm">
                          {match.team2_player1_name}
                        </div>
                        <div className="text-xs sm:text-sm">
                          {match.team2_player2_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3">
                      <button
                        onClick={() => handleEndMatchClick(match)}
                        disabled={cancelingMatch === match.id || isEndingMatch}
                        className="btn btn-primary flex-1 text-xs sm:text-sm"
                      >
                        End Match
                      </button>
                      <button
                        onClick={() => cancelMatch(match.id)}
                        disabled={cancelingMatch === match.id || isEndingMatch}
                        className="btn btn-danger flex-1 text-xs sm:text-sm"
                      >
                        {cancelingMatch === match.id
                          ? "Canceling..."
                          : "Cancel Match"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
