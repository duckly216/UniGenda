import React, {useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth"; //
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import TaskForm from './task-components/TaskForm';
import TaskList from './task-components/TaskList';
import LoadingPage from "./LoadingPage";


const Dashboard = () => {
    const [userData, setUserData] = useState(null);
    const [authUser, setAuthUser] = useState(null);
    const navigate = useNavigate();
    const [refresh, setRefresh] = useState(0);
    const [showCreateTaskPopup, setShowCreateTaskPopup] = useState(false);
    const [myPublicTasks, setMyPublicTasks] = useState([]);
    const [loadingMyPublicTasks, setLoadingMyPublicTasks] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [editingPublicTask, setEditingPublicTask] = useState(null);
    const [savingPublicTask, setSavingPublicTask] = useState(false);
    const [editPublicForm, setEditPublicForm] = useState({
        title: "",
        dueDate: "",
        priority: "medium",
        description: "",
        visibility: "public",
        peopleNeeded: "",
    });

    useEffect(()=> {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setAuthUser(user);

            if (!user) {
                setUserData(null);
                setLoadingProfile(false);
                return;
            }

            try {
                setLoadingProfile(true);
                const response = await axios.get(`http://127.0.0.1:5000/users/${user.uid}`);
                setUserData(response.data || null);
            } catch (error) {
                console.error("Error loading user profile:", error);
                setUserData(null);
            } finally {
                setLoadingProfile(false);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!authUser?.uid) {
            setMyPublicTasks([]);
            return;
        }

        const fetchMyPublicTasks = async () => {
            try {
                setLoadingMyPublicTasks(true);
                const response = await axios.get("http://127.0.0.1:5000/public_tasks");
                const allPublicTasks = Array.isArray(response.data) ? response.data : [];
                setMyPublicTasks(allPublicTasks.filter((task) => task.userId === authUser.uid));
            } catch (error) {
                console.error("Error loading my public tasks:", error);
                setMyPublicTasks([]);
            } finally {
                setLoadingMyPublicTasks(false);
            }
        };

        fetchMyPublicTasks();
    }, [authUser?.uid, refresh]);

    const handleLogout = async () => {
        try {
            await signOut(auth); // Tells Firebase to end the session
            console.log("User signed out successfully");
            navigate("/"); // Redirect back to the home screen
        } catch (error) {
            console.error("Error signing out:", error.message);
        }
    };
    const handleTaskAdded = () => {
        setRefresh(prev => prev + 1); // Increment to trigger useEffect in TaskList
        setShowCreateTaskPopup(false);
    };

    const openPublicTaskEditModal = (task) => {
        if (!task?.id) return;

        setEditingPublicTask(task);
        setEditPublicForm({
            title: task.title || "",
            dueDate: task.dueDate || "",
            priority: task.priority || "medium",
            description: task.description || "",
            visibility: task.visibility || (task.isPublic ? "public" : "private"),
            peopleNeeded: Number.isInteger(task.peopleNeeded) ? String(task.peopleNeeded) : "",
        });
    };

    const closePublicTaskEditModal = () => {
        if (savingPublicTask) return;
        setEditingPublicTask(null);
        setEditPublicForm({
            title: "",
            dueDate: "",
            priority: "medium",
            description: "",
            visibility: "public",
            peopleNeeded: "",
        });
    };

    const handlePublicTaskEditSubmit = async (event) => {
        event.preventDefault();
        if (!authUser?.uid || !editingPublicTask?.id || savingPublicTask) return;

        const nextTitle = String(editPublicForm.title || "").trim();
        if (!nextTitle) {
            alert("Task title cannot be empty.");
            return;
        }

        const normalizedPriority = String(editPublicForm.priority || "medium").trim().toLowerCase();
        if (!["low", "medium", "high"].includes(normalizedPriority)) {
            alert("Priority must be low, medium, or high.");
            return;
        }

        const normalizedDueDate = String(editPublicForm.dueDate || "").trim() || null;
        const normalizedDescription = String(editPublicForm.description || "");
        const titleChanged = nextTitle !== String(editingPublicTask.title || "").trim();
        const nextVisibility = editPublicForm.visibility === "public" ? "public" : "private";
        const renameForcesPrivate = Boolean(editingPublicTask.isPublic && titleChanged);
        const switchedPublicToPrivate = Boolean(editingPublicTask.isPublic && nextVisibility === "private");
        const willDisbandPublicPost = renameForcesPrivate || switchedPublicToPrivate;
        const finalVisibility = renameForcesPrivate ? "private" : nextVisibility;

        let nextPeopleNeeded = null;
        if (finalVisibility === "public") {
            const parsedPeopleNeeded = Number(String(editPublicForm.peopleNeeded || "").trim());
            if (!Number.isInteger(parsedPeopleNeeded) || parsedPeopleNeeded < 1 || parsedPeopleNeeded > 10) {
                alert("People needed must be a whole number between 1 and 10.");
                return;
            }
            nextPeopleNeeded = parsedPeopleNeeded;
        }

        if (willDisbandPublicPost) {
            const confirmed = window.confirm(
                "Warning: This change will make the post private and disband the current group (remove joined users). Continue?"
            );
            if (!confirmed) return;
        }

        const payload = {
            userId: authUser.uid,
            title: nextTitle,
            description: normalizedDescription,
            dueDate: normalizedDueDate,
            priority: normalizedPriority,
            visibility: finalVisibility,
            isPublic: finalVisibility === "public",
            peopleNeeded: finalVisibility === "public" ? nextPeopleNeeded : null,
        };

        try {
            setSavingPublicTask(true);
            await axios.patch(`http://127.0.0.1:5000/users/${authUser.uid}/tasks/${editingPublicTask.id}`, payload);

            setMyPublicTasks((prev) => {
                if (finalVisibility !== "public") {
                    return prev.filter((task) => task.id !== editingPublicTask.id);
                }

                return prev.map((task) =>
                    task.id === editingPublicTask.id
                        ? {
                            ...task,
                            title: nextTitle,
                            description: normalizedDescription,
                            dueDate: normalizedDueDate,
                            priority: normalizedPriority,
                            visibility: finalVisibility,
                            isPublic: true,
                            peopleNeeded: nextPeopleNeeded,
                            ...(willDisbandPublicPost ? { joinedUsers: [] } : {}),
                        }
                        : task
                );
            });

            setRefresh((prev) => prev + 1);
            closePublicTaskEditModal();
        } catch (error) {
            console.error("Error editing public post:", error);
            alert("Could not edit this public post. Please try again.");
        } finally {
            setSavingPublicTask(false);
        }
    };

    const welcomeName =
        userData?.displayName ||
        userData?.firstName ||
        authUser?.displayName ||
        authUser?.email?.split('@')[0] ||
        "Loading...";

    const usernameLabel =
        userData?.username ||
        authUser?.email?.split('@')[0] ||
        authUser?.uid ||
        "loading";

    const fullNameLabel =
        userData?.firstName && userData?.lastName
            ? `${userData.firstName} ${userData.lastName}`
            : userData?.displayName || authUser?.displayName || welcomeName;

    const affiliationLabel =
        userData?.school === "UF"
            ? "University of Florida"
            : userData?.school === "SF"
                ? "Santa Fe College"
                : userData?.school;

    if (loadingProfile || (authUser?.uid && loadingMyPublicTasks)) {
        return <LoadingPage message="Loading dashboard..." />;
    }
    
    return (
        <div className="dashboard-page-wrapper">
            <div className="dashboard-layout">
                <section className="dashboard-bubble dashboard-user-bubble">
                    <h1>Welcome, {welcomeName}!</h1>
                    <p className="dashboard-name">{fullNameLabel}</p>
                    <p>Affiliation: {affiliationLabel || "Loading..."}</p>
                </section>

                <div className="dashboard-bubble-grid">
                    <section className="dashboard-bubble dashboard-tasks-bubble">
                        <h3>Tasks</h3>
                        <section className="tasks-page-section">
                        <button
                            type="button"
                            className="create-task-trigger"
                            onClick={() => setShowCreateTaskPopup(true)}
                        >
                            Create New Task?
                        </button>
                    </section>

                    <TaskList refreshTrigger={refresh} />

                    </section>

                    <section className="dashboard-bubble dashboard-public-tasks-bubble">
                        <h3>My Public Tasks</h3>
                        {loadingMyPublicTasks ? (
                            <p>Loading your public tasks...</p>
                        ) : myPublicTasks.length === 0 ? (
                            <p>You haven't created any public tasks yet.</p>
                        ) : (
                            <div className="my-public-tasks-list">
                                {myPublicTasks.map((task) => {
                                    const joinedUsers = Array.isArray(task.joinedUsers) ? task.joinedUsers : [];
                                    const peopleNeeded = Number.isInteger(task.peopleNeeded) ? task.peopleNeeded : null;

                                    return (
                                        <article key={task.id} className="my-public-task-card">
                                            <h4>{task.title}</h4>
                                            <p>{task.description || "No description."}</p>
                                            <small>
                                                {peopleNeeded
                                                    ? `${joinedUsers.length}/${peopleNeeded} joined`
                                                    : `${joinedUsers.length} joined`}
                                                {task.dueDate ? ` • Due ${task.dueDate}` : ""}
                                            </small>

                                            <div className="my-public-task-actions">
                                                <button
                                                    type="button"
                                                    className="task-edit-save"
                                                    onClick={() => openPublicTaskEditModal(task)}
                                                >
                                                    Edit Post
                                                </button>
                                            </div>

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
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                    {showCreateTaskPopup && (
                        <div
                            className="tasks-modal-overlay"
                            onClick={() => setShowCreateTaskPopup(false)}
                        >
                            <div
                                className="tasks-modal-content"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    className="tasks-modal-close"
                                    onClick={() => setShowCreateTaskPopup(false)}
                                >
                                    ✕
                                </button>
                                <TaskForm onTaskAdded={handleTaskAdded} />
                            </div>
                        </div>
                    )}
                
                <button className="logout-button" onClick={handleLogout}>
                    Logout
                </button>

                {editingPublicTask && (
                    <div className="tasks-modal-overlay" onClick={closePublicTaskEditModal}>
                        <div className="tasks-modal-content task-edit-modal" onClick={(event) => event.stopPropagation()}>
                            <button
                                type="button"
                                className="tasks-modal-close"
                                onClick={closePublicTaskEditModal}
                                aria-label="Close edit public post modal"
                            >
                                ✕
                            </button>

                            <h3>Edit Public Post</h3>
                            <form className="task-edit-form" onSubmit={handlePublicTaskEditSubmit}>
                                <label>
                                    Task Name
                                    <input
                                        type="text"
                                        value={editPublicForm.title}
                                        onChange={(event) =>
                                            setEditPublicForm((prev) => ({ ...prev, title: event.target.value }))
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    Due Date
                                    <input
                                        type="date"
                                        value={editPublicForm.dueDate || ""}
                                        onChange={(event) =>
                                            setEditPublicForm((prev) => ({ ...prev, dueDate: event.target.value }))
                                        }
                                    />
                                </label>

                                <label>
                                    Priority
                                    <select
                                        className={`priority-select priority-underlined priority-${editPublicForm.priority || "medium"}`}
                                        value={editPublicForm.priority}
                                        onChange={(event) =>
                                            setEditPublicForm((prev) => ({ ...prev, priority: event.target.value }))
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
                                        value={editPublicForm.description}
                                        onChange={(event) =>
                                            setEditPublicForm((prev) => ({ ...prev, description: event.target.value }))
                                        }
                                    />
                                </label>

                                <label>
                                    Visibility
                                    <select
                                        value={editPublicForm.visibility}
                                        onChange={(event) =>
                                            setEditPublicForm((prev) => ({
                                                ...prev,
                                                visibility: event.target.value,
                                                peopleNeeded:
                                                    event.target.value === "public"
                                                        ? (prev.peopleNeeded || "1")
                                                        : "",
                                            }))
                                        }
                                    >
                                        <option value="private">Private</option>
                                        <option value="public">Public (Make it a Post!)</option>
                                    </select>
                                </label>

                                {editPublicForm.visibility === "public" && (
                                    <label>
                                        People Needed
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            step="1"
                                            value={editPublicForm.peopleNeeded}
                                            onChange={(event) =>
                                                setEditPublicForm((prev) => ({ ...prev, peopleNeeded: event.target.value }))
                                            }
                                            placeholder="How many people are needed? (1-10)"
                                            required
                                        />
                                    </label>
                                )}

                                {editingPublicTask.isPublic && (String(editPublicForm.title || "").trim() !== String(editingPublicTask.title || "").trim() || editPublicForm.visibility === "private") && (
                                    <p className="task-edit-warning">
                                        Warning: This change will make the post private and disband the current group.
                                    </p>
                                )}

                                <div className="task-edit-actions">
                                    <button type="button" className="task-edit-cancel" onClick={closePublicTaskEditModal} disabled={savingPublicTask}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="task-edit-save" disabled={savingPublicTask}>
                                        {savingPublicTask ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div> 
        </div>
    );

};

export default Dashboard;