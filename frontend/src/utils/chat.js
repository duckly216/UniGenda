import axios from "axios";
import { auth } from "../firebase";

const BASE_URL = "http://127.0.0.1:5000";

export const getChatAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in to use chat.");
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const findOrCreateDirectChat = async (otherUserId) => {
  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid;
  const nextOtherUserId = String(otherUserId || "").trim();

  if (!currentUserId || !nextOtherUserId) {
    throw new Error("A valid user is required to start a chat.");
  }

  const headers = await getChatAuthHeaders();
  let response;

  try {
    response = await axios.post(
      `${BASE_URL}/chats/find_or_create`,
      {
        members: [currentUserId, nextOtherUserId],
      },
      { headers },
    );
  } catch (error) {
    const message =
      error?.response?.data?.error || "Could not open the conversation.";
    throw new Error(message);
  }

  const chat = response.data?.chat || {};
  return {
    chatId: response.data?.chat_id,
    title: chat.displayTitle || chat.title || "Conversation",
  };
};
