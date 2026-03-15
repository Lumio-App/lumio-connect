// session-create.mjs  — Netlify Function v1
// POST /api/session-create
// Crée une session QR Code avec token unique 6 chars (TTL 10 min).

import { getStore } from "@netlify/blobs";

const CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type":                 "application/json",
};

function generateToken() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join("");
}

export const handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: CORS, body: "" };
    }
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "method_not_allowed" }) };
    }

    const store = getStore("sessions");
    const TTL   = 10 * 60 * 1000;

    let token;
    for (let i = 0; i < 5; i++) {
        const candidate = generateToken();
        const existing  = await store.get(candidate);
        if (!existing) { token = candidate; break; }
    }

    if (!token) {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "token_generation_failed" }) };
    }

    const session = {
        status:     "pending",
        created_at: Date.now(),
        expires_at: Date.now() + TTL,
    };

    await store.set(token, JSON.stringify(session));

    return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ token, expires_in: TTL / 1000 }),
    };
};
