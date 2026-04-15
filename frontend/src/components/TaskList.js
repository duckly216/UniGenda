import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import '../styles/TaskRelatedStyles.css';

const TaskList = ({ refreshTrigger }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [confirmingTaskId, setConfirmingTaskId] = useState(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState({});
  const [activeTab, setActiveTab] = useState('uncompleted'); // 'uncompleted' or 'completed'

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
        // Fetching sorted/limited tasks from your Flask API
        const response = await axios.get(`http://127.0.0.1:5000/users/${uid}/tasks?limit=10`);
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

  const editTask = async (task) => {
    if (!uid || !task?.id) return;

    setOpenMenuTaskId(null);

    const nextTitleInput = window.prompt('Edit task title:', task.title || '');
    if (nextTitleInput === null) return;

    const nextTitle = nextTitleInput.trim();
    if (!nextTitle) {
      alert('Task title cannot be empty.');
      return;
    }

    const nextDescriptionInput = window.prompt('Edit description:', task.description || '');
    if (nextDescriptionInput === null) return;

    const nextDueDateInput = window.prompt(
      'Edit due date (YYYY-MM-DD). Leave blank for no due date:',
      task.dueDate || ''
    );
    if (nextDueDateInput === null) return;

    const nextPriorityInput = window.prompt(
      'Edit priority (low, medium, high):',
      task.priority || 'medium'
    );
    if (nextPriorityInput === null) return;

    const normalizedPriority = String(nextPriorityInput).trim().toLowerCase();
    if (!['low', 'medium', 'high'].includes(normalizedPriority)) {
      alert('Priority must be low, medium, or high.');
      return;
    }

    const normalizedDueDate = nextDueDateInput.trim() ? nextDueDateInput.trim() : null;

    try {
      await axios.patch(`http://127.0.0.1:5000/users/${uid}/tasks/${task.id}`, {
        userId: uid,
        title: nextTitle,
        description: nextDescriptionInput,
        dueDate: normalizedDueDate,
        priority: normalizedPriority
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                title: nextTitle,
                description: nextDescriptionInput,
                dueDate: normalizedDueDate,
                priority: normalizedPriority
              }
            : t
        )
      );
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

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'completed') {
      return task.status === 'completed';
    } else {
      return task.status !== 'completed';
    }
  });

  return (
    <div className="task-list">
      {/* Tabs for filtering */}
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

      {loading && <p>Loading tasks...</p>}
      {filteredTasks.length > 0 ? (
        filteredTasks.map(task => (
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
                        onClick={() => editTask(task)}
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
      ) : (
        /* No tasks state on the dashboard */
        <div className="empty-tasks">
          
          <p>
            {activeTab === 'completed'
              ? 'No completed tasks. Get started with uncompleted tasks!'
              : 'No upcoming tasks. Enjoy your free time!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskList;