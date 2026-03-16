import React, {useEffect, useState } from "react";
import { auth, db } from "../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth"; //
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";


const Dashboard = () => {
    const [userData, setUserData] = useState(null);
    const navigate = useNavigate();

    useEffect(()=> {
        const user = auth. currentUser;

        if(user){
            // Maps UserID to Firestore document
            const fetchProfile = async() => {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if(docSnap.exists()){
                    setUserData(docSnap.data());
                }
            };
            fetchProfile();
        }

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

    return (
        <div className="dashboard-page-wrapper">
            <div className="dashboard-layout">   
                {/* 3. Display the unique profile data */}
                <h1>Welcome, {userData?.displayName || "Student (No Data)"}!</h1>
                <p>Affiliation: {userData?.school}</p>
                
                <div className="task-preview">
                    {/* This is where your 'tasks' collection will eventually render */}
                    <p>Your UniGenda is loading...</p>
                </div>
                <button className="logout-button" onClick={handleLogout}>
                    Logout
                </button>
            </div> 
        </div>
    );

};

export default Dashboard;