import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "../styles/Profile.css";

const formatCreatedAt = (value) => {
  if (!value) {
    return "Unknown";
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  }

  if (typeof value === "object") {
    if (typeof value._seconds === "number") {
      return new Date(value._seconds * 1000).toLocaleDateString();
    }

    if (typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleDateString();
    }
  }

  return "Unknown";
};

const ProfilePage = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (!userId) {
      setError("Missing user id.");
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(
          `http://127.0.0.1:5000/users/${userId}`,
        );
        setProfile(response.data || null);
      } catch (err) {
        console.error("Error loading profile:", err);
        setProfile(null);
        setError("Unable to load profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  const initials = useMemo(() => {
    const displayName = profile?.displayName || "";
    if (!displayName.trim()) {
      return "U";
    }

    return displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.displayName]);

  return (
    <div className="profile-page-wrapper">
      <div className="profile-card">
        <div className="profile-card-header">
          <h2>Profile</h2>
          <div className="profile-actions">
            <button
              type="button"
              className="profile-actions-trigger"
              onClick={() => setShowActions((prev) => !prev)}
              aria-label="Profile options"
            >
              ...
            </button>
            {showActions && (
              <div className="profile-actions-menu">
                <button type="button">Edit Profile (Coming soon)</button>
                <button type="button">Message User (Coming soon)</button>
                <button type="button">Report User (Coming soon)</button>
              </div>
            )}
          </div>
        </div>

        {loading && <p>Loading profile...</p>}
        {!loading && error && <p className="profile-error">{error}</p>}

        {!loading && !error && profile && (
          <div className="profile-details">
            <div className="profile-identity-row">
              <div className="profile-avatar" aria-hidden="true">
                {initials}
              </div>
              <h3 className="profile-display-name">
                {profile.displayName || "Not set"}
              </h3>
            </div>
            <div className="profile-row">
              <span className="profile-label">Created</span>
              <span>{formatCreatedAt(profile.createdAt)}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">School</span>
              <span>{profile.school || "Not set"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
