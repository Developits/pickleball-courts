import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium mb-8">
            <span className="text-lg">🏟️</span>
            <span>College Pickleball Management System</span>
          </div>
          
          <h1 className="text-6xl font-bold mb-6 text-gray-900">
            Fair Court Management
            <span className="text-primary"> Made Simple</span>
          </h1>
          
          <p className="text-2xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Smart queueing, gender balance, and real-time court allocation for everyone to enjoy pickleball
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            <Link 
              to="/login" 
              className="btn btn-primary text-xl px-10 py-4 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Login Now
            </Link>
            <Link 
              to="/register" 
              className="btn btn-secondary text-xl px-10 py-4 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            Why Pickleball Courts?
          </h2>
          <p className="text-xl text-center text-gray-600 mb-12">
            Everything you need for smooth, fair pickleball court management
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-5xl mb-4">🔄</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Fair Rotation</h3>
              <p className="text-gray-600 text-lg">
                Play 1 match, wait 1 match — no more court-hopping or unfair advantages
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-5xl mb-4">⚖️</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Gender Balance</h3>
              <p className="text-gray-600 text-lg">
                Automatic court allocation ensures everyone gets to play with balanced teams
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-5xl mb-4">🎫</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Secure Check-In</h3>
              <p className="text-gray-600 text-lg">
                Scan dynamic QR codes — no remote check-ins from dorms
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Real-Time Updates</h3>
              <p className="text-gray-600 text-lg">
                Live court status, queue positions, and match information
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-5xl mb-4">🏟️</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Court Reservation</h3>
              <p className="text-gray-600 text-lg">
                Reserve courts for special groups like Chinese students
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Player Statistics</h3>
              <p className="text-gray-600 text-lg">
                Track wins, losses, matches played, and your win rate
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Register</h3>
              <p className="text-gray-600">
                Create your account and get approved
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Check In</h3>
              <p className="text-gray-600">
                Scan QR code at the courts
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Wait for Match</h3>
              <p className="text-gray-600">
                Watch your queue position in real-time
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Play!</h3>
              <p className="text-gray-600">
                Auto-assign matches you to a court
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Ready to Play Pickleball?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join hundreds of students already enjoying fair court management
          </p>
          <Link 
            to="/register" 
            className="btn bg-white text-primary hover:bg-gray-100 text-xl px-10 py-4 shadow-lg"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
}
