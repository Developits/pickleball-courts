import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-50 text-orange-700 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8">
            <span className="text-base sm:text-lg">🏟️</span>
            <span>College Pickleball Management System</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 text-gray-900">
            Fair Court Management
            <span className="text-primary block sm:inline"> Made Simple</span>
          </h1>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-2">
            Smart queueing, gender balance, and real-time court allocation for everyone to enjoy pickleball
          </p>

          <div className="flex justify-center gap-3 sm:gap-4 flex-col sm:flex-row">
            <Link 
              to="/login" 
              className="btn btn-primary text-base sm:text-xl px-6 sm:px-10 py-3 sm:py-4 shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
            >
              Login Now
            </Link>
            <Link 
              to="/register" 
              className="btn btn-secondary text-base sm:text-xl px-6 sm:px-10 py-3 sm:py-4 shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-3 sm:mb-4 text-gray-900">
            Why Pickleball Courts?
          </h2>
          <p className="text-base sm:text-xl text-center text-gray-600 mb-8 sm:mb-12 px-2">
            Everything you need for smooth, fair pickleball court management
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Feature 1 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl sm:text-4xl lg:text-5xl mb-3 sm:mb-4">🔄</div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">Fair Rotation</h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Play 1 match, wait 1 match — no more court-hopping or unfair advantages
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl sm:text-4xl lg:text-5xl mb-3 sm:mb-4">⚖️</div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">Gender Balance</h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Automatic court allocation ensures everyone gets to play with balanced teams
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl sm:text-4xl lg:text-5xl mb-3 sm:mb-4">🎫</div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">Secure Check-In</h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Scan dynamic QR codes — no remote check-ins from dorms
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl sm:text-4xl lg:text-5xl mb-3 sm:mb-4">⚡</div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">Real-Time Updates</h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Live court status, queue positions, and match information
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl sm:text-4xl lg:text-5xl mb-3 sm:mb-4">🏟️</div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">Court Reservation</h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Reserve courts for special groups like Chinese students
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card hover:shadow-xl transition-shadow duration-300">
              <div className="text-3xl sm:text-4xl lg:text-5xl mb-3 sm:mb-4">📊</div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">Player Statistics</h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Track wins, losses, matches played, and your win rate
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 text-gray-900">
            How It Works
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-primary text-white rounded-full flex items-center justify-center text-lg sm:text-xl lg:text-2xl font-bold mx-auto mb-3 sm:mb-4">
                1
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-1 sm:mb-2 text-gray-900">Register</h3>
              <p className="text-gray-600 text-xs sm:text-sm lg:text-base">
                Create your account and get approved
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-primary text-white rounded-full flex items-center justify-center text-lg sm:text-xl lg:text-2xl font-bold mx-auto mb-3 sm:mb-4">
                2
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-1 sm:mb-2 text-gray-900">Check In</h3>
              <p className="text-gray-600 text-xs sm:text-sm lg:text-base">
                Scan QR code at the courts
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-primary text-white rounded-full flex items-center justify-center text-lg sm:text-xl lg:text-2xl font-bold mx-auto mb-3 sm:mb-4">
                3
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-1 sm:mb-2 text-gray-900">Wait for Match</h3>
              <p className="text-gray-600 text-xs sm:text-sm lg:text-base">
                Watch your queue position in real-time
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-primary text-white rounded-full flex items-center justify-center text-lg sm:text-xl lg:text-2xl font-bold mx-auto mb-3 sm:mb-4">
                4
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-1 sm:mb-2 text-gray-900">Play!</h3>
              <p className="text-gray-600 text-xs sm:text-sm lg:text-base">
                Auto-assign matches you to a court
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-white">
            Ready to Play Pickleball?
          </h2>
          <p className="text-base sm:text-xl mb-6 sm:mb-8 text-blue-100 px-2">
            Join hundreds of students already enjoying fair court management
          </p>
          <Link 
            to="/register" 
            className="btn bg-white text-primary hover:bg-gray-100 text-base sm:text-xl px-6 sm:px-10 py-3 sm:py-4 shadow-lg w-full sm:w-auto"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
}
