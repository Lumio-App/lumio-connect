// session-status.js — Netlify Function
// GET /api/session-status/:token

const { getStore } = require("@netlify/blobs");

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type":                "application/json",
};

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: CORS, body: "" };
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

    if (session.status === "pending") {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ status: "pending" }) };
    }

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
