"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Sidebar / subnav link that gets .active for its own path and sub-paths, and closes the phone drawer when used. */
export function NavLink({ href, exact = false, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname.startsWith(href + "/"));
  return (
    <Link href={href} className={active ? "active" : undefined} onClick={() => document.body.classList.remove("sidebar-open")}>
      {children}
    </Link>
  );
}
