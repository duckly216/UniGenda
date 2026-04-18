import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import "../../styles/TaskRelatedStyles.css";

const PublicTasksPage = () => {
  const [uid, setUid] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingTaskId, setProcessingTaskId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [editingOwnedTask, setEditingOwnedTask] = useState(null);
  const [savingOwnedTask, setSavingOwnedTask] = useState(false);
  const [editOwnedForm, setEditOwnedForm] = useState({
    title: "",
    dueDate: "",
    priority: "medium",
    description: "",
    visibility: "public",
    peopleNeeded: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPublicTasks = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://127.0.0.1:5000/public_tasks");
        setTasks(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error loading public tasks:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicTasks();
  }, [uid]);

  const hasUserJoinedTask = (task) => {
    if (!uid) return false;
    const joinedUsers = Array.isArray(task.joinedUsers) ? task.joinedUsers : [];
    return joinedUsers.some((joinedUser) => joinedUser?.uid === uid);
  };

  const parsedSearch = useMemo(() => {
    const normalized = (searchInput || "").trim().toLowerCase();
    const tokens = normalized.length > 0 ? normalized.split(/\s+/) : [];

    const tagFilters = tokens
      .filter((token) => token.startsWith("#") && token.length > 1)
      .map((token) => token.slice(1));

    const titleTerms = tokens.filter((token) => !token.startsWith("#"));

    return {
      titleQuery: titleTerms.join(" "),
      tagFilters,
    };
  }, [searchInput]);

  const filteredTasks = useMemo(() => {
    const { titleQuery, tagFilters } = parsedSearch;

    return tasks.filter((task) => {
      const title = String(task?.title || "").toLowerCase();
      const taskTags = Array.isArray(task?.tags)
        ? task.tags.map((tag) => String(tag).toLowerCase())
        : [];

      const titleMatches = !titleQuery || title.includes(titleQuery);
      const tagsMatch =
        tagFilters.length === 0 ||
        tagFilters.every((filterTag) => taskTags.includes(filterTag));

      return titleMatches && tagsMatch;
    });
  }, [tasks, parsedSearch]);

  const isTaskFull = (task) => {
    const joinedUsers = Array.isArray(task.joinedUsers) ? task.joinedUsers : [];
    if (!Number.isInteger(task.peopleNeeded) || task.peopleNeeded <= 0) {
      return false;
    }
    return joinedUsers.length >= task.peopleNeeded;
  };

  const handleJoinTask = async (task) => {
    if (!uid || !task?.id || processingTaskId) return;

    try {
      setProcessingTaskId(task.id);
      const response = await axios.post(
        `http://127.0.0.1:5000/public_tasks/${task.id}/join`,
        {
          userId: uid,
        },
      );

      const updatedTask = response?.data?.task;
      if (updatedTask) {
        setTasks((prev) =>
          prev.map((existingTask) =>
            existingTask.id === task.id
              ? { ...existingTask, ...updatedTask }
              : existingTask,
          ),
        );
      }
    } catch (error) {
      const message = error?.response?.data?.error || "Unable to join this task.";
      alert(message);
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleLeaveTask = async (task) => {
    if (!uid || !task?.id || processingTaskId) return;

    try {
      setProcessingTaskId(task.id);
      const response = await axios.post(
        `http://127.0.0.1:5000/public_tasks/${task.id}/leave`,
        {
          userId: uid,
        },
      );

      const updatedTask = response?.data?.task;
      if (updatedTask) {
        setTasks((prev) =>
          prev.map((existingTask) =>
            existingTask.id === task.id
              ? { ...existingTask, ...updatedTask }
              : existingTask,
          ),
        );
      }
    } catch (error) {
      const message = error?.response?.data?.error || "Unable to leave this task.";
      alert(message);
    } finally {
      setProcessingTaskId(null);
    }
  };

  const openOwnedTaskEditModal = (task) => {
    if (!task?.id) return;

    setEditingOwnedTask(task);
    setEditOwnedForm({
      title: task.title || "",
      dueDate: task.dueDate || "",
      priority: task.priority || "medium",
      description: task.description || "",
      visibility: task.visibility || (task.isPublic ? "public" : "private"),
      peopleNeeded: Number.isInteger(task.peopleNeeded) ? String(task.peopleNeeded) : "",
    });
  };

  const closeOwnedTaskEditModal = () => {
    if (savingOwnedTask) return;

    setEditingOwnedTask(null);
    setEditOwnedForm({
      title: "",
      dueDate: "",
      priority: "medium",
      description: "",
      visibility: "public",
      peopleNeeded: "",
    });
  };

  const handleOwnedTaskEditSubmit = async (event) => {
    event.preventDefault();
    if (!uid || !editingOwnedTask?.id || savingOwnedTask) return;

    const nextTitle = String(editOwnedForm.title || "").trim();
    if (!nextTitle) {
      alert("Task title cannot be empty.");
      return;
    }

    const normalizedPriority = String(editOwnedForm.priority || "medium").trim().toLowerCase();
    if (!["low", "medium", "high"].includes(normalizedPriority)) {
      alert("Priority must be low, medium, or high.");
      return;
    }

    const normalizedDueDate = String(editOwnedForm.dueDate || "").trim() || null;
    const normalizedDescription = String(editOwnedForm.description || "");
    const titleChanged = nextTitle !== String(editingOwnedTask.title || "").trim();
    const nextVisibility = editOwnedForm.visibility === "public" ? "public" : "private";
    const renameForcesPrivate = Boolean(editingOwnedTask.isPublic && titleChanged);
    const switchedPublicToPrivate = Boolean(editingOwnedTask.isPublic && nextVisibility === "private");
    const willDisbandPublicPost = renameForcesPrivate || switchedPublicToPrivate;
    const finalVisibility = renameForcesPrivate ? "private" : nextVisibility;

    let nextPeopleNeeded = null;
    if (finalVisibility === "public") {
      const parsedPeopleNeeded = Number(String(editOwnedForm.peopleNeeded || "").trim());
      if (!Number.isInteger(parsedPeopleNeeded) || parsedPeopleNeeded < 1 || parsedPeopleNeeded > 10) {
        alert("People needed must be a whole number between 1 and 10.");
        return;
      }
      nextPeopleNeeded = parsedPeopleNeeded;
    }

    if (willDisbandPublicPost) {
      const confirmed = window.confirm(
        "Warning: This change will make the post private and disband the current group (remove joined users). Continue?"
      );
      if (!confirmed) return;
    }

    const payload = {
      userId: uid,
      title: nextTitle,
      description: normalizedDescription,
      dueDate: normalizedDueDate,
      priority: normalizedPriority,
      visibility: finalVisibility,
      isPublic: finalVisibility === "public",
      peopleNeeded: finalVisibility === "public" ? nextPeopleNeeded : null,
    };

    try {
      setSavingOwnedTask(true);
      await axios.patch(`http://127.0.0.1:5000/users/${uid}/tasks/${editingOwnedTask.id}`, payload);

      setTasks((prev) => {
        if (finalVisibility !== "public") {
          return prev.filter((task) => task.id !== editingOwnedTask.id);
        }

        return prev.map((task) =>
          task.id === editingOwnedTask.id
            ? {
                ...task,
                title: nextTitle,
                description: normalizedDescription,
                dueDate: normalizedDueDate,
                priority: normalizedPriority,
                visibility: finalVisibility,
                isPublic: true,
                peopleNeeded: nextPeopleNeeded,
                ...(willDisbandPublicPost ? { joinedUsers: [] } : {}),
              }
            : task
        );
      });

      closeOwnedTaskEditModal();
    } catch (error) {
      console.error("Error editing owned public post:", error);
      alert("Could not edit this post. Please try again.");
    } finally {
      setSavingOwnedTask(false);
    }
  };

  return (
    <div className="tasks-page">
      <div className="tasks-page-header">
        <h1>Public Tasks</h1>
        <p>Browse all public posts and join tasks created by other students.</p>
      </div>

      <section className="tasks-page-section">
        <div className="public-task-search-wrapper">
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search post names (use #tag for tag filtering)"
            className="public-task-search-input"
          />
          <small className="public-task-search-hint">
            Search title text now. Tag search foundation is enabled via hashtags (example: #study #math).
          </small>
          {parsedSearch.tagFilters.length > 0 && (
            <div className="public-task-active-tags">
              {parsedSearch.tagFilters.map((tag) => (
                <span key={tag} className="public-task-tag-pill">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p>Loading public tasks...</p>
        ) : tasks.length === 0 ? (
          <p>No public tasks available right now.</p>
        ) : filteredTasks.length === 0 ? (
          <p>No public tasks matched your search.</p>
        ) : (
          <div className="public-tasks-grid">
            {filteredTasks.map((task) => {
              const joinedUsers = Array.isArray(task.joinedUsers) ? task.joinedUsers : [];
              const ownedByCurrentUser = uid && task.userId === uid;
              const alreadyJoined = hasUserJoinedTask(task);
              const full = isTaskFull(task);
              const joinDisabled = ownedByCurrentUser || alreadyJoined || full || processingTaskId === task.id;
              const leaveDisabled = !alreadyJoined || processingTaskId === task.id;

              return (
                <article
                  key={task.id}
                  className={`public-task-card priority-underlined priority-${task.priority || "medium"}`}
                >
                  <div className="public-task-card-header">
                    <h3>{task.title}</h3>
                    {Number.isInteger(task.peopleNeeded) && task.peopleNeeded > 0 ? (
                      <span className="public-task-slot-count">
                        {joinedUsers.length}/{task.peopleNeeded} joined
                      </span>
                    ) : (
                      <span className="public-task-slot-count">{joinedUsers.length} joined</span>
                    )}
                  </div>

                  <p className="public-task-description">{task.description || "No description."}</p>

                  {Array.isArray(task.tags) && task.tags.length > 0 && (
                    <div className="public-task-tags">
                      {task.tags.map((tag) => (
                        <span key={`${task.id}-${tag}`} className="public-task-tag-pill">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="public-task-meta">
                    <small>Status: {task.status || "pending"}</small>
                    <small>Due: {task.dueDate || "No due date"}</small>
                  </div>

                  {!ownedByCurrentUser && (
                    alreadyJoined ? (
                      <button
                        type="button"
                        className="public-task-join-button"
                        onClick={() => handleLeaveTask(task)}
                        disabled={leaveDisabled}
                      >
                        {processingTaskId === task.id ? "Leaving..." : "Leave Group"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="public-task-join-button"
                        onClick={() => handleJoinTask(task)}
                        disabled={joinDisabled}
                      >
                        {processingTaskId === task.id
                          ? "Joining..."
                          : full
                            ? "Task Full"
                            : "Join"}
                      </button>
                    )
                  )}

                  {ownedByCurrentUser && (
                    <div className="public-task-owner-actions">
                      <button
                        type="button"
                        className="public-task-join-button"
                        onClick={() => openOwnedTaskEditModal(task)}
                      >
                        Edit Post
                      </button>
                    </div>
                  )}

                  {ownedByCurrentUser && (
                    <div className="joined-users-block">
                      <strong>Joined users:</strong>
                      {joinedUsers.length === 0 ? (
                        <p>No one has joined yet.</p>
                      ) : (
                        <ul>
                          {joinedUsers.map((joinedUser) => (
                            <li key={joinedUser.uid || `${task.id}-${joinedUser.email || "unknown"}`}>
                              {joinedUser.displayName || joinedUser.email || joinedUser.uid}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editingOwnedTask && (
        <div className="tasks-modal-overlay" onClick={closeOwnedTaskEditModal}>
          <div className="tasks-modal-content task-edit-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="tasks-modal-close"
              onClick={closeOwnedTaskEditModal}
              aria-label="Close edit public post modal"
            >
              ✕
            </button>

            <h3>Edit Public Post</h3>
            <form className="task-edit-form" onSubmit={handleOwnedTaskEditSubmit}>
              <label>
                Task Name
                <input
                  type="text"
                  value={editOwnedForm.title}
                  onChange={(event) =>
                    setEditOwnedForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Due Date
                <input
                  type="date"
                  value={editOwnedForm.dueDate || ""}
                  onChange={(event) =>
                    setEditOwnedForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
              </label>

              <label>
                Priority
                <select
                  className={`priority-select priority-underlined priority-${editOwnedForm.priority || "medium"}`}
                  value={editOwnedForm.priority}
                  onChange={(event) =>
                    setEditOwnedForm((prev) => ({ ...prev, priority: event.target.value }))
                  }
                >
                  <option value="low" className="priority-option">Low</option>
                  <option value="medium" className="priority-option">Medium</option>
                  <option value="high" className="priority-option">High</option>
                </select>
              </label>

              <label>
                Description
                <textarea
                  rows={4}
                  value={editOwnedForm.description}
                  onChange={(event) =>
                    setEditOwnedForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>

              <label>
                Visibility
                <select
                  value={editOwnedForm.visibility}
                  onChange={(event) =>
                    setEditOwnedForm((prev) => ({
                      ...prev,
                      visibility: event.target.value,
                      peopleNeeded:
                        event.target.value === "public"
                          ? (prev.peopleNeeded || "1")
                          : "",
                    }))
                  }
                >
                  <option value="private">Private</option>
                  <option value="public">Public (Make it a Post!)</option>
                </select>
              </label>

              {editOwnedForm.visibility === "public" && (
                <label>
                  People Needed
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={editOwnedForm.peopleNeeded}
                    onChange={(event) =>
                      setEditOwnedForm((prev) => ({ ...prev, peopleNeeded: event.target.value }))
                    }
                    placeholder="How many people are needed? (1-10)"
                    required
                  />
                </label>
              )}

              {editingOwnedTask.isPublic && (String(editOwnedForm.title || "").trim() !== String(editingOwnedTask.title || "").trim() || editOwnedForm.visibility === "private") && (
                <p className="task-edit-warning">
                  Warning: This change will make the post private and disband the current group.
                </p>
              )}

              <div className="task-edit-actions">
                <button type="button" className="task-edit-cancel" onClick={closeOwnedTaskEditModal} disabled={savingOwnedTask}>
                  Cancel
                </button>
                <button type="submit" className="task-edit-save" disabled={savingOwnedTask}>
                  {savingOwnedTask ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicTasksPage;
