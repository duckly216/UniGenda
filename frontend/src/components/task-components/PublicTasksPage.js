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
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});

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
        const tasksData = Array.isArray(response.data) ? response.data : [];
        setTasks(tasksData);
        tasksData.forEach(t => t?.id && getComments(t.id));
      } catch (error) {
        console.error("Error loading public tasks:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicTasks();
  }, [uid]);

  const getComments = async (taskId) => {
    try {
      console.log("Fetching comments for taskId:", taskId);
      const res = await axios.get(`http://127.0.0.1:5000/public_tasks/${taskId}/comments`);
      const data = Array.isArray(res.data) ? res.data : [];
      console.log("Comments received for", taskId, ":", data);
      data.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      setComments(prev => ({ ...prev, [taskId]: data }));
    } catch (e) {
      console.error('Error fetching comments:', e);
    }
  };

  const addComment = async (taskId) => {
    const text = commentText[taskId] || '';
    if (!text.trim() || !uid) return;

    try {
      await axios.post(`http://127.0.0.1:5000/public_tasks/${taskId}/comments`, {
        text,
        user_id: uid,
        username: auth.currentUser?.displayName || 'User'
      });

      setCommentText(prev => ({ ...prev, [taskId]: '' }));
      getComments(taskId);
    } catch (e) {
      console.error('Error adding comment:', e);
    }
  };

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
              console.log("Rendering task with id:", task.id);
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

                  <div className="comments-section">
                    <strong>Comments:</strong>
                    {comments[task.id]?.length ? (
                      comments[task.id].map((c, i) => (
                        <div key={i} className="comment-item">
                          <strong>{c.username || 'User'}:</strong> {c.text}
                          <div style={{ fontSize: '12px', color: 'gray' }}>
                            {c.timestamp
                              ? new Date(c.timestamp.seconds * 1000).toLocaleString()
                              : ''}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>No comments yet.</p>
                    )}

                    <input
                      type="text"
                      placeholder="Add a comment"
                      value={commentText[task.id] || ''}
                      onChange={(e) =>
                        setCommentText(prev => ({ ...prev, [task.id]: e.target.value }))
                      }
                    />
                    <button onClick={() => addComment(task.id)}>Add Comment</button>
                  </div>
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
