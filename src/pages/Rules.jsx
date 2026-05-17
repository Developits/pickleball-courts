export default function Rules() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Official Court Rules</h1>
      <div className="card space-y-4">
        <div>
          <h3 className="text-xl font-bold mb-2">Rotation Rules</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Play 1 match, wait 1 full match before playing again</li>
            <li>Matches are first to 11 points, win by 2</li>
            <li>After your match ends, leave the court immediately</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-2">Check-In Rules</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>You must check in at the courts using the dynamic QR code</li>
            <li>Remote check-ins from dorms are strictly prohibited</li>
            <li>
              Check-in expires after 5 minutes if you don't join the queue
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-2">Queue Rules</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Be ready when your turn is called</li>
            <li>Missed turn = back of the queue</li>
            <li>
              Players arriving after 8:30 PM get priority over those who have
              played 2+ matches
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-2">Penalties</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>1st offense: Warning</li>
            <li>2nd offense: 1-hour ban</li>
            <li>3rd offense: 1-day ban</li>
            <li>Repeated offenses: Permanent ban</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
