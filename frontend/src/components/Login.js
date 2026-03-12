import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Login.css";

const Login = ({mode, onClose }) => { // False means it is login, True means it will be in sign-up
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Determines whether in signup mode on the prop
  const isSignup = mode === "signup";


  const handleAuth = async (e) => {
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
      // Might have to specificy if it is also in sign-up mode
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Try logging in.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Email or password not valid.");
        } else if (err.code === "auth/weak-password") {
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
      {/* Dynamic Heading based on mode */}
      <h2>{isSignup ? "Join UniGenda" : "UniGenda Login"}</h2>
      
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleAuth}>
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
        <button type="submit">{isSignup ? "Sign Up" : "Login"}
          
        </button>
      </form>
    </div>
  );
};
export default Login;
