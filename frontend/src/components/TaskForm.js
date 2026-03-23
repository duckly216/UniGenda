import React, { useState } from 'react'; 
import axios from 'axios'; // allows React front-end to interact with the back-end
import { auth } from '../firebase';

const TaskForm = ({ onTaskAdded }) => {
    const [title, setTitle]      = useState('');
    const [dueDate, setDueDate]  = useState('');
    // const [userID, setDueDate] = useState('');
    // const [description, setDescription] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;

        if(!user) return; // user does not exist
        const newTask = {
            title: title,
            dueDate: dueDate,
            userID: user.uid, // links task to specified user ID
            description: "Demo Task" // TO-DO: change after sprint 1 presentation
        };

        try{
            await axios.post('http://127.0.0.1:5000/tasks', newTask);
            setTitle("");
            setDueDate("");
            if(onTaskAdded) onTaskAdded(); // Refreshes the list after adding
        } catch(err) {
            console.error("Error adding task: ", err);
        }
    };
    return (
        <div className="auth-page-layout" style={{ margin: '20px auto', maxWidth: '100%' }}>
        <h3>Create a New Task</h3>
        <form onSubmit={handleSubmit}>
            <input 
            type="text" 
            placeholder="Task Title (e.g., Linear Algebra Quiz)" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required 
            />
            <input 
            type="date" 
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required 
            />
            <button type="submit">Add to UniGenda</button>
        </form>
        </div>
    );
};

export default TaskForm;