import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
// import Dashboard from './components/Dashboard';

function App() {
    return (
    <Router>
      <div className = "App">
        <Routes>
            {/*Automatically routes to login page*/}
            <Route path="/" element={
                <div>
                    <h1>Welcome to UniGenda</h1>
                    <Link to="/login">
                        <button>Got to Login</button>
                    </Link>
                </div>
                }/> 
                
            
            {/*When URL is /login, render the logic component*/}
            <Route path="/login" element={<Login />} />

            {/*When URL is /dashboard, render the logic component*/}
            {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        </Routes>
      </div>
    </Router>
    );    
}
export default App;