import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

const Login = ({ onClose }) => {
  const [isSignup, setIsSignup] = useState(false); // False means it is login, True means it will be in sign-up
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError(""); // Clears errors

    try {
      if(isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      console.log(err.message);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Try logging in.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Email or password not valid.");
        } else if (err.code === "auth/email-already-in-use") {
        setError("Password should be at least 6 characters long");
      } else if (err.code === "auth/user-not-found") {
        setError("We couldn't find an account with that email.");
      } else {
        setError("Something went wrong. Please try again later.");
      }
    }
  };
  return (
    <div className="login-container">
      <button className="close-button" onClick={onClose}>
        ✕
      </button>
      {/*Tab UI Section*/}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};
export default Login;
