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

    const affiliationLabel =
        userData?.school === "UF"
            ? "University of Florida"
            : userData?.school === "SF"
                ? "Santa Fe College"
                : userData?.school;
    
    return (
        <div className="dashboard-page-wrapper">
            <div className="dashboard-layout">   
                {/* 3. Display the unique profile data */}
                <h1>Welcome, {welcomeName}!</h1>
                <p>Affiliation: {affiliationLabel || "Loading..."}</p>
                
                {/* Tasks Display Section */}
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
                <hr className="section-divider" />
                <h3>Public Tasks</h3>
                
                <hr className="section-divider" />
                
                <button className="logout-button" onClick={handleLogout}>
                    Logout
                </button>
            </div> 
        </div>
    );

};

export default Dashboard;