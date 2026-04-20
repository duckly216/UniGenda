import React, { useEffect, useState } from "react";
import axios from "axios";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../styles/Friends.css";

const BASE_URL = "http://127.0.0.1:5000";

const FriendsPage = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                loadFriendData(user);
            }
        });
        return () => unsubscribe();
    }, []);

    const authHeaders = async () => {
        if (!auth.currentUser) return {};
        const token = await auth.currentUser.getIdToken();
        return { Authorization: `Bearer ${token}` };
    };

    const loadFriendData = async (user) => {
        const uid = user?.uid;
        if (!uid) return;
        try {
            const headers = await authHeaders();
            const [requestsRes, friendsRes] = await Promise.all([
                axios.get(`${BASE_URL}/friend_requests`, { headers }),
                axios.get(`${BASE_URL}/users/${uid}/friends`),
            ]);
            setIncomingRequests(requestsRes.data.incoming || []);
            setOutgoingRequests(requestsRes.data.outgoing || []);
            setFriends(friendsRes.data || []);
        } catch (err) {
            console.error("Error loading friend data:", err);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const res = await axios.get(
                `${BASE_URL}/users/search?q=${encodeURIComponent(searchQuery.trim())}`
            );
            setSearchResults(res.data || []);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const getRelationStatus = (uid) => {
        if (friends.some((f) => f.uid === uid)) return "friends";
        if (outgoingRequests.some((r) => r.toUid === uid)) return "outgoing";
        if (incomingRequests.some((r) => r.fromUid === uid)) return "incoming";
        return "none";
    };

    const handleSendRequest = async (toUid) => {
        try {
            const headers = await authHeaders();
            await axios.post(`${BASE_URL}/friend_requests`, { toUid }, { headers });
            await loadFriendData(currentUser);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to send request");
        }
    };

    const handleCancelRequest = async (toUid) => {
        const req = outgoingRequests.find((r) => r.toUid === toUid);
        if (!req) return;
        try {
            const headers = await authHeaders();
            await axios.delete(`${BASE_URL}/friend_requests/${req.id}`, { headers });
            await loadFriendData(currentUser);
        } catch (err) {
            console.error("Cancel request failed:", err);
        }
    };

    const handleRespondToRequest = async (requestId, action) => {
        try {
            const headers = await authHeaders();
            await axios.patch(
                `${BASE_URL}/friend_requests/${requestId}`,
                { action },
                { headers }
            );
            await loadFriendData(currentUser);
        } catch (err) {
            console.error("Respond to request failed:", err);
        }
    };

    const handleRemoveFriend = async (friendUid) => {
        try {
            const headers = await authHeaders();
            await axios.delete(
                `${BASE_URL}/users/${currentUser.uid}/friends/${friendUid}`,
                { headers }
            );
            await loadFriendData(currentUser);
        } catch (err) {
            console.error("Remove friend failed:", err);
        }
    };

    const renderSearchButton = (user) => {
        if (user.uid === currentUser?.uid) return null;
        const status = getRelationStatus(user.uid);
        if (status === "friends") {
            return <span className="friends-status-badge">Friends</span>;
        }
        if (status === "incoming") {
            return <span className="friends-status-badge">Sent you a request</span>;
        }
        if (status === "outgoing") {
            return (
                <button
                    className="friends-btn friends-btn-cancel"
                    onClick={() => handleCancelRequest(user.uid)}
                >
                    Cancel Request
                </button>
            );
        }
        return (
            <button
                className="friends-btn friends-btn-add"
                onClick={() => handleSendRequest(user.uid)}
            >
                Add Friend
            </button>
        );
    };

    return (
        <div className="friends-page">
            <h1 className="friends-heading">Friends</h1>

            {/* Search */}
            <section className="friends-section">
                <h2 className="friends-section-title">Find People</h2>
                <div className="friends-search-bar">
                    <input
                        className="friends-search-input"
                        type="text"
                        placeholder="Search by display name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <button
                        className="friends-btn friends-btn-search"
                        onClick={handleSearch}
                        disabled={loading}
                    >
                        {loading ? "Searching..." : "Search"}
                    </button>
                </div>
                {searchResults.length > 0 && (
                    <div className="friends-list">
                        {searchResults.map((user) => (
                            <div key={user.uid} className="friends-card">
                                <div className="friends-card-info">
                                    <span className="friends-card-name">{user.displayName}</span>
                                    {user.school && (
                                        <span className="friends-card-school">{user.school}</span>
                                    )}
                                </div>
                                <div className="friends-card-actions">
                                    {renderSearchButton(user)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {searchResults.length === 0 && searchQuery && !loading && (
                    <p className="friends-empty">No users found.</p>
                )}
            </section>

            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
                <section className="friends-section">
                    <h2 className="friends-section-title">
                        Friend Requests ({incomingRequests.length})
                    </h2>
                    <div className="friends-list">
                        {incomingRequests.map((req) => (
                            <div key={req.id} className="friends-card">
                                <div className="friends-card-info">
                                    <span className="friends-card-name">
                                        {req.fromProfile?.displayName || req.fromUid}
                                    </span>
                                    {req.fromProfile?.school && (
                                        <span className="friends-card-school">
                                            {req.fromProfile.school}
                                        </span>
                                    )}
                                </div>
                                <div className="friends-card-actions">
                                    <button
                                        className="friends-btn friends-btn-add"
                                        onClick={() => handleRespondToRequest(req.id, "accept")}
                                    >
                                        Accept
                                    </button>
                                    <button
                                        className="friends-btn friends-btn-cancel"
                                        onClick={() => handleRespondToRequest(req.id, "reject")}
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Friends List */}
            <section className="friends-section">
                <h2 className="friends-section-title">My Friends ({friends.length})</h2>
                {friends.length === 0 ? (
                    <p className="friends-empty">You haven't added any friends yet.</p>
                ) : (
                    <div className="friends-list">
                        {friends.map((friend) => (
                            <div key={friend.uid} className="friends-card">
                                <div className="friends-card-info">
                                    <span className="friends-card-name">{friend.displayName}</span>
                                    {friend.school && (
                                        <span className="friends-card-school">{friend.school}</span>
                                    )}
                                </div>
                                <div className="friends-card-actions">
                                    <button
                                        className="friends-btn friends-btn-message"
                                        onClick={async () => {
                                            try {
                                                const res = await axios.post(`${BASE_URL}/chats/find_or_create`, {
                                                    members: [currentUser.uid, friend.uid]
                                                });

                                                const chatId = res.data.chat_id;
                                                navigate(`/chat/${chatId}`);
                                            } catch (err) {
                                                console.error("Chat creation failed:", err);
                                            }
                                        }}
                                    >
                                        Message
                                    </button>
                                    <button
                                        className="friends-btn friends-btn-view"
                                        onClick={() => navigate(`/profile/${friend.uid}`)}
                                    >
                                        View Profile
                                    </button>
                                    <button
                                        className="friends-btn friends-btn-remove"
                                        onClick={() => handleRemoveFriend(friend.uid)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default FriendsPage;
