import React, { useEffect, useMemo, useState } from 'react'; 
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
    const [availableTags, setAvailableTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [loadingTags, setLoadingTags] = useState(true);
    const [tagError, setTagError] = useState('');
    const [tagQuery, setTagQuery] = useState('');
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

    useEffect(() => {
        const fetchTags = async () => {
            setLoadingTags(true);
            setTagError('');

            try {
                const response = await axios.get('http://127.0.0.1:5000/task_tags');
                setAvailableTags(Array.isArray(response.data) ? response.data : []);
            } catch (err) {
                console.error('Error loading task tags: ', err);
                setAvailableTags([]);
                setTagError('Could not load task tags.');
            } finally {
                setLoadingTags(false);
            }
        };

        fetchTags();
    }, []);

    const filteredTags = useMemo(() => {
        const normalizedQuery = tagQuery.trim().toLowerCase();

        return availableTags.filter((tag) => {
            if (selectedTags.includes(tag)) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            return tag.toLowerCase().includes(normalizedQuery);
        });
    }, [availableTags, selectedTags, tagQuery]);

    const addSelectedTag = (tag) => {
        const normalizedTag = String(tag || '').trim();
        if (!normalizedTag) {
            return;
        }

        setSelectedTags((prev) => (prev.includes(normalizedTag) ? prev : [...prev, normalizedTag]));
        setTagQuery('');
        setIsTagDropdownOpen(true);
    };

    const removeSelectedTag = (tag) => {
        setSelectedTags((prev) => prev.filter((selectedTagValue) => selectedTagValue !== tag));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;

        if(!user) return; // user does not exist

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
            tags: selectedTags
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
            setSelectedTags([]);
            setTagQuery('');
            setIsTagDropdownOpen(false);
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
                <section className="task-tag-section">
                    <h4>Task Tags</h4>
                    <p>Type to filter tags from the catalog.</p>

                    {tagError && <p className="task-tag-error">{tagError}</p>}

                    {loadingTags ? (
                        <p className="task-tag-status">Loading tags...</p>
                    ) : availableTags.length === 0 ? (
                        <p className="task-tag-status">No tags available yet.</p>
                    ) : (
                        <>
                            <div className="task-tag-combobox">
                                <input
                                    type="text"
                                    className="task-tag-input"
                                    placeholder="Start typing to find tags"
                                    value={tagQuery}
                                    onChange={(event) => {
                                        setTagQuery(event.target.value);
                                        setIsTagDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsTagDropdownOpen(true)}
                                    onBlur={() => {
                                        window.setTimeout(() => setIsTagDropdownOpen(false), 120);
                                    }}
                                />

                                {isTagDropdownOpen && (
                                    <div className="task-tag-dropdown-menu" role="listbox" aria-label="Task tags">
                                        {filteredTags.length > 0 ? (
                                            filteredTags.map((tag) => (
                                                <div
                                                    key={tag}
                                                    className="task-tag-dropdown-item"
                                                    onClick={() => addSelectedTag(tag)}
                                                >
                                                    #{tag}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="task-tag-status task-tag-dropdown-empty">No matching tags.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedTags.length > 0 && (
                                <div className="task-tag-selected-list">
                                    {selectedTags.map((tag) => (
                                        <span key={tag} className="task-tag-selected-chip">
                                            <span>#{tag}</span>
                                            <span
                                                className="task-tag-selected-remove"
                                                onClick={() => removeSelectedTag(tag)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        removeSelectedTag(tag);
                                                    }
                                                }}
                                                aria-label={`Remove ${tag}`}
                                            >
                                                ×
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>
                <button type="submit">Add to UniGenda</button>
        </form>
        </div>
    );
};

export default TaskForm;