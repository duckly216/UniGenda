import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/Login";
import Registration from "./components/Registration";
import Dashboard from "./components/Dashboard";
import NavBar from "./components/NavBar";
import Calendar from "./components/Calendar";
import "./styles/Home.css";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <div className="App">
      <Routes>
        <Route
          path="/"
          element={
            <>
              <div className={`home-container ${showLogin ? "blurred" : ""}`}>
                <h1>UniGenda</h1>
                <p className="tagline">
                  Getting Things Done <em>Together</em>
                </p>
                <button onClick={() => setShowLogin(true)}>Go to Login</button>

                <button onClick={() => navigate("/sign_up")}>
                  Create an account
                </button>
              </div>
              {showLogin && (
                <div className="overlay">
                  <Login mode="popup" onClose={() => setShowLogin(false)} />
                </div>
              )}
            </>
          }
        />
        {/*When URL is /login, render the login component*/}
        <Route path="/login" element={<Login mode="login" />} />
        <Route path="/sign_up" element={<Login mode="signup" />} />
        <Route path="/registration" element={<Registration />} />
        {/*When URL is /dashboard, render the logic component IF user logged in*/}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading}>
              <div style={{ display: "flex" }}>
                <NavBar user={currentUser} />
                <div style={{ marginLeft: "60px", flex: 1 }}>
                  <Dashboard />
                </div>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading}>
              <div style={{ display: "flex" }}>
                <NavBar user={currentUser} />
                <div style={{ marginLeft: "60px", flex: 1 }}>
                  <Calendar />
                </div>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading}>
              <div style={{ display: "flex" }}>
                <NavBar user={currentUser} />
                <div style={{ marginLeft: "60px", flex: 1 }}></div>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading}>
              <div style={{ display: "flex" }}>
                <NavBar user={currentUser} />
                <div style={{ marginLeft: "60px", flex: 1 }}></div>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderation"
          element={
            <ProtectedRoute
              user={currentUser}
              authLoading={authLoading}
              adminOnly={true}
            >
              <div style={{ display: "flex" }}>
                <NavBar user={currentUser} />
                <div style={{ marginLeft: "60px", flex: 1 }}></div>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute user={currentUser} authLoading={authLoading}>
              <div style={{ display: "flex" }}>
                <NavBar user={currentUser} />
                <div style={{ marginLeft: "60px", flex: 1 }}></div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
export default App;
