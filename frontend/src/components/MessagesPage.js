import React from "react";
import { useParams } from "react-router-dom";
import "../styles/Messages.css";

const MessagesPage = () => {
  const { userId } = useParams();

  return (
    <div className="messages-page">
      <div className="messages-card">
        <h1>Messages</h1>
        <p>
          Direct messaging is coming soon. This is a placeholder page with no
          backend implementation yet.
        </p>
        {userId && (
          <p className="messages-target">Opened from profile: {userId}</p>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
