import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [formData, setFormData] = useState({
    studentId: "",
    password: "",
    name: "",
    department: "",
    degree: "Bachelor",
    year: 2023,
    gender: "male",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(formData);
      alert(
        "Registration submitted successfully! Your account will be approved by an admin.",
      );
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Student ID</label>
            <input
              type="text"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2">Degree</label>
              <select
                name="degree"
                value={formData.degree}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="Bachelor">Bachelor</option>
                <option value="Master">Master</option>
                <option value="PhD">PhD</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Year</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="2020"
                max="2030"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-green-500 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
