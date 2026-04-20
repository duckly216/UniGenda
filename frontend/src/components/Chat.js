import { useState, useEffect } from "react";
import { auth } from "../firebase";

const Chat = () => {
  const chatId = "80jfYS4cf0G4xLDHpBYK";
  const uid = auth.currentUser?.uid;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const getMessages = async () => {
    const res = await fetch(`http://127.0.0.1:5000/chats/${chatId}/messages`);
    if (!res.ok) {
      console.error('getMessages failed:', res.status);
      return;
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error('Unexpected data:', data);
      return;
    }
    data.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
    setMessages(data);
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    if (!uid) { console.error('No uid yet'); return; }

    await fetch(`http://127.0.0.1:5000/chats/${chatId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        user_id: uid,
        username: auth.currentUser?.displayName || "User"
      })
    });

    setText("");
    getMessages();
  };

  useEffect(() => {
    getMessages();

    const interval = setInterval(getMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {messages.map((m, i) => (
        <div key={i}>
          <strong>{m.username}:</strong> {m.text}
          <div style={{ fontSize: "12px", color: "gray" }}>
            {m.timestamp
              ? new Date(m.timestamp.seconds * 1000).toLocaleString()
              : ""}
          </div>
        </div>
      ))}

      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default Chat;