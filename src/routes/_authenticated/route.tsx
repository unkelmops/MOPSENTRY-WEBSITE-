import { createFileRoute, redirect, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Bot, Radio, Link2, LogOut, MoreVertical, UserRound, BrainCircuit } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemePicker } from "@/components/theme-picker";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-mopsentry-a-clean.png";
import { SignalsBackdrop } from "@/components/signals-backdrop";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

const tabs = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/control", label: "Robot", icon: Bot },
  { to: "/signals", label: "Signals", icon: Radio },
  { to: "/market-report", label: "AI Report", icon: BrainCircuit },
] as const;

function AppLayout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="relative isolate mx-auto flex min-h-screen max-w-7xl flex-col bg-glow">
      <SignalsBackdrop />
      <header className="ios-safe-top relative z-10 flex items-center justify-between px-5 pt-6 pb-3">
        <img
          src={logo}
          alt="MOPSENTRY EA"
          width={1328}
          height={316}
          loading="lazy"
          className="h-10 w-auto"
        />
        <Sheet>
          <SheetTrigger asChild>
            <button aria-label="Settings" className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
              <MoreVertical className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader><SheetTitle>Settings</SheetTitle></SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              <section>
                <p className="mb-2 text-sm font-medium">Theme</p>
                <ThemePicker />
              </section>
              <Link
                to="/account"
                className="flex items-center gap-3 rounded-xl border bg-card p-3 text-sm transition-colors hover:bg-accent"
              >
                <UserRound className="h-4 w-4 text-primary" />
                <span><span className="block font-medium">Account connection</span><span className="text-xs text-muted-foreground">Broker details and connection key</span></span>
                <Link2 className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
              <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground hover:bg-accent">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </header>
      <main className="relative z-10 flex-1 px-5 pb-40 md:px-8">
        <Outlet />
      </main>
      <nav aria-label="Main navigation" className="ios-safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto max-w-7xl border-t bg-card/95 px-5 pt-2 backdrop-blur-xl">
        <div className="grid grid-cols-4 items-end">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-14 flex-col items-center justify-center gap-1 pb-1 text-[11px] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              {label === "Robot" ? (
                <span className="grid h-11 w-11 -translate-y-2 place-items-center rounded-full border border-primary/50 bg-primary text-primary-foreground shadow-glow">
                  <Icon className="h-5 w-5" />
                </span>
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span className={label === "Robot" ? "-mt-2" : ""}>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
