"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

/** "Sign out" entry of the user menu: ends the better-auth session and returns to this tenant's /login. */
export function SignOutButton({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })}>
      {children}
    </button>
  );
}
