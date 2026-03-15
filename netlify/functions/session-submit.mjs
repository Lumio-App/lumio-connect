// session-submit.mjs
// POST /api/session-submit/:token
// Reçoit les credentials depuis la page iPhone et les stocke pour l'Apple TV.

import { getStore } from "@netlify/blobs";

const CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type":                 "application/json",
};

export default async (req, context) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "method_not_allowed" }), {
            status: 405, headers: CORS,
        });
    }

    const { token } = context.params;
    if (!token) {
        return new Response(JSON.stringify({ error: "missing_token" }), {
            status: 400, headers: CORS,
        });
    }

    const store = getStore("sessions");
    const raw   = await store.get(token);

    if (!raw) {
        return new Response(JSON.stringify({ error: "not_found" }), {
            status: 404, headers: CORS,
        });
    }

    const session = JSON.parse(raw);

    if (Date.now() > session.expires_at) {
        await store.delete(token);
        return new Response(JSON.stringify({ error: "expired" }), {
            status: 410, headers: CORS,
        });
    }

    if (session.status !== "pending") {
        return new Response(JSON.stringify({ error: "already_submitted" }), {
            status: 409, headers: CORS,
        });
    }

    // Lecture et validation du body
    let credentials;
    try {
        credentials = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "invalid_json" }), {
            status: 400, headers: CORS,
        });
    }

    const required = ["playlist_type", "playlist_name"];
    for (const field of required) {
        if (!credentials[field]) {
            return new Response(
                JSON.stringify({ error: "missing_field", field }),
                { status: 400, headers: CORS }
            );
        }
    }

    // Stockage
    await store.set(token, JSON.stringify({
        ...session,
        status:       "completed",
        credentials,
        completed_at: Date.now(),
    }));

    return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: CORS }
    );
};

export const config = { path: "/api/session-submit/:token" };
