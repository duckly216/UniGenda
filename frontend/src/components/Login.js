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
  // Identifies if it is a popup or a separate page
  const isPopup = mode === "popup";


  const handleAuth = async (e) => {
    e.preventDefault();

    setError(""); // Clears errors

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
        navigate("/registration", { state: { email, password } });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/dashboard");
      }
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
    <div className={isPopup ? "login-container" : "auth-page-wrapper"}>
      <div className={isPopup ? "" : "auth-page-layout"}>
        {/* Dynamic Heading based on mode */}
        <h2>{isSignup ? "Join UniGenda" : "UniGenda Login"}</h2>
        {isPopup && (
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        )}
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
            placeholder={isSignup ? "Set your Password" : "Password"}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">{isSignup ? "Sign Up" : "Login"}</button>
        </form>
        <div className="auth-footer">
          {isSignup ? (
            <p>
              Already have an account? <Link to="/login">Log in!</Link>
            </p>
          ) : (
            <p>
              Don't have an account? <Link to="/sign_up">Sign up!</Link>
            </p>
          )}
          <p>
            Back to <Link to="/">Home Page</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Login;
