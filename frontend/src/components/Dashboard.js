import React, {useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth"; //
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import TaskForm from './task-components/TaskForm';
import TaskList from './task-components/TaskList';


const Dashboard = () => {
    const [userData, setUserData] = useState(null);
    const [authUser, setAuthUser] = useState(null);
    const navigate = useNavigate();
    const [refresh, setRefresh] = useState(0);
    const [showCreateTaskPopup, setShowCreateTaskPopup] = useState(false);
    const [myPublicTasks, setMyPublicTasks] = useState([]);
    const [loadingMyPublicTasks, setLoadingMyPublicTasks] = useState(false);

    useEffect(()=> {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setAuthUser(user);

            if (!user) {
                setUserData(null);
                return;
            }

            try {
                const response = await axios.get(`http://127.0.0.1:5000/users/${user.uid}`);
                setUserData(response.data || null);
            } catch (error) {
                console.error("Error loading user profile:", error);
                setUserData(null);
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
            </div> 
        </div>
    );

};

export default Dashboard;