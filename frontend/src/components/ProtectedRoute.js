import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const user = auth.currentUser;
  const [isAdmin, setIsAdmin] = useState(null);

  //fetches admin status of user with userId
  useEffect(() => {
    if (!adminOnly || !user) {
      return;
    }

    const checkAdmin = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setIsAdmin(snap.exists() && snap.data()?.isAdmin === true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [adminOnly, user]);

  if (!user) {
    return <Navigate to="/login" />;
  }
  if (adminOnly && isAdmin === null) {
    return null;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

export default ProtectedRoute;
