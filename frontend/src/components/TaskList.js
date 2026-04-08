import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const TaskList = ({ refreshTrigger }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);

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
        const response = await axios.get(`http://127.0.0.1:5000/tasks/${uid}?limit=10`);
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

  return (
    <div className="task-list">
      {tasks.length > 0 ? (
        tasks.map(task => (
          <div key={task.id} className="task-item">
            <h4>{task.title}</h4>
            <p>{task.description || ""}</p>
            <small>Due: {task.dueDate}</small>
            <br />
            <small>
              Priority: {task.priority || 'medium'} • Visibility: {(task.isPublic || task.visibility === 'public') ? 'Public' : 'Private'}
            </small>
            {Array.isArray(task.tags) && task.tags.length > 0 && (
              <>
                <br />
                <small>Tags: {task.tags.join(', ')}</small>
              </>
            )}
          </div>
        ))
      ) : (
        /* No tasks state on the dashboard */
        <div className="empty-tasks">
          <p>No upcoming tasks. Enjoy your free time, Gator!</p>
        </div>
      )}
    </div>
  );
};

export default TaskList;