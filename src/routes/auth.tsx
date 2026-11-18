import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/logo-mopsentry-a-clean.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "in" | "up" | "forgot" | "reset";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MOPSENTRY EA" },
      { name: "description", content: "Sign in to monitor your MOPSENTRY account." },
      { property: "og:title", content: "Sign in — MOPSENTRY EA" },
      { property: "og:description", content: "Sign in to monitor your MOPSENTRY account." },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let recoveryLink = false;
    try {
      recoveryLink = new URLSearchParams(window.location.search).get("mode") === "recovery";
    } catch {
      recoveryLink = false;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setNotice("Choose a new password for your account.");
        return;
      }
      if (session && !recoveryLink) {
        navigate({ to: "/dashboard", replace: true });
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (recoveryLink && data.session) {
        setMode("reset");
        setNotice("Choose a new password for your account.");
      } else if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) toast.error(error.message);
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) toast.error(error.message);
        else setNotice("Account request received. Check your inbox and spam folder for the confirmation email. If it does not arrive, contact support because email delivery may need configuration.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth?mode=recovery",
        });
        if (error) toast.error(error.message);
        else setNotice("If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder.");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) toast.error(error.message);
        else {
          toast.success("Password updated. Please sign in with your new password.");
          setPassword("");
          setMode("in");
          setNotice("");
          await supabase.auth.signOut();
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };


  const title =
    mode === "in" ? "Welcome back" :
    mode === "up" ? "Create your account" :
    mode === "forgot" ? "Reset your password" : "Choose a new password";

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#070b14] px-5 py-12 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.22),transparent_55%)]" />
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <img
          src={logo}
          alt="MOPSENTRY EA"
          width={1328}
          height={316}
          loading="eager"
          className="h-16 w-auto"
        />
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-slate-400">Your trading robot, in your pocket.</p>
      </div>
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-blue-400/20 bg-[#0b1220]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        {mode !== "reset" && (
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        )}
        {(mode === "in" || mode === "up" || mode === "reset") && (
          <Input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "reset" ? "new-password" : mode === "in" ? "current-password" : "new-password"}
            placeholder={mode === "reset" ? "New password" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy
            ? mode === "in" ? "Signing in…" : mode === "up" ? "Creating account…" : mode === "forgot" ? "Sending reset link…" : "Updating password…"
            : mode === "in" ? "Sign in" : mode === "up" ? "Sign up" : mode === "forgot" ? "Send reset link" : "Update password"}
        </Button>
      </form>

      {notice && (
        <p role="status" aria-live="polite" className="mt-4 rounded-lg border border-blue-400/20 bg-blue-400/5 p-3 text-sm text-slate-300">
          {notice}
        </p>
      )}

      {mode === "in" && (
        <button
          type="button"
          className="mt-4 text-sm text-cyan-300 hover:underline disabled:opacity-50"
          onClick={() => { setMode("forgot"); setNotice(""); }}
          disabled={busy}
        >
          Forgot password?
        </button>
      )}


      <button
        type="button"
        className="mt-6 text-sm text-slate-400 hover:text-white disabled:opacity-50"
        disabled={busy}
        onClick={() => {
          setMode(mode === "in" ? "up" : "in");
          setPassword("");
          setNotice("");
        }}
      >
        {mode === "in" ? "No account? Sign up" : mode === "up" ? "Have an account? Sign in" : "Back to sign in"}
      </button>
        <div className="mt-6 text-center"><Link to="/" className="text-xs text-slate-500 transition-colors hover:text-cyan-300">Back to MOPSENTRY</Link></div>
      </div>
    </main>
  );
}