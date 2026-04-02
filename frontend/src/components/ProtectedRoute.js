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
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      setIsAdmin(snap.exists() && snap.data()?.isAdmin === true);
    });
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
