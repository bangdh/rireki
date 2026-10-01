import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Menu } from "@/components/Menu";
import { Table } from "@/components/Table";
import { MEMBERS } from "@/lib/sample";
import { InviteMember } from "./InviteMember";

// app/settings-members.html. TODO(auth-tenant): members + invitations from better-auth organization, role change / suspend /
// remove / resend Server Actions with requireRole("admin"); 403 for the user role.
const PERMS = [
  ["perm.candidates_edit", "y", "y"],
  ["perm.candidates_archive", "y", "own"],
  ["perm.links_create", "y", "y"],
  ["perm.links_revoke", "y", "own"],
  ["perm.links_download", "y", "if_enabled"],
  ["perm.export", "y", "n"],
  ["perm.members", "y", "n"],
  ["perm.settings", "y", "n"],
  ["perm.audit", "y", "n"],
] as const;

export default async function MembersSettingsPage() {
  const t = await getTranslations();
  const cell = (v: "y" | "n" | "own" | "if_enabled") =>
    v === "y" ? <td className="y">✓</td> : v === "n" ? <td className="n">—</td> : <td className="p">{t(v === "own" ? "perm.own_only" : "perm.if_enabled")}</td>;
  return (
    <div className="stack-lg">
      <div className="row between">
        <div>
          <h2>{t("nav.members")}</h2>
          <p className="muted small">2 <span>{t("role.admins")}</span> · 5 <span>{t("role.users")}</span> · 1 <span>{t("common.invited_lc")}</span> · <span>{t("members.seats")}</span></p>
        </div>
        <InviteMember />
      </div>
      <section className="card">
        <div className="table-toolbar">
          <div className="search input-wrap"><Icon name="search" /><input className="input input-sm" name="q" placeholder={t("members.search_ph")} /></div>
          <select className="select select-sm" style={{ width: "auto" }} aria-label={t("common.role")}><option value="">{t("common.role")}</option><option value="admin">{t("role.admin")}</option><option value="member">{t("role.user")}</option></select>
          <select className="select select-sm" style={{ width: "auto" }} aria-label={t("members.branch")}><option value="">{t("members.branch")}</option><option>Hà Nội HQ</option><option>Yangon</option><option>Dhaka</option></select>
        </div>
        <div className="table-wrap">
          <Table className="table">
            <thead>
              <tr><th>{t("members.member")}</th><th>{t("common.role")}</th><th>{t("members.branch")}</th><th>{t("common.status")}</th><th>{t("members.last_active")}</th><th></th></tr>
            </thead>
            <tbody>
              {MEMBERS.map((m) => (
                <tr key={m.email} style={m.status === "suspended" ? { opacity: ".7" } : undefined}>
                  <td>
                    <div className="person">
                      <span className="avatar">{m.initials}</span>
                      <div>
                        <div className="n">{m.name} {m.me && <span className="badge badge-outline">{t("common.you")}</span>}</div>
                        <div className="k">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {m.status === "active" ? (
                      <select className="select select-sm" style={{ width: "auto" }} defaultValue={m.role} aria-label={t("common.role")}>
                        <option value="admin">{t("role.admin")}</option><option value="user">{t("role.user")}</option>
                      </select>
                    ) : (
                      <span className="badge">{t(`role.${m.role}`)}</span>
                    )}
                  </td>
                  <td>{m.branch}</td>
                  <td>
                    {m.status === "active" && <span className="badge badge-success badge-dot">{t("common.active")}</span>}
                    {m.status === "invited" && <><span className="badge badge-info badge-dot">{t("common.invited")}</span> <span className="small muted">{t("members.expires_3d")}</span></>}
                    {m.status === "suspended" && <span className="badge badge-danger badge-dot">{t("common.suspended")}</span>}
                  </td>
                  <td className="small muted">{[m.lastActive.time, m.lastActive.day && t(`common.${m.lastActive.day}`)].filter(Boolean).join(" ")}</td>
                  <td>
                    {m.status === "active" && !m.me && (
                      <div className="row-actions">
                        <Menu>
                          <summary className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></summary>
                          <div className="menu-list">
                            <button type="button"><Icon name="ban" /><span>{t("members.suspend")}</span></button>
                            <hr />
                            <button type="button" className="danger"><Icon name="trash" /><span>{t("members.remove")}</span></button>
                          </div>
                        </Menu>
                      </div>
                    )}
                    {m.status === "invited" && (
                      <div className="row-actions"><button className="btn btn-sm" type="button">{t("members.resend")}</button><button className="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Cancel invitation"><Icon name="x" /></button></div>
                    )}
                    {m.status === "suspended" && <div className="row-actions"><button className="btn btn-sm" type="button">{t("members.reactivate")}</button></div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </section>
      <section className="card">
        <div className="card-header">
          <h3>{t("members.roles_t")}</h3>
          <span className="small muted">{t("members.roles_d")}</span>
        </div>
        <div className="table-wrap">
          <Table className="table matrix">
            <thead>
              <tr><th>{t("members.permission")}</th><th>{t("role.admin")}</th><th>{t("role.user")}</th></tr>
            </thead>
            <tbody>
              {PERMS.map(([key, admin, user]) => (
                <tr key={key}>
                  <td>{t(key)}</td>
                  {cell(admin)}
                  {cell(user)}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </section>
    </div>
  );
}
