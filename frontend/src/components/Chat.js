import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { getChatAuthHeaders } from "../utils/chat";
import "../styles/Chat.css";

const BASE_URL = "http://127.0.0.1:5000";

const formatTime = (value) => {
  if (!value) return "";

  if (value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

const Chat = ({ chatId, title }) => {
  const [uid, setUid] = useState(null);
  const [chatTitle, setChatTitle] = useState(title || "Conversation");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setChatTitle(title || "Conversation");
  }, [title]);

  useEffect(() => {
    if (!chatId || !uid) return undefined;

    let isMounted = true;

    const getChat = async () => {
      try {
        const headers = await getChatAuthHeaders();
        const response = await fetch(`${BASE_URL}/chats/${chatId}`, {
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to load chat (${response.status})`);
        }

        const data = await response.json();
        if (!isMounted) return;

        setChatTitle(data?.displayTitle || data?.title || title || "Conversation");
      } catch (error) {
        console.error("Error loading chat details:", error);
      }
    };

    getChat();

    return () => {
      isMounted = false;
    };
  }, [chatId, title, uid]);

  useEffect(() => {
    if (!chatId) return undefined;
    if (!uid) return undefined;

    let isMounted = true;
    setLoading(true);

    const getMessages = async () => {
      try {
        const headers = await getChatAuthHeaders();
        const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
          headers,
        });
        if (!response.ok) {
          throw new Error(`Failed to load messages (${response.status})`);
        }

        const data = await response.json();
        if (!isMounted) return;

        const nextMessages = Array.isArray(data) ? data : [];
        setMessages(nextMessages);
      } catch (error) {
        console.error("Error loading chat messages:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getMessages();
    const intervalId = window.setInterval(getMessages, 2000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [chatId, uid]);

  const sendMessage = async () => {
    const trimmedText = text.trim();
    if (!trimmedText || !uid || sending) return;

    try {
      setSending(true);
      const headers = await getChatAuthHeaders();
      const response = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          text: trimmedText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to send message");
      }

      const newMessage = await response.json();
      setMessages((current) => [...current, newMessage]);
      setText("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert(error.message || "Unable to send the message right now.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-shell">
        <div className="chat-header">
          <div>
            <p className="chat-eyebrow">Live Chat</p>
            <h1>{chatTitle || "Conversation"}</h1>
          </div>
          <p className="chat-subtitle">
            Coordinate details here once you find a group that fits.
          </p>
        </div>

        <div className="chat-messages">
          {loading ? (
            <p className="chat-empty">Loading conversation...</p>
          ) : messages.length === 0 ? (
            <p className="chat-empty">No messages yet. Start the conversation.</p>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.user_id === uid;

              return (
                <div
                  key={message.id}
                  className={`chat-message ${isOwnMessage ? "chat-message-own" : ""}`}
                >
                  <div className="chat-message-meta">
                    <strong>{message.username || "User"}</strong>
                    <span>{formatTime(message.timestamp)}</span>
                  </div>
                  <p>{message.text}</p>
                </div>
              );
            })
          )}
        </div>

        <div className="chat-composer">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={uid ? "Write a message..." : "Sign in to chat"}
            disabled={!uid || sending}
          />
          <button type="button" onClick={sendMessage} disabled={!uid || sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
