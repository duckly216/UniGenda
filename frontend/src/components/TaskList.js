import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { auth } from '../firebase';

const TaskList = ({ refreshTrigger }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          // Fetching sorted/limited tasks from your Flask API
          const response = await axios.get(`http://127.0.0.1:5000/tasks/${user.uid}?limit=10`);
          setTasks(response.data);
        } catch (err) {
          console.error("Error fetching tasks:", err);
        } finally {
          setLoading(false); // Stop loading regardless of success/fail
        }
      }
    };
    fetchTasks();
  }, [refreshTrigger]); // Refetches when a task is added

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