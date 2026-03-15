// session-submit.mjs  — Netlify Function v1
// POST /api/session-submit/:token
// Reçoit les credentials depuis la page iPhone.

import { getStore } from "@netlify/blobs";

const CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type":                 "application/json",
};

export const handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: CORS, body: "" };
    }
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "method_not_allowed" }) };
    }

    const token = event.path.split("/").filter(Boolean).pop();
    if (!token) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "missing_token" }) };
    }

    const store = getStore("sessions");
    const raw   = await store.get(token);

    if (!raw) {
        return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "not_found" }) };
    }

    const session = JSON.parse(raw);

    if (Date.now() > session.expires_at) {
        await store.delete(token);
        return { statusCode: 410, headers: CORS, body: JSON.stringify({ error: "expired" }) };
    }
    if (session.status !== "pending") {
        return { statusCode: 409, headers: CORS, body: JSON.stringify({ error: "already_submitted" }) };
    }

    let credentials;
    try {
        credentials = JSON.parse(event.body || "{}");
    } catch {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "invalid_json" }) };
    }

    if (!credentials.playlist_type || !credentials.playlist_name) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "missing_required_fields" }) };
    }

    await store.set(token, JSON.stringify({
        ...session,
        status:       "completed",
        credentials,
        completed_at: Date.now(),
    }));

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
};
