import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
        <p className="moderation-subtitle">Active reports</p>

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
