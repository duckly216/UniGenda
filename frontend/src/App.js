import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navigate, Link } from "react-router-dom";
import Login from "./components/Login";
import "./styles/Home.css";
// import Dashboard from './components/Dashboard';
function App() {
  const [showLogin, setShowLogin] = useState(false);
  return (
    <Router>
      <div className="App">
        <Routes>
          {/*Automatically routes to login page*/}
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
                </div>
                {showLogin && (
                  <div className="overlay">
                    <Login onClose={() => setShowLogin(false)} />
                  </div>
                )}
              </>
            }
          />
          {/*When URL is /login, render the login component*/}
          <Route path="/login" element={<Login />} />
          {/*When URL is /dashboard, render the logic component*/}
          {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        </Routes>
      </div>
    </Router>
  );
}
export default App;
