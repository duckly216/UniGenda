import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { updateEmail, updateProfile, signOut } from "firebase/auth";
import { auth } from "../firebase";
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

const ProfilePage = ({ currentUser }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showActions, setShowActions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    phone: "",
    school: "",
  });

  const activeUserId = currentUser?.uid || auth.currentUser?.uid;

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

  const isOwnProfile = auth.currentUser?.uid === userId;

  const openEditModal = () => {
    if (!isOwnProfile || !profile) {
      return;
    }

    setShowActions(false);
    setEditError("");
    setEditForm({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      displayName: profile.displayName || "",
      email: profile.email || auth.currentUser?.email || "",
      phone: profile.phone || "",
      school: profile.school || "",
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (savingEdit) {
      return;
    }

    setShowEditModal(false);
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitEditProfile = async () => {
    if (!isOwnProfile || !auth.currentUser) {
      setEditError("You can only edit your own profile.");
      return;
    }

    const payload = {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      displayName: editForm.displayName.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      school: editForm.school.trim(),
    };

    if (!payload.displayName) {
      setEditError("Display name is required.");
      return;
    }

    if (!payload.email) {
      setEditError("Email is required.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const currentEmail = auth.currentUser.email || "";
      if (payload.email !== currentEmail) {
        await updateEmail(auth.currentUser, payload.email);
      }

      if (payload.displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: payload.displayName,
        });
      }

      await axios.patch(`http://127.0.0.1:5000/users/${userId}`, payload);

      setProfile((prev) => ({
        ...(prev || {}),
        ...payload,
      }));
      setShowEditModal(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      if (err.code === "auth/requires-recent-login") {
        setEditError(
          "For security, please log out and log back in before changing email.",
        );
      } else {
        setEditError("Could not save profile updates. Please try again.");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const openReportModal = () => {
    setShowActions(false);
    setReportDescription("");
    setReportError("");
    setReportSuccess(false);
    setShowReportModal(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  const closeReportModal = () => {
    if (submittingReport) {
      return;
    }

    setShowReportModal(false);
  };

  const handleBlockUser = () => {
    if (isOwnProfile) {
      return;
    }

    const targetLabel =
      profile?.displayName || profile?.email || "this user";
    const confirmed = window.confirm(`Block ${targetLabel}?`);
    if (!confirmed) {
      return;
    }

    setShowActions(false);
    alert("Blocking users is coming soon.");
  };

  const submitReport = async () => {
    const reporterId = auth.currentUser?.uid;
    const description = reportDescription.trim();

    if (!reporterId) {
      setReportError("You must be logged in to submit a report.");
      return;
    }

    if (!userId) {
      setReportError("Missing accused user id.");
      return;
    }

    if (!description) {
      setReportError("Please describe the problem.");
      return;
    }

    setSubmittingReport(true);
    setReportError("");

    try {
      await axios.post("http://127.0.0.1:5000/reports", {
        userId: reporterId,
        accusedId: userId,
        description,
      });
      setReportSuccess(true);
      setReportDescription("");
    } catch (err) {
      console.error("Error submitting report:", err);
      setReportError("Could not submit report. Please try again.");
    } finally {
      setSubmittingReport(false);
    }
  };

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
                {isOwnProfile && (
                  <button type="button" onClick={openEditModal}>
                    Edit Profile
                  </button>
                )}
                {!isOwnProfile && (
                  <button type="button">Message User (WIP)</button>
                )}
                {!isOwnProfile && (
                  <button type="button" onClick={openReportModal}>
                    Report User
                  </button>
                )}
                {isOwnProfile && (
                  <button type="button" onClick={handleLogout}>
                    Logout
                <button type="button">Message User (WIP)</button>
                <button type="button" onClick={openReportModal}>
                  Report User
                </button>
                {!isOwnProfile && (
                  <button
                    type="button"
                    className="profile-actions-danger"
                    onClick={handleBlockUser}
                  >
                    Block User
                  </button>
                )}
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

        {!loading && !error && isOwnProfile && (
          <div className="profile-logout-section">
            <button
              type="button"
              className="profile-logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {showReportModal && (
        <div className="report-modal-overlay" onClick={closeReportModal}>
          <div
            className="report-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Report User</h3>

            {!reportSuccess ? (
              <>
                <p className="report-modal-helper">
                  Tell us what happened. An admin will review this report.
                </p>
                <textarea
                  className="report-textarea"
                  value={reportDescription}
                  onChange={(event) => setReportDescription(event.target.value)}
                  placeholder="Describe the issue"
                  rows={5}
                />
                {reportError && <p className="profile-error">{reportError}</p>}
                <div className="report-modal-actions">
                  <button
                    type="button"
                    className="report-cancel-button"
                    onClick={closeReportModal}
                    disabled={submittingReport}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="report-submit-button"
                    onClick={submitReport}
                    disabled={submittingReport}
                  >
                    {submittingReport ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </>
            ) : (
              <div className="report-success-state">
                <div className="report-success-check" aria-hidden="true">
                  ✓
                </div>
                <p>An admin will look into it.</p>
                <button
                  type="button"
                  className="report-submit-button"
                  onClick={closeReportModal}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="report-modal-overlay" onClick={closeEditModal}>
          <div
            className="report-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Edit Profile</h3>
            <p className="report-modal-helper">
              Update your profile information.
            </p>

            <div className="edit-profile-grid">
              <div className="edit-profile-field">
                <label className="edit-profile-label" htmlFor="first-name">
                  First name
                </label>
                <input
                  id="first-name"
                  className="edit-profile-input"
                  value={editForm.firstName}
                  onChange={(event) =>
                    handleEditChange("firstName", event.target.value)
                  }
                  placeholder="First name"
                />
              </div>
              <div className="edit-profile-field">
                <label className="edit-profile-label" htmlFor="last-name">
                  Last name
                </label>
                <input
                  id="last-name"
                  className="edit-profile-input"
                  value={editForm.lastName}
                  onChange={(event) =>
                    handleEditChange("lastName", event.target.value)
                  }
                  placeholder="Last name"
                />
              </div>
              <div className="edit-profile-field">
                <label className="edit-profile-label" htmlFor="display-name">
                  Display name
                </label>
                <input
                  id="display-name"
                  className="edit-profile-input"
                  value={editForm.displayName}
                  onChange={(event) =>
                    handleEditChange("displayName", event.target.value)
                  }
                  placeholder="Display name"
                />
              </div>
              <div className="edit-profile-field">
                <label className="edit-profile-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="edit-profile-input"
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    handleEditChange("email", event.target.value)
                  }
                  placeholder="Email"
                />
              </div>
              <div className="edit-profile-field">
                <label className="edit-profile-label" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  className="edit-profile-input"
                  value={editForm.phone}
                  onChange={(event) =>
                    handleEditChange("phone", event.target.value)
                  }
                  placeholder="Phone"
                />
              </div>
              <div className="edit-profile-field">
                <label className="edit-profile-label" htmlFor="school">
                  School
                </label>
                <select
                  id="school"
                  className="edit-profile-input"
                  value={editForm.school}
                  onChange={(event) =>
                    handleEditChange("school", event.target.value)
                  }
                >
                  <option value="">Select school</option>
                  <option value="SF">Santa Fe College</option>
                  <option value="UF">University of Florida</option>
                </select>
              </div>
            </div>

            {editError && <p className="profile-error">{editError}</p>}

            <div className="report-modal-actions">
              <button
                type="button"
                className="report-cancel-button"
                onClick={closeEditModal}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="report-submit-button"
                onClick={submitEditProfile}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
