export default function SupervisorDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Supervisor Dashboard</h1>
      <div className="card">
        <p className="mb-4">
          Welcome to the supervisor dashboard! We'll add these features next:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-gray-600">
          <li>Dynamic QR code generator for check-in</li>
          <li>Manual check-in for players with phone issues</li>
          <li>Full queue management</li>
          <li>Match start/end and result entry</li>
          <li>Court status management</li>
          <li>Rule enforcement and warnings</li>
        </ul>
      </div>
    </div>
  );
}
