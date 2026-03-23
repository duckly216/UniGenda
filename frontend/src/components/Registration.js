import React, { useState } from "react";
// Firebase //
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase"; 
import { doc, setDoc } from "firebase/firestore";
// -------- //
import { useLocation, useNavigate, Link } from "react-router-dom";
import "../styles/Registration.css";

const Registration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email: initialEmail, password: initialPassword } =
    location.state || {};
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState(initialPassword || "");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [age, setAge] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const phoneRegex = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
    if (!phoneRegex.test(phone)) {
      setError("Enter a valid phone number.");
      return;
    }
    if (parseInt(age) < 18) {
      setError("You must be at least 18 years old.");
      return;
    }
    if (confirmPassword !== password) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;
      console.log("Step 1: Firebase Auth Account Created with UID:", user.uid);
      await updateProfile(userCredential.user, {
        displayName: displayName,
      });
      console.log("Step 2: Firebase Auth Profile Updated: (", displayName, ") set");
      await setDoc(doc(db, "users", userCredential.user.uid), {
        firstName: firstName,
        lastName: lastName,
        displayName: displayName,
        email: email,
        phone: phone,
        school: school,
        age: parseInt(age),
        createdAt: new Date()
      });
      console.log("Step 3: Firestore Document written to /users collection."); 
      navigate("/dashboard");
    } catch (err) {
      console.error("Registration Error: ", err.message);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Try logging in.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Something went wrong. Please try again later.");
      }
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-page-layout">
        <h2>Complete Your Profile</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            defaultValue={email || ""}
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            defaultValue={password || ""}
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <hr className="section-divider" />
          <div className="field-row">
            <input
              placeholder="First Name"
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              placeholder="Last Name"
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <input
            placeholder="Display Name"
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <input
            placeholder="Phone Number"
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <select onChange={(e) => setSchool(e.target.value)} defaultValue="">
            <option value="" disabled>
              Select your school
            </option>
            <option value="SF">Santa Fe College</option>
            <option value="UF">University of Florida</option>
          </select>
          <input
            type="number"
            placeholder="Age"
            onChange={(e) => setAge(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <hr className="section-divider" />
          <button type="submit">Complete Registration</button>
        </form>
        <div className="auth-footer">
          <p>
            Back to <Link to="/">Home Page</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Registration;