import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import '../../styles/TaskRelatedStyles.css';

const TaskList = ({ refreshTrigger, limit = 10, showAllStatuses = false }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [confirmingTaskId, setConfirmingTaskId] = useState(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState({});
  const [activeTab, setActiveTab] = useState('uncompleted'); // 'uncompleted' or 'completed'
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    dueDate: '',
    priority: 'medium',
    description: '',
    visibility: 'private',
    peopleNeeded: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      try {
        const limitParam = Number.isInteger(limit) && limit > 0 ? `?limit=${limit}` : '';
        const response = await axios.get(`http://127.0.0.1:5000/users/${uid}/tasks${limitParam}`);
        setTasks(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setLoading(false); // Stop loading regardless of success/fail
      }
    };

    setLoading(true);
    fetchTasks();
  }, [uid, refreshTrigger]); // Refetches when auth/task state changes

  useEffect(() => {
    const handleGlobalClick = (event) => {
      if (!event.target.closest('.task-item-actions')) {
        setOpenMenuTaskId(null);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const confirmDeleteTask = async (taskId) => {
    if (!uid || !taskId) return;

    try {
      setDeletingTaskId(taskId);
      await axios.delete(`http://127.0.0.1:5000/users/${uid}/tasks/${taskId}`);

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Could not delete task. Please try again.');
    } finally {
      setDeletingTaskId(null);
      setConfirmingTaskId(null);
    }
  };

  const toggleTaskDetails = (taskId) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const openEditModal = (task) => {
    if (!task?.id) return;

    setOpenMenuTaskId(null);
    setEditingTask(task);
    setEditForm({
      title: task.title || '',
      dueDate: task.dueDate || '',
      priority: task.priority || 'medium',
      description: task.description || '',
      visibility: task.visibility || (task.isPublic ? 'public' : 'private'),
      peopleNeeded: Number.isInteger(task.peopleNeeded) ? String(task.peopleNeeded) : ''
    });
  };

  const closeEditModal = () => {
    if (deletingTaskId) return;
    setEditingTask(null);
    setEditForm({
      title: '',
      dueDate: '',
      priority: 'medium',
      description: '',
      visibility: 'private',
      peopleNeeded: ''
    });
  };

  const handleDeleteFromEditModal = async () => {
    if (!uid || !editingTask?.id || deletingTaskId) return;

    const confirmed = window.confirm('Are you sure you want to delete this task?');
    if (!confirmed) return;

    try {
      setDeletingTaskId(editingTask.id);
      await axios.delete(`http://127.0.0.1:5000/users/${uid}/tasks/${editingTask.id}`);

      setTasks((prev) => prev.filter((task) => task.id !== editingTask.id));
      closeEditModal();
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Could not delete task. Please try again.');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!uid || !editingTask?.id) return;

    const nextTitle = String(editForm.title || '').trim();
    if (!nextTitle) {
      alert('Task title cannot be empty.');
      return;
    }

    const normalizedPriority = String(editForm.priority || 'medium').trim().toLowerCase();
    if (!['low', 'medium', 'high'].includes(normalizedPriority)) {
      alert('Priority must be low, medium, or high.');
      return;
    }

    const normalizedDueDate = String(editForm.dueDate || '').trim() || null;
    const normalizedDescription = String(editForm.description || '');
    const titleChanged = nextTitle !== String(editingTask.title || '').trim();
    const nextVisibility = editForm.visibility === 'public' ? 'public' : 'private';
    const renameForcesPrivate = Boolean(editingTask.isPublic && titleChanged);
    const switchedPublicToPrivate = Boolean(editingTask.isPublic && nextVisibility === 'private');
    const willDisbandPublicPost = renameForcesPrivate || switchedPublicToPrivate;
    const finalVisibility = renameForcesPrivate ? 'private' : nextVisibility;

    let nextPeopleNeeded = null;
    if (finalVisibility === 'public') {
      const parsedPeopleNeeded = Number(String(editForm.peopleNeeded || '').trim());
      if (!Number.isInteger(parsedPeopleNeeded) || parsedPeopleNeeded < 1 || parsedPeopleNeeded > 10) {
        alert('People needed must be a whole number between 1 and 10.');
        return;
      }
      nextPeopleNeeded = parsedPeopleNeeded;
    }

    if (willDisbandPublicPost) {
      const confirmed = window.confirm(
        'Warning: This change will make the post private and disband the current group (remove joined users). Continue?'
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
      isPublic: finalVisibility === 'public',
      peopleNeeded: finalVisibility === 'public' ? nextPeopleNeeded : null
    };

    try {
      await axios.patch(`http://127.0.0.1:5000/users/${uid}/tasks/${editingTask.id}`, payload);

      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                title: nextTitle,
                description: normalizedDescription,
                dueDate: normalizedDueDate,
                priority: normalizedPriority,
                visibility: finalVisibility,
                isPublic: finalVisibility === 'public',
                peopleNeeded: finalVisibility === 'public' ? nextPeopleNeeded : null,
                ...(willDisbandPublicPost
                  ? {
                      joinedUsers: []
                    }
                  : {})
              }
            : task
        )
      );

      closeEditModal();
    } catch (err) {
      console.error('Error editing task:', err);
      alert('Could not edit task. Please try again.');
    }
  };

  const toggleTaskCompletion = async (task) => {
    if (!uid || !task.id) return;

    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await axios.patch(`http://127.0.0.1:5000/users/${uid}/tasks/${task.id}`, {
        userId: uid,
        status: newStatus
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: newStatus } : t
        )
      );
    } catch (err) {
      console.error('Error updating task status:', err);
      alert('Could not update task status. Please try again.');
    }
  };

  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const uncompletedTasks = tasks.filter((task) => task.status !== 'completed');

  // Filter tasks based on active tab
  const filteredTasks = activeTab === 'completed' ? completedTasks : uncompletedTasks;

  const renderTaskItems = (taskItems) => (
    taskItems.map(task => (
      <div
        key={task.id}
        className={`task-item task-item-with-confirmation priority-underlined priority-${task.priority || 'medium'}`}
      >
        <div className={`task-item-content ${confirmingTaskId === task.id ? 'task-item-obscured' : ''}`}>
          <div className="task-item-header-row">
            <div className="task-item-checkbox-wrapper">
              <input
                type="checkbox"
                className="task-item-checkbox"
                checked={task.status === 'completed'}
                onChange={() => toggleTaskCompletion(task)}
                disabled={deletingTaskId === task.id}
              />
            </div>

            <div className="task-item-summary">
              <div className="task-item-title-row">
                <h4>{task.title}</h4>
                <small className="task-item-due-inline">Due: {task.dueDate || 'No due date'}</small>
              </div>
            </div>

            <div className="task-item-actions">
              <button
                type="button"
                className="task-menu-button"
                aria-label="Task options"
                aria-haspopup="menu"
                aria-expanded={openMenuTaskId === task.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuTaskId((prev) => (prev === task.id ? null : task.id));
                }}
                disabled={deletingTaskId === task.id}
              >
                ⋯
              </button>

              {openMenuTaskId === task.id && (
                <div className="task-item-menu" role="menu">
                  <button
                    type="button"
                    className="task-item-menu-option"
                    onClick={() => {
                      toggleTaskDetails(task.id);
                      setOpenMenuTaskId(null);
                    }}
                  >
                    {expandedTaskIds[task.id] ? 'Hide Details' : 'Show Details'}
                  </button>
                  <button
                    type="button"
                    className="task-item-menu-option"
                    onClick={() => openEditModal(task)}
                  >
                    Edit Task
                  </button>
                  {confirmingTaskId !== task.id && (
                    <button
                      type="button"
                      className="task-item-menu-option danger"
                      onClick={() => {
                        setConfirmingTaskId(task.id);
                        setOpenMenuTaskId(null);
                      }}
                      disabled={deletingTaskId === task.id}
                    >
                      {deletingTaskId === task.id ? 'Deleting...' : 'Delete Task'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {expandedTaskIds[task.id] && (
            <div className="task-item-details">
              <p>{task.description || "No description."}</p>
              {Array.isArray(task.tags) && task.tags.length > 0 ? (
                <small>Tags: {task.tags.join(', ')}</small>
              ) : (
                <small>Tags: None</small>
              )}
            </div>
          )}

        </div>

        {confirmingTaskId === task.id && (
          <div className="task-delete-confirmation-overlay">
            <p>Are you sure you want to delete this task?</p>
            <div className="task-delete-confirmation-actions">
              <button
                type="button"
                className="delete-task-button confirm-yes"
                onClick={() => confirmDeleteTask(task.id)}
                disabled={deletingTaskId === task.id}
              >
                {deletingTaskId === task.id ? 'Deleting...' : 'Yes'}
              </button>
              <button
                type="button"
                className="delete-task-button confirm-no"
                onClick={() => setConfirmingTaskId(null)}
                disabled={deletingTaskId === task.id}
              >
                No
              </button>
            </div>
          </div>
        )}
      </div>
    ))
  );

  return (
    <div className="task-list">
      {loading && <p>Loading tasks...</p>}
      {!showAllStatuses && (
        <div className="task-list-tabs">
          <button
            className={`task-list-tab ${activeTab === 'uncompleted' ? 'active' : ''}`}
            onClick={() => setActiveTab('uncompleted')}
          >
            Uncompleted
          </button>
          <button
            className={`task-list-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>
      )}

      {!showAllStatuses ? (
        filteredTasks.length > 0 ? (
          renderTaskItems(filteredTasks)
        ) : (
          <div className="empty-tasks">
            <p>
              {activeTab === 'completed'
                ? 'No completed tasks. Get started with uncompleted tasks!'
                : 'No upcoming tasks. Enjoy your free time!'}
            </p>
          </div>
        )
      ) : (
        <div className="task-list-dual-sections">
          <section className="task-list-dual-section">
            <h3 className="task-list-dual-section-title">Uncompleted</h3>
            {uncompletedTasks.length > 0 ? (
              renderTaskItems(uncompletedTasks)
            ) : (
              <div className="empty-tasks">
                <p>No upcoming tasks. Enjoy your free time!</p>
              </div>
            )}
          </section>

          <section className="task-list-dual-section">
            <h3 className="task-list-dual-section-title">Completed</h3>
            {completedTasks.length > 0 ? (
              renderTaskItems(completedTasks)
            ) : (
              <div className="empty-tasks">
                <p>No completed tasks. Get started with uncompleted tasks!</p>
              </div>
            )}
          </section>
        </div>
      )}

      {editingTask && (
        <div className="tasks-modal-overlay" onClick={closeEditModal}>
          <div className="tasks-modal-content task-edit-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="tasks-modal-close"
              onClick={closeEditModal}
              aria-label="Close edit task modal"
            >
              ✕
            </button>

            <h3>Edit Task</h3>
            <form className="task-edit-form" onSubmit={handleEditSubmit}>
              <label>
                Task Name
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Due Date
                <input
                  type="date"
                  value={editForm.dueDate || ''}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
              </label>

              <label>
                Priority
                <select
                  className={`priority-select priority-underlined priority-${editForm.priority || 'medium'}`}
                  value={editForm.priority}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, priority: event.target.value }))
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
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>

              <label>
                Visibility
                <select
                  value={editForm.visibility}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      visibility: event.target.value,
                      peopleNeeded:
                        event.target.value === 'public'
                          ? (prev.peopleNeeded || '1')
                          : ''
                    }))
                  }
                >
                  <option value="private">Private</option>
                  <option value="public">Public (Make it a Post!)</option>
                </select>
              </label>

              {editForm.visibility === 'public' && (
                <label>
                  People Needed
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={editForm.peopleNeeded}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, peopleNeeded: event.target.value }))
                    }
                    placeholder="How many people are needed? (1-10)"
                    required
                  />
                </label>
              )}

              {editingTask.isPublic && (String(editForm.title || '').trim() !== String(editingTask.title || '').trim() || editForm.visibility === 'private') && (
                <p className="task-edit-warning">
                  Warning: This change will make the post private and disband the current group.
                </p>
              )}

              <div className="task-edit-actions">
                <button
                  type="button"
                  className="task-edit-delete"
                  onClick={handleDeleteFromEditModal}
                  disabled={deletingTaskId === editingTask.id}
                >
                  {deletingTaskId === editingTask.id ? 'Deleting...' : 'Delete Task'}
                </button>
                <button
                  type="button"
                  className="task-edit-cancel"
                  onClick={closeEditModal}
                  disabled={deletingTaskId === editingTask.id}
                >
                  Cancel
                </button>
                <button type="submit" className="task-edit-save" disabled={deletingTaskId === editingTask.id}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;