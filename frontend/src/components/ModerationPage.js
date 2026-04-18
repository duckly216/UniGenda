import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/Moderation.css";

const formatCreatedAt = (value) => {
  if (!value) {
    return "Unknown";
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }

  if (typeof value === "object") {
    if (typeof value._seconds === "number") {
      return new Date(value._seconds * 1000).toLocaleString();
    }

    if (typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleString();
    }
  }

  return "Unknown";
};

const PersonInfo = ({ title, person }) => (
  <div className="moderation-person-card">
    <h4>{title}</h4>
    <p>
      <strong>UID:</strong> {person?.uid || "Not found"}
    </p>
    <p>
      <strong>Name:</strong> {person?.displayName || "Not set"}
    </p>
    <p>
      <strong>Email:</strong> {person?.email || "Not set"}
    </p>
    <p>
      <strong>Phone:</strong> {person?.phone || "Not set"}
    </p>
    <p>
      <strong>School:</strong> {person?.school || "Not set"}
    </p>
  </div>
);

const ModerationPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [processingId, setProcessingId] = useState("");
  const [pendingBanReport, setPendingBanReport] = useState(null);
  const [currentUid, setCurrentUid] = useState("");
  const [tags, setTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [deletingTag, setDeletingTag] = useState("");
  const [tagError, setTagError] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get("http://127.0.0.1:5000/reports/active");
      setReports(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error loading active reports:", err);
      setError("Could not load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUid(user?.uid || "");
    });

    return () => unsubscribe();
  }, []);

  const fetchTags = async () => {
    setLoadingTags(true);
    setTagError("");

    try {
      const response = await axios.get("http://127.0.0.1:5000/task_tags");
      setTags(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error loading task tags:", err);
      setTagError("Could not load task tags.");
      setTags([]);
    } finally {
      setLoadingTags(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const addGlobalTag = async () => {
    if (!currentUid || addingTag) {
      return;
    }

    const normalizedTag = String(newTag || "").trim().toLowerCase();
    if (!normalizedTag) {
      return;
    }

    setAddingTag(true);
    setTagError("");

    try {
      const response = await axios.post("http://127.0.0.1:5000/task_tags", {
        userId: currentUid,
        tag: normalizedTag,
      });

      const createdTag = response?.data?.tag;
      if (createdTag) {
        setTags((prev) => (prev.includes(createdTag) ? prev : [...prev, createdTag].sort()));
      }
      setNewTag("");
    } catch (err) {
      console.error("Error adding global tag:", err);
      setTagError(err?.response?.data?.error || "Could not add tag.");
    } finally {
      setAddingTag(false);
    }
  };

  const deleteGlobalTag = async (tag) => {
    if (!currentUid || !tag || deletingTag) {
      return;
    }

    const confirmed = window.confirm(`Delete tag #${tag} from catalog?`);
    if (!confirmed) {
      return;
    }

    setDeletingTag(tag);
    setTagError("");

    try {
      await axios.delete(`http://127.0.0.1:5000/task_tags/${encodeURIComponent(tag)}`, {
        params: { userId: currentUid },
      });
      setTags((prev) => prev.filter((existingTag) => existingTag !== tag));
    } catch (err) {
      console.error("Error deleting global tag:", err);
      setTagError(err?.response?.data?.error || "Could not delete tag.");
    } finally {
      setDeletingTag("");
    }
  };

  const sortedReports = useMemo(() => {
    const copy = [...reports];
    copy.sort((a, b) => {
      const aSeconds = a?.createdAt?._seconds || a?.createdAt?.seconds || 0;
      const bSeconds = b?.createdAt?._seconds || b?.createdAt?.seconds || 0;
      return bSeconds - aSeconds;
    });
    return copy;
  }, [reports]);

  const closeReport = async (reportId) => {
    setProcessingId(reportId);

    try {
      await axios.patch(`http://127.0.0.1:5000/reports/${reportId}/close`);
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      if (expandedId === reportId) {
        setExpandedId("");
      }
    } catch (err) {
      console.error("Error closing report:", err);
      setError("Could not close report.");
    } finally {
      setProcessingId("");
    }
  };

  const banUser = async (reportId) => {
    setProcessingId(reportId);

    try {
      await axios.post(`http://127.0.0.1:5000/reports/${reportId}/ban`);
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      if (expandedId === reportId) {
        setExpandedId("");
      }
    } catch (err) {
      console.error("Error banning user:", err);
      setError("Could not ban user from this report.");
    } finally {
      setProcessingId("");
    }
  };

  const openBanConfirmation = (report) => {
    if (processingId) {
      return;
    }

    setPendingBanReport(report);
  };

  const closeBanConfirmation = () => {
    if (processingId) {
      return;
    }

    setPendingBanReport(null);
  };

  const confirmBan = async () => {
    if (!pendingBanReport?.id) {
      return;
    }

    await banUser(pendingBanReport.id);
    setPendingBanReport(null);
  };

  return (
    <div className="moderation-page-wrapper">
      <div className="moderation-layout">
        <h1>Moderation</h1>
        <p className="moderation-subtitle">Admin controls and report management</p>

        <section className="moderation-tag-section">
          <h2>Task Tag Catalog</h2>
          <p>Manage global task tags stored in task_tag_catalog.</p>

          <div className="moderation-tag-add-row">
            <input
              type="text"
              value={newTag}
              placeholder="new-tag"
              onChange={(event) => setNewTag(event.target.value)}
            />
            <button
              type="button"
              className="moderation-tag-add-button"
              onClick={addGlobalTag}
              disabled={addingTag || !currentUid}
            >
              {addingTag ? "Adding..." : "Add Tag"}
            </button>
          </div>

          {tagError && <p className="moderation-error">{tagError}</p>}

          {loadingTags ? (
            <p>Loading tags...</p>
          ) : tags.length === 0 ? (
            <p>No tags yet. Add your first tag above.</p>
          ) : (
            <div className="moderation-tag-list">
              {tags.map((tag) => (
                <span key={tag} className="moderation-tag-chip">
                  <span>#{tag}</span>
                  <button
                    type="button"
                    className="moderation-tag-delete"
                    onClick={() => deleteGlobalTag(tag)}
                    disabled={deletingTag === tag || addingTag || !currentUid}
                    aria-label={`Delete ${tag}`}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="moderation-reports-section">
          <h2>Active Reports</h2>

          {loading && <p>Loading reports...</p>}
          {!loading && error && <p className="moderation-error">{error}</p>}

          {!loading && !error && sortedReports.length === 0 && (
            <p>No active reports.</p>
          )}

          {!loading && sortedReports.length > 0 && (
            <div className="moderation-list">
              {sortedReports.map((report) => {
                const isExpanded = expandedId === report.id;
                const isBusy = processingId === report.id;

                return (
                  <div key={report.id} className="moderation-item">
                    <div className="moderation-item-header">
                      <div>
                        <h3>Report #{report.id.slice(0, 6)}</h3>
                        <p>Filed: {formatCreatedAt(report.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        className="moderation-toggle"
                        onClick={() => setExpandedId(isExpanded ? "" : report.id)}
                      >
                        {isExpanded ? "Hide" : "View"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="moderation-details">
                        <div className="moderation-description">
                          <strong>Description:</strong>
                          <p>{report.description || "No description."}</p>
                        </div>

                        <div className="moderation-people-grid">
                          <PersonInfo title="Victim" person={report.reporter} />
                          <PersonInfo
                            title="Perpetrator"
                            person={report.accused}
                          />
                        </div>

                        <div className="moderation-actions">
                          <button
                            type="button"
                            className="close-report-button"
                            onClick={() => closeReport(report.id)}
                            disabled={isBusy}
                          >
                            {isBusy ? "Processing..." : "Close Report"}
                          </button>
                          <button
                            type="button"
                            className="ban-user-button"
                            onClick={() => openBanConfirmation(report)}
                            disabled={isBusy}
                          >
                            {isBusy ? "Processing..." : "Ban User"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {pendingBanReport && (
        <div
          className="moderation-confirm-overlay"
          onClick={closeBanConfirmation}
        >
          <div
            className="moderation-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Confirm Ban</h3>
            <p>
              This will remove the user from Firestore and close report #
              {pendingBanReport.id.slice(0, 6)}.
            </p>
            <p>
              Perpetrator: {pendingBanReport.accused?.displayName || "Unknown"}
            </p>

            <div className="moderation-actions">
              <button
                type="button"
                className="close-report-button"
                onClick={closeBanConfirmation}
                disabled={processingId === pendingBanReport.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ban-user-button"
                onClick={confirmBan}
                disabled={processingId === pendingBanReport.id}
              >
                {processingId === pendingBanReport.id
                  ? "Processing..."
                  : "Confirm Ban"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationPage;
