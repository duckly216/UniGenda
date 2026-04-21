import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/LookingForGroup.css";

const BASE_URL = "http://127.0.0.1:5000";

const formatCreatedAt = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

const LookingForGroup = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    username: "",
  });

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/lfg`);
      if (!response.ok) {
        throw new Error(`Failed to load posts (${response.status})`);
      }

      const data = await response.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading LFG posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.displayName) {
        setForm((current) => ({
          ...current,
          username: current.username || user.displayName,
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadPosts();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      username: form.username.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
    };

    if (!payload.username || !payload.title || !payload.description) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${BASE_URL}/lfg`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to create post");
      }

      const newPost = await response.json();
      setPosts((current) => [newPost, ...current]);
      setForm((current) => ({
        ...current,
        title: "",
        description: "",
      }));
    } catch (error) {
      console.error("Error creating LFG post:", error);
      alert(error.message || "Unable to create the group post right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lfg-page">
      <div className="lfg-hero">
        <div>
          <p className="lfg-eyebrow">Community</p>
          <h1>Looking For Group</h1>
          <p className="lfg-subtitle">
            Start a study group, find collaborators, and jump into a shared chat
            when a post matches what you need.
          </p>
        </div>
      </div>

      <div className="lfg-layout">
        <section className="lfg-panel lfg-panel-form">
          <h2>Create a Group Post</h2>
          <form className="lfg-form" onSubmit={handleSubmit}>
            <label className="lfg-field">
              <span>Name</span>
              <input
                type="text"
                name="username"
                placeholder="Your display name"
                value={form.username}
                onChange={handleChange}
                required
              />
            </label>

            <label className="lfg-field">
              <span>Title</span>
              <input
                type="text"
                name="title"
                placeholder="What are you looking for?"
                value={form.title}
                onChange={handleChange}
                required
              />
            </label>

            <label className="lfg-field">
              <span>Details</span>
              <textarea
                name="description"
                placeholder="Share timing, class, goals, or anything helpful."
                value={form.description}
                onChange={handleChange}
                required
              />
            </label>

            <button type="submit" className="lfg-primary-btn" disabled={submitting}>
              {submitting ? "Posting..." : "Post Group Request"}
            </button>
          </form>
        </section>

        <section className="lfg-panel">
          <div className="lfg-panel-header">
            <h2>Active Posts</h2>
            <button
              type="button"
              className="lfg-secondary-btn"
              onClick={loadPosts}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <p className="lfg-empty">Loading group posts...</p>
          ) : posts.length === 0 ? (
            <p className="lfg-empty">
              No group posts yet. Create the first one and start the conversation.
            </p>
          ) : (
            <div className="lfg-posts">
              {posts.map((post) => (
                <article key={post.id} className="lfg-post">
                  <div className="lfg-post-header">
                    <div>
                      <h3>{post.title}</h3>
                      <p className="lfg-post-meta">Posted by {post.username || "Unknown user"}</p>
                    </div>
                    {post.createdAt && (
                      <span className="lfg-post-date">
                        {formatCreatedAt(post.createdAt)}
                      </span>
                    )}
                  </div>

                  <p className="lfg-post-description">{post.description}</p>

                  <div className="lfg-post-actions">
                    <button
                      type="button"
                      className="lfg-primary-btn"
                      onClick={() =>
                        navigate(`/chat/${post.chatId || post.id}`, {
                          state: { title: post.title },
                        })
                      }
                    >
                      Open Group Chat
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LookingForGroup;
