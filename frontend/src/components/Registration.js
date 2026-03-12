import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Registration.css";

const Registration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, password } = location.state || {};

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    phone: "",
    school: "",
    age: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // validation will go here
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-page-layout">
        <h2>Complete Your Profile</h2>
        <form onSubmit={handleSubmit}>{}</form>
      </div>
    </div>
  );
};

export default Registration;
