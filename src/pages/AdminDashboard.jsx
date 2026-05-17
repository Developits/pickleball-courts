export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="card">
        <p className="mb-4">
          Welcome to the admin dashboard! We'll add these features next:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-gray-600">
          <li>Account approval for new students</li>
          <li>User role management (player → supervisor → admin)</li>
          <li>Temporary bans and warning history</li>
          <li>System settings configuration</li>
          <li>Historical data and reports</li>
          <li>System reset at the end of the day</li>
        </ul>
      </div>
    </div>
  );
}
