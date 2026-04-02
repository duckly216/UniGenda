import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/NavBar.css";

const NAV_ITEMS = [
  { icon: "👤", label: "Profile", path: "/profile", group: "top" },
  { icon: "🏠", label: "Home", path: "/", group: "main" },
  { icon: "✅", label: "My Tasks", path: "/tasks", group: "main" },
  { icon: "📅", label: "Calendar", path: "/calendar", group: "main" },
  { icon: "🛡️", label: "Moderation", path: "/moderation", group: "main" },
  { icon: "⚙️", label: "Settings", path: "/settings", group: "bottom" },
];

const NavBar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-profile" onClick={() => navigate("/profile")}>
        {user?.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="navbar-avatar" />
        ) : (
          <div className="navbar-avatar-placeholder">
            {user?.displayName?.[0] || "?"}
          </div>
        )}
        <span className="navbar-label">{user?.displayName || "Profile"}</span>
      </div>

      <div className="navbar-gap" />

      {["main"].map((group) =>
        NAV_ITEMS.filter((i) => i.group === group).map((item) => (
          <button
            key={item.path}
            className={`navbar-item ${location.pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="navbar-icon">{item.icon}</span>
            <span className="navbar-label">{item.label}</span>
          </button>
        )),
      )}

      <div className="navbar-gap" />

      {NAV_ITEMS.filter((i) => i.group === "bottom").map((item) => (
        <button
          key={item.path}
          className={`navbar-item ${location.pathname === item.path ? "active" : ""}`}
          onClick={() => navigate(item.path)}
        >
          <span className="navbar-icon">{item.icon}</span>
          <span className="navbar-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default NavBar;
