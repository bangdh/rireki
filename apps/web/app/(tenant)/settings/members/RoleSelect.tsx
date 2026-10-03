"use client";

import { useTranslations } from "next-intl";
import { setRole } from "./actions";

/**
 * Role column of app/settings-members.html: changing the select submits the setRole Server Action.
 * Uncontrolled and keyed by the saved role: React resets the form after the action, which snaps a refused change back to
 * the saved role, while an accepted change re-renders the row with the new role and remounts the select.
 */
export function RoleSelect({ memberId, role, disabled }: { memberId: string; role: "admin" | "member"; disabled?: boolean }) {
  const t = useTranslations();
  return (
    <form action={setRole}>
      <input type="hidden" name="memberId" value={memberId} />
      <select key={role} name="role" className="select select-sm" style={{ width: "auto" }} defaultValue={role} disabled={disabled} aria-label={t("common.role")} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        <option value="admin">{t("role.admin")}</option>
        <option value="member">{t("role.user")}</option>
      </select>
    </form>
  );
}
