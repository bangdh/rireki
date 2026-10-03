import { prisma } from "@rireki/db";
import { getFormatter, getTranslations } from "next-intl/server";
import { Icon } from "@/components/Icon";
import { Menu } from "@/components/Menu";
import { Table } from "@/components/Table";
import { initials } from "@/lib/auth-schemas";
import { When } from "@/lib/candidates/When";
import { requireRole } from "@/lib/tenant";
import { AutoSubmit } from "../../candidates/AutoSubmit";
import { Feedback } from "../Feedback";
import { cancelInvite, reactivateMember, removeMember, resendInvite, suspendMember } from "./actions";
import { InviteMember } from "./InviteMember";
import { RoleSelect } from "./RoleSelect";

// app/settings-members.html. Branch is a free-text label on Member/Invitation (TODO(phase2): roles per branch). Phase 1 is free: no seats line.
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
const ERRORS = ["roles_d"] as const;
const isAdmin = (role: string) => role === "owner" || role === "admin";

export default async function MembersSettingsPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; branch?: string; error?: string }> }) {
  const { q = "", role: roleFilter = "", branch: branchFilter = "", error } = await searchParams;
  const { tenant, user: me } = await requireRole("admin");
  const [t, f] = await Promise.all([getTranslations(), getFormatter()]);
  const [members, invitations] = await Promise.all([
    prisma.member.findMany({ where: { organizationId: tenant.id }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ where: { organizationId: tenant.id, status: "pending" }, orderBy: { createdAt: "asc" } }),
  ]);
  const sessions = await prisma.session.groupBy({ by: ["userId"], where: { userId: { in: members.map((m) => m.userId) } }, _max: { updatedAt: true } });
  const lastActive = new Map(sessions.map((s) => [s.userId, s._max.updatedAt]));
  const counts = { admins: members.filter((m) => isAdmin(m.role)).length, users: members.filter((m) => m.role === "member").length, invited: invitations.length };
  const branches = [...new Set([...members, ...invitations].map((x) => x.branch).filter((b): b is string => Boolean(b)))].sort();
  const needle = q.trim().toLowerCase();
  const shown = (name: string, email: string, role: string, branch: string | null) =>
    (!needle || `${name} ${email}`.toLowerCase().includes(needle)) && (!roleFilter || roleFilter === (isAdmin(role) ? "admin" : role)) && (!branchFilter || branchFilter === branch);
  const cell = (v: "y" | "n" | "own" | "if_enabled") =>
    v === "y" ? <td className="y">✓</td> : v === "n" ? <td className="n">—</td> : <td className="p">{t(v === "own" ? "perm.own_only" : "perm.if_enabled")}</td>;
  const when = (userId: string) => {
    if (userId === me.id) return t("common.now");
    const at = lastActive.get(userId);
    return at ? <When date={at} /> : "—";
  };

  return (
    <div className="stack-lg">
      <div className="row between">
        <div>
          <h2>{t("nav.members")}</h2>
          <p className="muted small">{counts.admins} <span>{t("role.admins")}</span> · {counts.users} <span>{t("role.users")}</span> · {counts.invited} <span>{t("common.invited_lc")}</span></p>
        </div>
        <InviteMember defaultLang={tenant.settings.defaultLang} branches={branches} />
      </div>
      <Feedback error={error && (ERRORS as readonly string[]).includes(error) ? t(`members.${error as (typeof ERRORS)[number]}`) : null} />
      <section className="card">
        <form className="table-toolbar" method="get">
          <div className="search input-wrap"><Icon name="search" /><input className="input input-sm" name="q" defaultValue={q} placeholder={t("members.search_ph")} /></div>
          <select className="select select-sm" name="role" defaultValue={roleFilter} style={{ width: "auto" }} aria-label={t("common.role")}>
            <option value="">{t("common.role")}</option><option value="admin">{t("role.admin")}</option><option value="member">{t("role.user")}</option>
          </select>
          <select className="select select-sm" name="branch" defaultValue={branchFilter} style={{ width: "auto" }} aria-label={t("members.branch")}>
            <option value="">{t("members.branch")}</option>{branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <AutoSubmit />
        </form>
        <div className="table-wrap">
          <Table className="table">
            <thead>
              <tr><th>{t("members.member")}</th><th>{t("common.role")}</th><th>{t("members.branch")}</th><th>{t("common.status")}</th><th>{t("members.last_active")}</th><th></th></tr>
            </thead>
            <tbody>
              {members.filter((m) => shown(m.user.name, m.user.email, m.role, m.branch)).map((m) => {
                const self = m.userId === me.id;
                const suspended = m.role === "suspended";
                return (
                  <tr key={m.id} style={suspended ? { opacity: ".7" } : undefined}>
                    <td>
                      <div className="person">
                        <span className="avatar">{initials(m.user.name)}</span>
                        <div>
                          <div className="n">{m.user.name} {self && <span className="badge badge-outline">{t("common.you")}</span>}</div>
                          <div className="k">{m.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{suspended ? <span className="badge">{t("role.user")}</span> : <RoleSelect memberId={m.id} role={isAdmin(m.role) ? "admin" : "member"} disabled={self} />}</td>
                    <td>{m.branch ?? "—"}</td>
                    <td>{suspended ? <span className="badge badge-danger badge-dot">{t("common.suspended")}</span> : <span className="badge badge-success badge-dot">{t("common.active")}</span>}</td>
                    <td className="small muted">{when(m.userId)}</td>
                    <td>
                      {suspended ? (
                        <div className="row-actions"><form action={reactivateMember.bind(null, m.id)}><button className="btn btn-sm" type="submit">{t("members.reactivate")}</button></form></div>
                      ) : (
                        !self && (
                          <div className="row-actions">
                            <Menu>
                              <summary className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></summary>
                              <div className="menu-list">
                                <form action={suspendMember.bind(null, m.id)}><button type="submit"><Icon name="ban" /><span>{t("members.suspend")}</span></button></form>
                                <hr />
                                <form action={removeMember.bind(null, m.id)}><button type="submit" className="danger"><Icon name="trash" /><span>{t("members.remove")}</span></button></form>
                              </div>
                            </Menu>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
              {invitations.filter((i) => shown("", i.email, i.role ?? "member", i.branch)).map((i) => (
                <tr key={i.id}>
                  <td>
                    <div className="person">
                      <span className="avatar">{initials(i.email)}</span>
                      <div>
                        <div className="n">{i.email}</div>
                        <div className="k">{t("common.invited")}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge">{t(i.role === "admin" ? "role.admin" : "role.user")}</span></td>
                  <td>{i.branch ?? "—"}</td>
                  <td><span className="badge badge-info badge-dot">{t("common.invited")}</span> <span className="small muted">{t("members.expires_on", { date: f.dateTime(i.expiresAt, { day: "numeric", month: "short" }) })}</span></td>
                  <td className="small muted">—</td>
                  <td>
                    <div className="row-actions">
                      <form action={resendInvite.bind(null, i.id)}><button className="btn btn-sm" type="submit">{t("members.resend")}</button></form>
                      <form action={cancelInvite.bind(null, i.id)}><button className="btn btn-ghost btn-icon btn-sm" type="submit" aria-label={t("common.cancel")}><Icon name="x" /></button></form>
                    </div>
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
