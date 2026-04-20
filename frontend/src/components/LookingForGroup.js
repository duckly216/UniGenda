

import React, { useEffect, useState } from "react";
import "./LookingForGroup.css";

const LookingForGroup = () => {
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    username: "",
  });

  // Fetch posts from backend
  useEffect(() => {
    fetch("http://localhost:5000/lfg")
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch((err) => console.error(err));
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit new post
  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:5000/lfg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const newPost = await res.json();
    setPosts([newPost, ...posts]);

    setForm({
      title: "",
      description: "",
      username: "",
    });
  };

  return (
    <div className="lfg-container">
      <h1>Looking For Group</h1>

      {/* Create Post */}
      <form className="lfg-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Your name"
          value={form.username}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="title"
          placeholder="What are you looking for?"
          value={form.title}
          onChange={handleChange}
          required
        />
        <textarea
          name="description"
          placeholder="Details..."
          value={form.description}
          onChange={handleChange}
          required
        />
        <button type="submit">Post</button>
      </form>

      {/* Posts List */}
      <div className="lfg-posts">
        {posts.map((post, index) => (
          <div key={index} className="lfg-post">
            <h3>{post.title}</h3>
            <p>{post.description}</p>
            <span>Posted by {post.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LookingForGroup;