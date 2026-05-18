import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import PendingUsers from '../components/PendingUsers';
import { useSSE } from '../hooks/useSSE';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [qrData, setQrData] = useState(null);
  const [activeTab, setActiveTab] = useState('court');
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

  const loadAllData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Load courts first
      try {
        const courtsResponse = await fetch('/api/court/list');
        const courtsData = await courtsResponse.json();
        if (courtsData.courts) {
          setCourts(courtsData.courts);
        }
      } catch (err) {
        console.error('Courts API error:', err);
        setMessage("Failed to load courts. Please refresh the page.");
      }

      // Load queue
      try {
        const queueResponse = await fetch('/api/queue', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const queueData = await queueResponse.json();
        if (queueData.queue) {
          setQueue(queueData.queue);
        }
      } catch (err) {
        console.error('Queue API error:', err);
        setMessage("Failed to load queue. Please refresh the page.");
      }

      // Load check-ins
      try {
        const checkinsResponse = await fetch('/api/checkin/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const checkinsData = await checkinsResponse.json();
        if (checkinsData.checked_in_players) {
          setCheckedInPlayers(checkinsData.checked_in_players);
        }
      } catch (err) {
        console.error('Checkins API error:', err);
        setMessage("Failed to load check-ins. Please refresh the page.");
      }

      // Load matches
      try {
        const matchesResponse = await fetch('/api/matches', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const matchesData = await matchesResponse.json();
        if (matchesData.matches) {
          setMatches(matchesData.matches);
        }
      } catch (err) {
        console.error('Matches API error:', err);
        setMessage("Failed to load matches. Please refresh the page.");
      }
      
    } catch (error) {
      console.error('Global error loading data:', error);
    }
  };

  // Use SSE for real-time updates
  const { data: sseData, connected: sseConnected, error: sseError } = useSSE('/api/events');
  
  // Update state when SSE data changes
  useEffect(() => {
    if (sseData) {
      if (sseData.courts) setCourts(sseData.courts);
      if (sseData.queue) setQueue(sseData.queue);
      if (sseData.matches) setMatches(sseData.matches);
      if (sseData.checkedIn) setCheckedInPlayers(sseData.checkedIn);
    }
  }, [sseData]);

  useEffect(() => {
    // Initial load
    loadAllData();
    
    // Fallback polling every 10 seconds in case SSE fails
    const fallbackTimer = setInterval(() => {
      if (!sseConnected) {
        loadAllData();
      }
    }, 10000);
    
    return () => clearInterval(fallbackTimer);
  }, [sseConnected]);

  const generateQR = async () => {
    setLoadingQR(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setQrData(data);
      }
    } catch (error) {
      console.error('Error generating QR:', error);
    } finally {
      setLoadingQR(false);
    }
  };

  const changeCourtState = async (courtId, action) => {
    const token = localStorage.getItem('auth_token');
    
    if (action === 'reserve') {
      try {
        const response = await fetch('/api/court/reserve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            court_id: courtId,
            reserved_for: 'Chinese Students'
          })
        });
        
        const data = await response.json();
        if (response.ok) {
          setMessage("✅ " + data.message);
          loadAllData();
        } else {
          setMessage("❌ " + (data.error || "Failed to reserve court"));
        }
      } catch (err) {
        console.error("Error reserving court:", err);
        setMessage("Error connecting to server");
      }
    } else if (action === 'unreserve') {
      try {
        const response = await fetch('/api/court/unreserve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            court_id: courtId
          })
        });
        
        const data = await response.json();
        if (response.ok) {
          setMessage("✅ Court released from reservation");
          loadAllData();
        } else {
          setMessage("❌ " + (data.error || "Failed to release reservation"));
        }
      } catch (err) {
        console.error("Error unreserving court:", err);
        setMessage("Error connecting to server");
      }
    }
  };

  const autoAssignMatch = async () => {
    setIsAutoAssigning(true);
    setMessage("");
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/matches/auto-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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
    setShowScoreModal(false);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/matches/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          match_id: selectedMatch.id,
          team1_score: score1,
          team2_score: score2
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessage(`✅ Match ended! ${data.winner_name} won ${score1}-${score2}`);
        loadAllData();
      } else {
        setMessage("❌ " + (data.error || "Failed to end match"));
      }
    } catch (err) {
      console.error("Error ending match:", err);
      setMessage("Error connecting to server");
    } finally {
      setIsEndingMatch(false);
      setSelectedMatch(null);
    }
  };

  const cancelMatch = async (matchId) => {
    setCancelingMatch(matchId);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/matches/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          match_id: matchId
        })
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

  const getCourtStatusBadge = court => {
    if (court.status === 'available') {
      return <span className="text-green-600 font-bold">Free</span>;
    } else if (court.status === 'reserved') {
      return (
        <div>
          <span className="text-orange-600 font-bold">Reserved</span>
          {court.reserved_for && (
            <div className="text-xs text-gray-600">for {court.reserved_for}</div>
          )}
        </div>
      );
    } else {
      return <span className="text-gray-600">In Use</span>;
    }
  };

  const getCourtCardClass = court => {
    if (court.status === 'available') {
      return 'bg-green-50 border-green-400';
    } else if (court.status === 'reserved') {
      return 'bg-red-50 border-red-400';
    } else {
      return 'bg-gray-50 border-gray-400';
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

      {/* Score Input Modal */}
      {showScoreModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Enter Match Results</h3>
            <p className="mb-4 text-sm text-gray-600">Enter the final scores for both teams</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="font-bold text-blue-800 mb-2">Team 1</div>
                <div className="text-sm text-gray-600 mb-2">
                  {selectedMatch.team1_player1_name} & {selectedMatch.team1_player2_name}
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
                  {selectedMatch.team2_player1_name} & {selectedMatch.team2_player2_name}
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
                {isEndingMatch ? 'Ending Match...' : 'End Match & Record Results'}
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
          onClick={() => setActiveTab('court')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'court' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Court Management
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'pending' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Pending Users
        </button>
      </div>

      {activeTab === 'pending' && <PendingUsers />}

      {activeTab === 'court' && (
        <div className="py-3 sm:py-4">
          {/* QR Checkin Area */}
          <div className="card mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Player On-site Check-in QR</h2>
            <button
              onClick={generateQR}
              disabled={loadingQR}
              className="btn btn-primary w-full sm:w-auto"
            >
              {loadingQR ? 'Generating...' : 'Refresh New QR Code'}
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
                  Expires in: {Math.floor(qrData.expires_in_seconds / 60)} minutes {qrData.expires_in_seconds % 60} seconds
                </p>
              </div>
            )}
          </div>

          {/* Core: Court Quick Control Panel */}
          <div className="card mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">🏟️ Real-time Court Management</h2>
            <p className="text-xs sm:text-sm text-orange-600 mb-2 sm:mb-3">
              Click button to reserve court — reserved court will be kept empty for Chinese students, not allocated automatically
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {courts.map(court => (
                <div
                  key={court.id}
                  className={`p-3 sm:p-4 rounded border ${getCourtCardClass(court)}`}
                >
                  <h3 className="font-bold text-base sm:text-lg">{court.name || `Court ${court.id}`}</h3>
                  <p className="text-xs sm:text-sm mb-2 sm:mb-3">
                    Status: {getCourtStatusBadge(court)}
                  </p>
                  {court.status === 'available' && (
                    <button
                      onClick={() => changeCourtState(court.id, 'reserve')}
                      className="btn btn-warning w-full text-xs sm:text-sm"
                    >
                      Reserve For Chinese Students
                    </button>
                  )}
                  {court.status === 'reserved' && (
                    <button
                      onClick={() => changeCourtState(court.id, 'unreserve')}
                      className="btn btn-secondary w-full text-xs sm:text-sm"
                    >
                      Release Reservation
                    </button>
                  )}
                  {court.status === 'occupied' && (
                    <p className="text-xs sm:text-sm text-gray-500 italic">
                      Court in use
                    </p>
                  )}
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
                    <div key={player.id} className="p-2 sm:p-3 border rounded-lg bg-gray-50">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm sm:text-base">{index + 1}. {player.user_name}</span>
                        <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Priority: {player.priority_score}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        {player.game_preference && player.game_preference !== 'any' && (
                          <span className="mr-2">🎮 {player.game_preference}</span>
                        )}
                        <span className="mr-2">⚽ {player.total_matches_today} matches today</span>
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
                    {isAutoAssigning ? 'Assigning Match...' : 'Auto-Assign Next Match'}
                  </button>
                </div>
              )}
            </div>
            <div className="card">
              <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                Checked-in Players ({checkedInPlayers.length})
              </h2>
              {checkedInPlayers.length === 0 ? (
                <p className="text-sm text-gray-600">No players checked in yet.</p>
              ) : (
                <div className="space-y-2">
                  {checkedInPlayers.map((player) => (
                    <div key={player.id} className="border-b pb-2">
                      <div className="font-medium text-sm sm:text-base">{player.name}</div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {player.student_id && <span>ID: {player.student_id} | </span>}
                        {player.total_matches_today > 0 && <span>{player.total_matches_today} matches today</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Checked in: {new Date(player.checked_in_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card mt-4 sm:mt-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Ongoing Matches ({matches.length})</h2>
            {matches.length === 0 ? (
              <p className="text-sm text-gray-600">No ongoing matches.</p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {matches.map((match, i) => (
                  <div key={match.id} className="p-3 sm:p-4 border rounded-lg bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-3 gap-2">
                      <h3 className="font-bold text-sm sm:text-base">{match.court_name} - {match.game_type}</h3>
                      <span className="text-xs text-gray-500">
                        Started: {new Date(match.started_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="p-2 sm:p-3 border rounded-lg bg-blue-50">
                        <div className="font-semibold text-blue-800 mb-1 text-sm sm:text-base">Team 1</div>
                        <div className="text-xs sm:text-sm">{match.team1_player1_name}</div>
                        <div className="text-xs sm:text-sm">{match.team1_player2_name}</div>
                      </div>
                      <div className="p-2 sm:p-3 border rounded-lg bg-orange-50">
                        <div className="font-semibold text-orange-800 mb-1 text-sm sm:text-base">Team 2</div>
                        <div className="text-xs sm:text-sm">{match.team2_player1_name}</div>
                        <div className="text-xs sm:text-sm">{match.team2_player2_name}</div>
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
                        {cancelingMatch === match.id ? 'Canceling...' : 'Cancel Match'}
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
