// Axios client for the Syllabot FastAPI backend.
// All calls go through the `/api` prefix; Vite's dev proxy rewrites it to the
// backend origin and strips the prefix.

import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  timeout: 120_000, // first call includes a ~60s embedding cold-start
});

/** Send a message to the chat endpoint.
 *  @param {string} provider - Optional LLM provider override ("gemini", "groq", "ollama").
 *  @returns {Promise<{answer, sources, confidence, query_id, condensed_query, latency_ms}>} */
export async function sendMessage(sessionId, message, provider) {
  const body = { session_id: sessionId, message };
  if (provider) body.provider = provider;
  const { data } = await client.post("/chat", body);
  return data;
}

/** Record thumbs up/down feedback on a specific answer.
 *  @returns {Promise<{feedback_id, message}>} */
export async function submitFeedback(queryId, rating, comment) {
  const { data } = await client.post("/feedback", {
    query_id: queryId,
    rating,
    comment: comment || null,
  });
  return data;
}

/** Upload a course file for a session.
 *  @returns {Promise<{filename, message, indexed, file_count}>} */
export async function uploadFile(sessionId, file) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);
  const { data } = await client.post("/upload", form);
  return data;
}

/** List uploaded files for a session.
 *  @returns {Promise<{session_id, files: [{filename, size_bytes, extension}]}>} */
export async function listSessionFiles(sessionId) {
  const { data } = await client.get(`/session/${sessionId}/files`);
  return data;
}

/** Delete a session's uploaded files and private index. */
export async function deleteSession(sessionId) {
  const { data } = await client.delete(`/session/${sessionId}`);
  return data;
}

export default client;