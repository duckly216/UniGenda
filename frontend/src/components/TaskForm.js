import React, { useState } from 'react'; 
import axios from 'axios'; // allows React front-end to interact with the back-end
import { auth } from '../firebase';

const TaskForm = ({ onTaskAdded }) => {
    const [title, setTitle]      = useState('');
    const [dueDate, setDueDate]  = useState('');
    const [priority, setPriority] = useState('medium');
    const [visibility, setVisibility] = useState('private');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;

        if(!user) return; // user does not exist

        const parsedTags = tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

        const newTask = {
            title: title,
            dueDate: dueDate,
            userId: user.uid, // links task to specified user ID
            description: description,
            priority: priority,
            visibility: visibility,
            isPublic: visibility === 'public',
            tags: parsedTags
        };

        try{
            await axios.post('http://127.0.0.1:5000/tasks', newTask);
            setTitle("");
            setDueDate("");
            setPriority('medium');
            setVisibility('private');
            setDescription('');
            setTags('');
            if(onTaskAdded) onTaskAdded(); // Refreshes the list after adding
        } catch(err) {
            console.error("Error adding task: ", err);
        }
    };
    return (
        <div className="auth-page-layout" style={{ margin: '10px auto', maxWidth: '80%' }}>
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
                <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                </select>
                <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                </select>
                <textarea
                placeholder="Task Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                />
                <input
                type="text"
                placeholder="Tags (comma-separated, e.g., exam, math, group-work)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                />
                <button type="submit">Add to UniGenda</button>
        </form>
        </div>
    );
};

export default TaskForm;