import React, {useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth"; //
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import TaskForm from './task-components/TaskForm';
import TaskList from './TaskList';


const Dashboard = () => {
    const [userData, setUserData] = useState(null);
    const [authUser, setAuthUser] = useState(null);
    const navigate = useNavigate();
    const [refresh, setRefresh] = useState(0);

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
    };

    const welcomeName =
        userData?.displayName ||
        userData?.firstName ||
        authUser?.displayName ||
        authUser?.email?.split('@')[0] ||
        "Student (Name not loaded)";

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
                <p>Affiliation: {affiliationLabel || "School not loaded"}</p>
                {/* Input Section */}
                <TaskForm onTaskAdded={handleTaskAdded} />
                
                <hr className="section-divider" />
                
                {/* Display Section */}
                <h3>Tasks</h3>
                <TaskList refreshTrigger={refresh} />
                
                <hr className="section-divider" />
                
                <button className="logout-button" onClick={handleLogout}>
                    Logout
                </button>
            </div> 
        </div>
    );

};

export default Dashboard;