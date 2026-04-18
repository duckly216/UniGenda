import React from "react";
import "../styles/LoadingPage.css";

const LoadingPage = ({ message = "Loading..." }) => {
  return (
    <div className="loading-page">
      <div className="loading-card">
        <div className="loading-spinner" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>
  );
};

export default LoadingPage;
