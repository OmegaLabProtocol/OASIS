import { requirePermission } from "@/lib/admin/requireAdmin";
import { listTeamMembers } from "@/lib/admin/team";
import { normalizeRole } from "@/lib/admin/permissions";
import { TeamManager, type TeamMemberView } from "@/components/admin/TeamManager";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  // Owner-only. Non-owners are redirected to the Admin overview.
  await requirePermission("manage_team");

  const members = await listTeamMembers();
  const view: TeamMemberView[] = members.map((m) => {
    const role = normalizeRole(m.role);
    return {
      id: m.id,
      displayName: m.display_name,
      email: m.email,
      role,
      active: m.active,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      isOwner: role === "owner",
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage internal OASIS team members and their roles. Only Owners can
          manage the team. Owner accounts are protected.
        </p>
      </div>

      <TeamManager members={view} />
    </div>
  );
}
