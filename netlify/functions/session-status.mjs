// session-status.mjs
// GET /api/session-status/:token
// Retourne le statut de la session (polling Apple TV).
// Une fois "completed", retourne les credentials et supprime la session.

import { getStore } from "@netlify/blobs";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type":                "application/json",
};

export default async (req, context) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS });
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

    // Session expirée
    if (Date.now() > session.expires_at) {
        await store.delete(token);
        return new Response(JSON.stringify({ error: "expired" }), {
            status: 410, headers: CORS,
        });
    }

    // En attente
    if (session.status === "pending") {
        return new Response(
            JSON.stringify({ status: "pending" }),
            { status: 200, headers: CORS }
        );
    }

    // Credentials reçus — on envoie une seule fois puis on supprime
    if (session.status === "completed") {
        await store.delete(token);
        return new Response(
            JSON.stringify({ status: "completed", credentials: session.credentials }),
            { status: 200, headers: CORS }
        );
    }

    return new Response(JSON.stringify({ error: "unknown_state" }), {
        status: 500, headers: CORS,
    });
};

export const config = { path: "/api/session-status/:token" };
