import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import PendingUsers from '../components/PendingUsers';

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
  const [endingMatch, setEndingMatch] = useState(null);
  const [cancelingMatch, setCancelingMatch] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [matchScore, setMatchScore] = useState("");

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
      }

      // Load matches
      try {
        const matchesResponse = await fetch('/api/matches', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const matchesData = await matchesResponse.json();
        console.log("Matches API response:", matchesData);
        if (matchesData.matches) {
          setMatches(matchesData.matches);
          console.log("Set matches state to:", matchesData.matches);
        }
      } catch (err) {
        console.error('Matches API error:', err);
      }
      
    } catch (error) {
      console.error('Global error loading data:', error);
    }
  };

  useEffect(() => {
    loadAllData();
    const timer = setInterval(loadAllData, 3000);
    return () => clearInterval(timer);
  }, []);

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

  const changeCourtState = async (courtId, status) => {
    const token = localStorage.getItem('auth_token');
    fetch('/api/court/set-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        courtId,
        status
      })
    }).then(() => loadAllData());
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

  const handleEndMatchClick = (match, winnerTeam) => {
    setSelectedMatch(match);
    setSelectedWinner(winnerTeam);
    setMatchScore("");
    setShowScoreModal(true);
  };

  const submitEndMatch = async () => {
    if (!selectedMatch || !selectedWinner) return;
    
    setEndingMatch(selectedMatch.id);
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
          winner_team: selectedWinner,
          score: matchScore || null
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessage("✅ " + data.message + (matchScore ? ` (Score: ${matchScore})` : ''));
        loadAllData();
      } else {
        setMessage("❌ " + (data.error || "Failed to end match"));
      }
    } catch (err) {
      console.error("Error ending match:", err);
      setMessage("Error connecting to server");
    } finally {
      setEndingMatch(null);
      setSelectedMatch(null);
      setSelectedWinner(null);
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
      return <span className="text-red-600 font-bold">Reserved</span>;
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
      {showScoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Enter Match Score</h3>
            <p className="mb-4">
              {selectedMatch && `Winner: ${selectedWinner === 1 ? 'Team 1' : 'Team 2'}`}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Score (optional, e.g., "11-8, 9-11, 11-7")
              </label>
              <input
                type="text"
                value={matchScore}
                onChange={(e) => setMatchScore(e.target.value)}
                placeholder="11-8"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={submitEndMatch}
                className="btn btn-primary flex-1"
              >
                Confirm & End Match
              </button>
              <button
                onClick={() => setShowScoreModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('court')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'court' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Court Management
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'pending' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Pending Users
        </button>
      </div>

      {activeTab === 'pending' && <PendingUsers />}

      {activeTab === 'court' && (
        <div className="py-4">
          {/* QR Checkin Area */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-3">Player On-site Check-in QR</h2>
            <button
              onClick={generateQR}
              disabled={loadingQR}
              className="btn btn-primary"
            >
              {loadingQR ? 'Generating...' : 'Refresh New QR Code'}
            </button>
            {qrData && (
              <div className="mt-4 flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg shadow-md mb-2">
                  <QRCodeSVG
                    value={qrData.token}
                    size={220}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Expires in: {Math.floor(qrData.expires_in_seconds / 60)} minutes {qrData.expires_in_seconds % 60} seconds
                </p>
              </div>
            )}
          </div>

          {/* Core: Court Quick Control Panel */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">🏟️ Real-time Court Management</h2>
            <p className="text-sm text-orange-600 mb-3">
              Click button to reserve court — reserved court will be kept empty for Chinese students, not allocated automatically
            </p>
            <div className="grid grid-cols-3 gap-4">
              {courts.map(court => (
                <div
                  key={court.id}
                  className={`p-4 rounded border ${getCourtCardClass(court)}`}
                >
                  <h3 className="font-bold text-lg">{court.name || `Court ${court.id}`}</h3>
                  <p className="text-sm mb-3">
                    Status: {getCourtStatusBadge(court)}
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => changeCourtState(court.id, 'available')}
                      className="btn btn-secondary text-sm"
                    >
                      Set Free
                    </button>
                    <button
                      onClick={() => changeCourtState(court.id, 'reserved')}
                      className="btn btn-danger text-sm"
                    >
                      Reserve For Chinese
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue & Match Area */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-3">
                Waiting Queue ({queue.length})
              </h2>
              {queue.length === 0 ? (
                <p>No players in queue.</p>
              ) : (
                <div className="space-y-2">
                  {queue.map((player, index) => (
                    <div key={player.id} className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{index + 1}. {player.user_name}</span>
                        <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Priority: {player.priority_score}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
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
                <div className="mt-4 pt-4 border-t">
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
              <h2 className="text-xl font-semibold mb-3">
                Checked-in Players ({checkedInPlayers.length})
              </h2>
              {checkedInPlayers.length === 0 ? (
                <p>No players checked in yet.</p>
              ) : (
                <div className="space-y-2">
                  {checkedInPlayers.map((player) => (
                    <div key={player.id} className="border-b pb-2">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-gray-600">
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

          <div className="card mt-6">
            <h2 className="text-xl font-semibold mb-3">Ongoing Matches ({matches.length})</h2>
            {matches.length === 0 ? (
              <p>No ongoing matches.</p>
            ) : (
              <div className="space-y-4">
                {matches.map((match, i) => (
                  <div key={match.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold">{match.court_name} - {match.game_type}</h3>
                      <span className="text-xs text-gray-500">
                        Started: {new Date(match.started_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 border rounded-lg bg-blue-50">
                        <div className="font-semibold text-blue-800 mb-1">Team 1</div>
                        <div className="text-sm">{match.team1_player1_name}</div>
                        <div className="text-sm">{match.team1_player2_name}</div>
                      </div>
                      <div className="p-3 border rounded-lg bg-orange-50">
                        <div className="font-semibold text-orange-800 mb-1">Team 2</div>
                        <div className="text-sm">{match.team2_player1_name}</div>
                        <div className="text-sm">{match.team2_player2_name}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEndMatchClick(match, 1)}
                        disabled={endingMatch === match.id || cancelingMatch === match.id}
                        className="btn btn-secondary flex-1"
                      >
                        {endingMatch === match.id ? 'Ending...' : 'Team 1 Wins'}
                      </button>
                      <button
                        onClick={() => handleEndMatchClick(match, 2)}
                        disabled={endingMatch === match.id || cancelingMatch === match.id}
                        className="btn btn-secondary flex-1"
                      >
                        {endingMatch === match.id ? 'Ending...' : 'Team 2 Wins'}
                      </button>
                      <button
                        onClick={() => cancelMatch(match.id)}
                        disabled={endingMatch === match.id || cancelingMatch === match.id}
                        className="btn btn-danger flex-1"
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
