"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState<null | "password" | "magic" | "reset">(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  function callbackUrl(next = "/admin") {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading("password");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Invalid email or password.");
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function sendMagicLink() {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email to receive a magic link.");
      return;
    }
    setLoading("magic");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Do NOT auto-create users: unknown emails must not become admins.
          shouldCreateUser: false,
          emailRedirectTo: callbackUrl("/admin"),
        },
      });
      // Generic response to avoid leaking whether an account exists.
      if (error && !/not.*allowed|signups?.*disabled/i.test(error.message)) {
        setError("Unable to send magic link. Please try again.");
        return;
      }
      setNotice("If an authorized admin account exists for that email, a magic link has been sent.");
    } catch {
      setError("Unable to send magic link. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function forgotPassword() {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email to reset your password.");
      return;
    }
    setLoading("reset");
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl("/admin"),
      });
      setNotice("If an account exists for that email, password reset instructions have been sent.");
    } catch {
      setError("Unable to send reset email. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background gradient-mesh flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-border text-xs font-bold">
            Ω
          </div>
          <span className="text-sm font-semibold tracking-tight">OASIS Admin</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <h1 className="text-lg font-medium tracking-tight">Sign in</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              OASIS Admin Control Center — authorized administrators only.
            </p>

            <form onSubmit={signInPassword} className="mt-5 space-y-3">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full gap-2" disabled={loading !== null}>
                {loading === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
            </form>

            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={forgotPassword}
                className="text-xs text-muted-foreground hover:text-foreground"
                disabled={loading !== null}
              >
                Forgot password?
              </button>
            </div>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={sendMagicLink}
              disabled={loading !== null}
            >
              {loading === "magic" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Email Me a Magic Link
            </Button>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
            {notice && <p className="mt-3 text-xs text-muted-foreground">{notice}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
