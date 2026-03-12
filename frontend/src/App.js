import React, { useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Login from "./components/Login";
import "./styles/Home.css";
// import Dashboard from './components/Dashboard';


function App() {
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();
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
                <button onClick={() => setShowLogin(true)}>
                  Go to Login
                </button>

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
        <Route path="/login" element={<Login mode = "login"     />} />
        <Route path="/sign_up" element={<Login mode = "signup"  />} />
        {/*When URL is /dashboard, render the logic component*/}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      </Routes>
    </div>
  );
}
export default App;
