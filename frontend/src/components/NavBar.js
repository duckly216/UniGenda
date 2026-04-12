import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/NavBar.css";

const NAV_ITEMS = [
  { icon: "👤", label: "Profile", path: "/profile", group: "top" },
  { icon: "🏠", label: "Home", path: "/dashboard", group: "main" },
  { icon: "✅", label: "My Tasks", path: "/tasks", group: "main" },
  { icon: "📅", label: "Calendar", path: "/calendar", group: "main" },
  {
    icon: "🛡️",
    label: "Moderation",
    path: "/moderation",
    group: "main",
    adminOnly: true,
  },
  { icon: "⚙️", label: "Settings", path: "/settings", group: "bottom" },
];

const NavBar = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const profilePath = user?.uid ? `/profile/${user.uid}` : "/profile";

  useEffect(() => {
    if (!user?.uid) {
      setIsAdmin(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:5000/users/${user.uid}`,
        );
        setIsAdmin(response.data?.isAdmin === true);
      } catch (error) {
        console.error("Error loading user role:", error);
        setIsAdmin(false);
      }
    };

    fetchRole();
  }, [user?.uid]);

  const visibleItems = (group) =>
    NAV_ITEMS.filter((i) => i.group === group && (!i.adminOnly || isAdmin));

  return (
    <nav className="navbar">
      <div className="navbar-profile" onClick={() => navigate(profilePath)}>
        {user?.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="navbar-avatar" />
        ) : (
          <div className="navbar-avatar-placeholder">
            {user?.displayName?.[0] || "?"}
          </div>
        )}
      </div>
      <div className="navbar-gap" />
      {visibleItems("main").map((item) => (
        <button
          key={item.path}
          className={`navbar-item ${
            item.path === "/profile"
              ? location.pathname.startsWith("/profile")
                ? "active"
                : ""
              : location.pathname === item.path
                ? "active"
                : ""
          }`}
          onClick={() => navigate(item.path)}
        >
          <span className="navbar-icon">{item.icon}</span>
          <span className="navbar-label">{item.label}</span>
        </button>
      ))}
      <div className="navbar-gap" />
      {visibleItems("bottom").map((item) => (
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
