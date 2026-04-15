import React, { useState } from 'react'; 
import axios from 'axios'; // allows React front-end to interact with the back-end
import { auth } from '../../firebase';
import '../../styles/TaskRelatedStyles.css';

const TaskForm = ({ onTaskAdded }) => {
    const [title, setTitle]      = useState('');
    const [dueDate, setDueDate]  = useState('');
    const [hasDueDate, setHasDueDate] = useState(false);
    const [priority, setPriority] = useState('medium');
    const [visibility, setVisibility] = useState('private');
    const [peopleNeeded, setPeopleNeeded] = useState('');
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

        if (visibility === 'public' && peopleNeeded !== '') {
            const parsedPeopleNeeded = Number(peopleNeeded);
            if (!Number.isInteger(parsedPeopleNeeded) || parsedPeopleNeeded < 1 || parsedPeopleNeeded > 10) {
                alert('People needed must be a whole number between 1 and 10.');
                return;
            }
        }

        const newTask = {
            title: title,
            dueDate: hasDueDate && dueDate ? dueDate : null,
            userId: user.uid, // links task to specified user ID
            description: description,
            priority: priority,
            visibility: visibility,
            isPublic: visibility === 'public',
            peopleNeeded: visibility === 'public' && peopleNeeded !== '' ? Number(peopleNeeded) : null,
            tags: parsedTags
        };

        try{
            await axios.post(`http://127.0.0.1:5000/users/${user.uid}/tasks`, newTask);
            setTitle("");
            setDueDate("");
            setHasDueDate(false);
            setPriority('medium');
            setVisibility('private');
            setPeopleNeeded('');
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
                {!hasDueDate ? (
                    <input
                    type="text"
                    value="Add Due Date?"
                    readOnly
                    onClick={() => setHasDueDate(true)}
                    aria-label="Add Due Date"
                    style={{ cursor: 'pointer' }}
                    />
                ) : (
                    <>
                        <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        onBlur={() => {
                            if (!dueDate) setHasDueDate(false);
                        }}
                        required={hasDueDate}
                        />
                        <small style={{ display: 'block', marginTop: '-4px', marginBottom: '8px', opacity: 0.8 }}>
                            mm/dd/yy
                        </small>
                    </>
                )}
                <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={`priority-select priority-underlined priority-${priority}`}
                >
                    <option value="low" className="priority-option">Low Priority</option>
                    <option value="medium" className="priority-option">Medium Priority</option>
                    <option value="high" className="priority-option">High Priority</option>
                </select>
                <select
                value={visibility}
                onChange={(e) => {
                    const nextVisibility = e.target.value;
                    setVisibility(nextVisibility);
                    if (nextVisibility !== 'public') {
                        setPeopleNeeded('');
                    }
                }}
                >
                    <option value="private">Private</option>
                    <option value="public">Public (Make it a Post!)</option>
                </select>
                {visibility === 'public' && (
                    <input
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    placeholder="How many people are you looking for? (max 10)"
                    value={peopleNeeded}
                    onChange={(e) => setPeopleNeeded(e.target.value)}
                    />
                )}
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