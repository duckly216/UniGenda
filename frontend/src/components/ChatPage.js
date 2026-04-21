import React from "react";
import { useLocation, useParams } from "react-router-dom";
import Chat from "./Chat";

const ChatPage = () => {
  const { chatId } = useParams();
  const location = useLocation();

  return <Chat chatId={chatId} title={location.state?.title} />;
};

export default ChatPage;
