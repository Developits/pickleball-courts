import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../api/client";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const getUserInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/api/profile");
      const data = await response.json();
      if (response.ok && data.user) {
        setProfile(data.user);
        setStats(data.stats);
        setEditName(data.user.name);
        setEditGender(data.user.gender);
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to load profile",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMessage({ type: "error", text: "Failed to load profile" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const response = await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ name: editName, gender: editGender }),
      });
      const data = await response.json();
      if (response.ok && data.user) {
        setProfile(data.user);
        setStats(data.stats);
        setIsEditing(false);
        setMessage({ type: "success", text: "Profile updated successfully!" });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to update profile",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Your Profile</h1>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Personal Info Card */}
        <div className="lg:col-span-2">
          <div className="card bg-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Personal Information
              </h2>
              <button
                onClick={() => setIsEditing((prev) => !prev)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>

            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="shrink-0">
                <div className="w-24 h-24 rounded-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                  {profile && getUserInitials(profile.name)}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Full Name
                      </label>
                      <p className="text-lg text-gray-900">{profile?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Student ID
                      </label>
                      <p className="text-lg text-gray-900">
                        {profile?.studentId}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Department
                      </label>
                      <p className="text-lg text-gray-900">
                        {profile?.department}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Degree
                      </label>
                      <p className="text-lg text-gray-900">{profile?.degree}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Year
                      </label>
                      <p className="text-lg text-gray-900">{profile?.year}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Gender
                      </label>
                      <p className="text-lg text-gray-900 capitalize">
                        {profile?.gender}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Member Since
                      </label>
                      <p className="text-lg text-gray-900">
                        {profile?.createdAt
                          ? new Date(profile.createdAt).toLocaleDateString()
                          : ""}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="lg:col-span-1">
          <div className="card bg-white">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Game Statistics
            </h2>

            <div className="space-y-4">
              {/* Win Rate */}
              <div className="text-center p-4 bg-linear-to-br from-green-50 to-green-100 rounded-xl">
                <p className="text-5xl font-bold text-green-600">
                  {stats?.winRate || 0}%
                </p>
                <p className="text-gray-600 mt-1">Win Rate</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.totalMatches || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Matches</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-3xl font-bold text-green-600">
                    {stats?.wins || 0}
                  </p>
                  <p className="text-sm text-gray-600">Wins</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-3xl font-bold text-red-500">
                    {stats?.losses || 0}
                  </p>
                  <p className="text-sm text-gray-600">Losses</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-3xl font-bold text-blue-600">
                    {stats?.completedMatches || 0}
                  </p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
