export default function PlayerDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Player Dashboard</h1>
      <div className="card">
        <p className="mb-4">
          Welcome to your dashboard! We'll add these features next:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-gray-600">
          <li>QR code check-in</li>
          <li>Join/leave queue</li>
          <li>Game preference selection</li>
          <li>Team invites and management</li>
          <li>Real-time queue position</li>
          <li>Match history and statistics</li>
        </ul>
      </div>
    </div>
  );
}
