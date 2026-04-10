import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const ProtectedRoute = ({
  children,
  adminOnly = false,
  user,
  authLoading = false,
}) => {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (!adminOnly) {
      setIsAdmin(null);
      return () => {
        isMounted = false;
      };
    }

    if (!user?.uid) {
      setIsAdmin(false);
      return () => {
        isMounted = false;
      };
    }

    const checkAdmin = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (isMounted) {
          setIsAdmin(snap.exists() && snap.data()?.isAdmin === true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);

        if (isMounted) {
          setIsAdmin(false);
        }
      }
    };

    setIsAdmin(null);
    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, [adminOnly, user?.uid]);

  if (authLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && isAdmin === null) {
    return null;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
