// session-status.mjs  — Netlify Function v1
// GET /api/session-status/:token  (token extrait du path)
// Polling Apple TV — retourne pending | completed + credentials.

import { getStore } from "@netlify/blobs";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type":                "application/json",
};

export const handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: CORS, body: "" };
    }

    // Token = dernier segment du path (ex: /api/session-status/AX7K2M)
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

    if (session.status === "pending") {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ status: "pending" }) };
    }

    // Completed — on envoie les credentials et on supprime la session
    if (session.status === "completed") {
        await store.delete(token);
        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ status: "completed", credentials: session.credentials }),
        };
    }

    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "unknown_state" }) };
};
