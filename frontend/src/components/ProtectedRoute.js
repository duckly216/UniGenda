// This component is intended to protect certain routes from being accessed without login //
import React from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";

const ProtectedRoute = ({ children }) => {
    const user = auth.currentUser;

    if(!user){
        // If user isn't logged in, takes them to login page
        return <Navigate to="/login" />;
    }
    return children;
};

export default ProtectedRoute