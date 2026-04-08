import React, {useEffect, useState } from "react";
import { auth, db } from "../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth"; //
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import TaskForm from './TaskForm';
import TaskList from './TaskList';


const Dashboard = () => {
    const [userData, setUserData] = useState(null);
    const navigate = useNavigate();
    const [refresh, setRefresh] = useState(0);

    useEffect(()=> {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setUserData(null);
                return;
            }

            try {
                // Maps UserID to Firestore document
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if(docSnap.exists()){
                    setUserData(docSnap.data());
                } else {
                    setUserData(null);
                }
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

    return (
        <div className="dashboard-page-wrapper">
            <div className="dashboard-layout">   
                {/* 3. Display the unique profile data */}
                <h1>Welcome, {userData?.displayName || "Student (No Data Loaded)"}!</h1>
                <p>Affiliation: {userData?.school}</p>
                {/* Input Section */}
                <TaskForm onTaskAdded={handleTaskAdded} />
                
                <hr className="section-divider" />
                
                {/* Display Section */}
                <h3>Upcoming Tasks</h3>
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