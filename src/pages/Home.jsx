import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="text-center py-12">
      <h1 className="text-5xl font-bold mb-6 text-primary">
        College Pickleball Courts
      </h1>
      <p className="text-xl mb-8 text-gray-600">
        Fair court management for everyone
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="card">
          <h3 className="text-xl font-bold mb-2">Fair Rotation</h3>
          <p className="text-gray-600">
            Play 1 match, wait 1 match - no more court-hopping
          </p>
        </div>
        <div className="card">
          <h3 className="text-xl font-bold mb-2">Gender Balance</h3>
          <p className="text-gray-600">
            Automatic court allocation ensures everyone gets to play
          </p>
        </div>
        <div className="card">
          <h3 className="text-xl font-bold mb-2">Secure Check-In</h3>
          <p className="text-gray-600">
            Scan a dynamic QR code - no remote check-ins from dorms
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Link to="/login" className="btn btn-primary text-lg">
          Login
        </Link>
        <Link to="/register" className="btn btn-secondary text-lg">
          Register
        </Link>
      </div>
    </div>
  );
}
