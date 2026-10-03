"use client";

import { createAuthClient } from "better-auth/react";

// Talks to /api/auth on the current subdomain; sign-in, sign-out and password reset go through it (native rate limit + cookies).
export const authClient = createAuthClient();
