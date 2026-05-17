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
  const [loadingQR, setLoadingQR] = useState(false);

  const loadAllData = async () => {
    try {
      const [courtsRes, queueRes, matchesRes] = await Promise.all([
        fetch('/api/court/list').then(r => r.json()),
        fetch('/api/queue').then(r => r.json()),
        fetch('/api/matches').then(r => r.json())
      ]);

      if (courtsRes.courts) setCourts(courtsRes.courts);
      if (queueRes.queue) setQueue(queueRes.queue);
      if (matchesRes.matches) setMatches(matchesRes.matches);
    } catch (error) {
      console.error('Error loading data:', error);
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
              <p>No players waiting in queue.</p>
            ) : (
              queue.map((u, i) => (
              <div key={i} className="py-1 border-b">
                {i+1}. {u.name} | {u.game_preference}
              </div>
            ))
            )}
            </div>
            <div className="card">
              <h2 className="text-xl font-semibold mb-3">Operations</h2>
              <p className="text-xs mt-2 text-gray-500">
                Auto Assign Players To Free Courts
            </p>
            </div>
          </div>

          <div className="card mt-6">
            <h2 className="text-xl font-semibold mb-3">Ongoing Matches</h2>
              {matches.length === 0 ? (
              <p>No ongoing matches.</p>
              ) : (
              matches.map((m, i) => (
                <div key={i} className="py-2 border-b">
                  Court {m.court_id}: {m.team1_player1_id} & {m.team1_player2_id} VS {m.team2_player1_id} & {m.team2_player2_id}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}