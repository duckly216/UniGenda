import React, { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import "../../styles/TaskRelatedStyles.css";

const PublicTasksPage = () => {
  const [uid, setUid] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningTaskId, setJoiningTaskId] = useState(null);

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

  const isTaskFull = (task) => {
    const joinedUsers = Array.isArray(task.joinedUsers) ? task.joinedUsers : [];
    if (!Number.isInteger(task.peopleNeeded) || task.peopleNeeded <= 0) {
      return false;
    }
    return joinedUsers.length >= task.peopleNeeded;
  };

  const handleJoinTask = async (task) => {
    if (!uid || !task?.id || joiningTaskId) return;

    try {
      setJoiningTaskId(task.id);
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
      setJoiningTaskId(null);
    }
  };

  return (
    <div className="tasks-page">
      <div className="tasks-page-header">
        <h1>Public Tasks</h1>
        <p>Browse all public posts and join tasks created by other students.</p>
      </div>

      <section className="tasks-page-section">
        {loading ? (
          <p>Loading public tasks...</p>
        ) : tasks.length === 0 ? (
          <p>No public tasks available right now.</p>
        ) : (
          <div className="public-tasks-grid">
            {tasks.map((task) => {
              const joinedUsers = Array.isArray(task.joinedUsers) ? task.joinedUsers : [];
              const ownedByCurrentUser = uid && task.userId === uid;
              const alreadyJoined = hasUserJoinedTask(task);
              const full = isTaskFull(task);
              const joinDisabled = ownedByCurrentUser || alreadyJoined || full || joiningTaskId === task.id;

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

                  <div className="public-task-meta">
                    <small>Status: {task.status || "pending"}</small>
                    <small>Due: {task.dueDate || "No due date"}</small>
                  </div>

                  {!ownedByCurrentUser && (
                    <button
                      type="button"
                      className="public-task-join-button"
                      onClick={() => handleJoinTask(task)}
                      disabled={joinDisabled}
                    >
                      {joiningTaskId === task.id
                        ? "Joining..."
                        : alreadyJoined
                          ? "Joined"
                          : full
                            ? "Task Full"
                            : "Join"}
                    </button>
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
    </div>
  );
};

export default PublicTasksPage;
