import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import LoadingPage from "./LoadingPage";

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
        const response = await axios.get(
          `http://127.0.0.1:5000/users/${user.uid}`,
        );

        if (isMounted) {
          setIsAdmin(response.data?.isAdmin === true);
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
    return <LoadingPage message="Loading page..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && isAdmin === null) {
    return <LoadingPage message="Checking access..." />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
