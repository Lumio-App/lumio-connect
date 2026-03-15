// session-create.mjs
// POST /api/session-create
// Crée une session avec un token unique à 6 caractères (10 min TTL).

import { getStore } from "@netlify/blobs";

const CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type":                 "application/json",
};

function generateToken() {
    // Caractères sans ambiguïté (pas I, O, 1, 0)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
    ).join("");
}

export default async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "method_not_allowed" }), {
            status: 405, headers: CORS,
        });
    }

    const store = getStore("sessions");
    const TTL   = 10 * 60 * 1000; // 10 minutes en ms

    // Génère un token unique (max 5 tentatives)
    let token;
    for (let i = 0; i < 5; i++) {
        const candidate = generateToken();
        const existing  = await store.get(candidate);
        if (!existing) { token = candidate; break; }
    }

    if (!token) {
        return new Response(JSON.stringify({ error: "token_generation_failed" }), {
            status: 500, headers: CORS,
        });
    }

    const session = {
        status:     "pending",
        created_at: Date.now(),
        expires_at: Date.now() + TTL,
    };

    await store.set(token, JSON.stringify(session));

    return new Response(
        JSON.stringify({ token, expires_in: TTL / 1000 }),
        { status: 200, headers: CORS }
    );
};

export const config = { path: "/api/session-create" };
