import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

export default function Home() {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const stepsRef = useRef(null);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-fadeInUp");
        }
      });
    }, observerOptions);

    if (heroRef.current) observer.observe(heroRef.current);
    if (featuresRef.current) observer.observe(featuresRef.current);
    if (stepsRef.current) observer.observe(stepsRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative py-12 sm:py-16 lg:py-24 px-4 sm:px-6 text-center overflow-hidden opacity-0 translate-y-8 transition-all duration-700 ease-out"
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-blue-50 -z-10"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="max-w-4xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-semibold mb-6 sm:mb-8 shadow-sm">
            <span className="text-base sm:text-lg">🏟️</span>
            <span>College Pickleball Management System</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-5 sm:mb-6 text-gray-900 tracking-tight">
            Fair Court Management
            <span className="text-primary block sm:inline mt-2 sm:mt-0"> Made Simple</span>
          </h1>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-10 sm:mb-14 max-w-3xl mx-auto leading-relaxed px-2">
            Smart queueing, gender balance, and real-time court allocation for
            everyone to enjoy pickleball
          </p>

          <div className="flex justify-center gap-4 sm:gap-6 flex-col sm:flex-row">
            <Link
              to="/login"
              className="btn btn-primary text-base sm:text-xl px-8 sm:px-12 py-3.5 sm:py-4 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
            >
              Login Now
            </Link>
            <Link
              to="/register"
              className="btn btn-secondary text-base sm:text-xl px-8 sm:px-12 py-3.5 sm:py-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        ref={featuresRef}
        className="py-16 sm:py-20 lg:py-28 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white opacity-0 translate-y-8 transition-all duration-700 ease-out"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-4 sm:mb-6 text-gray-900 tracking-tight">
            Why Pickleball Courts?
          </h2>
          <p className="text-base sm:text-xl lg:text-2xl text-center text-gray-600 mb-12 sm:mb-16 px-4">
            Everything you need for smooth, fair pickleball court management
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            {/* Feature 1 */}
            <div className="card group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-5 transform group-hover:scale-110 transition-transform duration-300">
                🔄
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 text-gray-900">
                Fair Rotation
              </h3>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed">
                Play 1 match, wait 1 match — no more court-hopping or unfair advantages
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-5 transform group-hover:scale-110 transition-transform duration-300">
                ⚖️
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 text-gray-900">
                Gender Balance
              </h3>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed">
                Automatic court allocation ensures everyone gets to play with balanced teams
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-5 transform group-hover:scale-110 transition-transform duration-300">
                🎫
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 text-gray-900">
                Secure Check-In
              </h3>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed">
                Scan dynamic QR codes — no remote check-ins from dorms
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-5 transform group-hover:scale-110 transition-transform duration-300">
                ⚡
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 text-gray-900">
                Real-Time Updates
              </h3>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed">
                Live court status, queue positions, and match information
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-5 transform group-hover:scale-110 transition-transform duration-300">
                🏟️
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 text-gray-900">
                Court Reservation
              </h3>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed">
                Reserve courts for special groups like Chinese students
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-5 transform group-hover:scale-110 transition-transform duration-300">
                📊
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 text-gray-900">
                Player Statistics
              </h3>
              <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed">
                Track wins, losses, matches played, and your win rate
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section 
        ref={stepsRef}
        className="py-16 sm:py-20 lg:py-28 px-4 sm:px-6 opacity-0 translate-y-8 transition-all duration-700 ease-out"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-12 sm:mb-16 text-gray-900 tracking-tight">
            How It Works
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="relative inline-block">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl font-bold mx-auto mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  1
                </div>
                <div className="absolute -right-6 sm:-right-8 top-1/2 transform -translate-y-1/2 hidden sm:block">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">
                Register
              </h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Create your account and get approved
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="relative inline-block">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl font-bold mx-auto mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  2
                </div>
                <div className="absolute -right-6 sm:-right-8 top-1/2 transform -translate-y-1/2 hidden sm:block">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">
                Check In
              </h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Scan QR code at the courts
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="relative inline-block">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl font-bold mx-auto mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  3
                </div>
                <div className="absolute -right-6 sm:-right-8 top-1/2 transform -translate-y-1/2 hidden sm:block">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">
                Wait for Match
              </h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Watch your queue position in real-time
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center group">
              <div className="relative inline-block">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl font-bold mx-auto mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                  🎉
                </div>
              </div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 text-gray-900">
                Play!
              </h3>
              <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                Auto-assign matches you to a court
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 bg-gradient-to-r from-green-500 to-green-600 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full transform translate-x-1/2 translate-y-1/2"></div>
        
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-5 sm:mb-6 text-white tracking-tight">
            Ready to Play Pickleball?
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl mb-10 sm:mb-12 text-green-100 px-4 max-w-2xl mx-auto">
            Join hundreds of students already enjoying fair court management
          </p>
          <Link
            to="/register"
            className="inline-block btn bg-white text-green-600 hover:bg-green-50 hover:shadow-2xl hover:-translate-y-1 text-lg sm:text-xl lg:text-2xl px-10 sm:px-14 py-4 sm:py-5 shadow-xl transition-all duration-300"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
}
