import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/admin/requireAdmin";
import { normalizeRole, roleHasPermission, roleLabel } from "@/lib/admin/permissions";
import {
  appUrl,
  hasSupabasePublicConfig,
  resendConfig,
  supabaseSecretKey,
} from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  // Operational settings are visible to Owner and Admin; Read-Only Analysts are
  // redirected to the overview.
  const admin = await requirePermission("view_settings");
  const role = normalizeRole(admin.profile.role);
  const isOwner = roleHasPermission(role, "manage_owner_settings");
  const displayName = admin.profile.display_name?.trim() || admin.profile.email;
  const resend = resendConfig();

  // Only booleans and the public app URL are shown — never secret values.
  const config: { label: string; ok: boolean; note?: string }[] = [
    { label: "Supabase public config", ok: hasSupabasePublicConfig() },
    { label: "Supabase secret key", ok: Boolean(supabaseSecretKey()) },
    { label: "Resend API key", ok: Boolean(resend.apiKey) },
    { label: "Email sender configured", ok: Boolean(resend.from) },
    { label: "Email reply-to configured", ok: Boolean(resend.replyTo) },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Environment and account configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Signed-in Admin</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{displayName ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{admin.profile.email ?? admin.user.email ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="outline">{roleLabel(role)}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Environment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Application URL</span>
            <code className="rounded bg-muted px-1.5 py-0.5">{appUrl()}</code>
          </div>
          {config.map((c) => (
            <div key={c.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{c.label}</span>
              <Badge variant={c.ok ? "success" : "warning"}>
                {c.ok ? "Configured" : "Missing"}
              </Badge>
            </div>
          ))}
          <p className="pt-2 text-[11px] text-muted-foreground">
            Secret values are never displayed. The email sender currently uses the Resend
            testing sender; change <code>OASIS_EMAIL_FROM</code> after verifying a custom
            domain — no code change required.
          </p>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ownership &amp; Team</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            You are an Owner. Manage internal team members, roles, and access from
            the <span className="font-medium text-foreground">Team</span> section.
            Ownership changes require Owner authorization and are enforced
            server-side.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
