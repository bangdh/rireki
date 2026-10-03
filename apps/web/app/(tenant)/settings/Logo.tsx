import type { CSSProperties } from "react";
import { initials } from "@/lib/auth-schemas";
import { logoUrl, type Tenant } from "@/lib/tenant";

/** The tenant logo from rireki-public, or its initials in the mockup's avatar box. `size` in px. */
export function Logo({ tenant, size, radius = 12, fontSize = 18, className = "avatar", style }: { tenant: Tenant; size: number; radius?: number; fontSize?: number; className?: string; style?: CSSProperties }) {
  const box: CSSProperties = { width: `${size}px`, height: `${size}px`, borderRadius: `${radius}px`, background: "var(--primary-soft)", color: "var(--primary-ink)", fontSize: `${fontSize}px`, overflow: "hidden", ...style };
  return (
    <span className={className} style={box}>
      {tenant.settings.logoKey ? (
        // eslint-disable-next-line @next/next/no-img-element -- plain <img>: the logo lives in the public bucket, not an optimizable asset
        <img src={logoUrl(tenant.settings.logoKey, tenant.settings.updatedAt)} alt={tenant.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      ) : (
        initials(tenant.name)
      )}
    </span>
  );
}
