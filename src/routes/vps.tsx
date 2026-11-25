import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Clock3, CreditCard,
  Headset, MonitorDown, Server, ShieldCheck, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import logo from "@/assets/logo-mopsentry-a-clean.png";

export const Route = createFileRoute("/vps")({
  head: () => ({
    meta: [
      { title: "Managed VPS Hosting — MOPSENTRY" },
      { name: "description", content: "A managed Windows VPS for your MT5 terminal and MOPSENTRY EA, with subscription support from MOPSENTRY." },
    ],
  }),
  component: VpsPage,
});

const benefits = [
  { icon: Server, title: "Windows VPS hosting", text: "A remote Windows machine hosted in a data centre, designed to keep your MT5 terminal running." },
  { icon: MonitorDown, title: "One MT5 terminal", text: "One dedicated terminal for your MOPSENTRY setup, with initial installation assistance." },
  { icon: Headset, title: "Managed by MOPSENTRY", text: "We coordinate the VPS subscription, renewal reminders and setup support." },
];

const steps = [
  { number: "01", title: "Choose your VPS", text: "Select the monthly managed VPS package." },
  { number: "02", title: "Create your MOPSENTRY account", text: "Your subscription and VPS assignment will be linked to your account." },
  { number: "03", title: "Payment and provisioning", text: "After payment is verified, MOPSENTRY arranges your VPS and sends setup instructions securely." },
];

function VpsPage() {
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const startCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.message("Sign in to continue to VPS checkout.");
        await navigate({ to: "/auth" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("mopsentry-vps-checkout");
      if (error || !data?.action || !data?.fields) {
        throw new Error(data?.error || error?.message || "Could not start checkout.");
      }
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.action;
      Object.entries(data.fields as Record<string, string>).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute right-[-8rem] top-[32rem] h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.1] [background-image:linear-gradient(rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="MOPSENTRY home"><img src={logo} alt="MOPSENTRY" width={1328} height={316} className="h-9 w-auto sm:h-11" /></Link>
          <Button asChild size="sm" variant="outline" className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to home</Link>
          </Button>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1fr_0.8fr] lg:gap-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
              MOPSENTRY MANAGED HOSTING
            </div>
            <h1 className="mt-7 text-5xl font-black leading-[1.02] tracking-[-0.055em] sm:text-6xl">
              Your MT5 setup.
              <span className="mt-2 block bg-gradient-to-r from-blue-300 via-cyan-200 to-sky-400 bg-clip-text text-transparent">Always within reach.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Keep your MT5 terminal running on a remote Windows VPS while your personal computer is off. MOPSENTRY manages the hosting subscription and helps coordinate your setup.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-xl bg-blue-500 px-7 font-semibold text-white shadow-[0_0_32px_rgba(59,130,246,0.35)] hover:bg-blue-400">
                <Link to="/auth">Create account <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-white/20 bg-white/5 px-7 text-white hover:bg-white/10 hover:text-white">
                <a href="#how-it-works">How it works</a>
              </Button>
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">A VPS improves availability; it does not guarantee uninterrupted service, trading results or profits. Broker execution and market risks still apply.</p>
          </div>

          <aside className="relative mx-auto w-full max-w-md">
            <div aria-hidden="true" className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-transparent blur-2xl" />
            <div className="relative rounded-[2rem] border border-blue-300/25 bg-gradient-to-br from-blue-500/15 to-white/[0.035] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-200"><Server className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.18em]">Managed VPS · Monthly</span></div>
              <p className="mt-6 text-5xl font-black tracking-tight">R200<span className="ml-2 text-base font-medium text-slate-400">/ month</span></p>
              <p className="mt-1 text-[11px] text-cyan-200/80">Proposed launch price · subject to final reseller costs</p>
              <p className="mt-2 text-sm text-slate-400">One customer · One Windows VPS · One MT5 terminal</p>
              <div className="my-6 h-px bg-white/10" />
              <ul className="space-y-3 text-sm text-slate-200">
                {["Windows VPS hosting", "One MT5 terminal", "Initial setup assistance", "Subscription and renewal coordination", "Secure delivery of VPS access details"].map((item) => (
                  <li key={item} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />{item}</li>
                ))}
              </ul>
              <Button onClick={startCheckout} disabled={checkoutLoading} className="mt-8 h-11 w-full rounded-xl bg-blue-500 font-semibold text-white hover:bg-blue-400">
                {checkoutLoading ? "Preparing secure checkout…" : "Subscribe with PayFast"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="mt-3 text-center text-[10px] leading-5 text-slate-500">Recurring monthly subscriptions are processed by PayFast. Card payments only for recurring billing.</p>
            </div>
          </aside>
        </section>

        <section className="grid gap-3 border-t border-white/10 py-10 sm:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-300/20 bg-blue-400/10 text-blue-200"><Icon className="h-5 w-5" /></div>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </article>
          ))}
        </section>

        <section id="how-it-works" className="border-t border-white/10 py-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Simple subscription flow</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">How managed VPS works</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">You pay MOPSENTRY for the managed VPS subscription. We coordinate the hosting subscription with our VPS provider and manage your service status.</p>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <p className="text-sm font-bold text-cyan-300">{step.number}</p>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-200"><ShieldCheck className="h-4 w-4" /> Payment and service status</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">PayFast checkout is being prepared in sandbox mode. The displayed R200 is a proposed price, not a confirmed final tariff. A VPS is only ordered after MOPSENTRY verifies payment and confirms the reseller service. Your account will then show payment confirmation, renewal dates and VPS assignment status.</p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4" /> Secure payment integration planned</span>
            <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" /> Monthly renewal tracking planned</span>
            <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" /> Provisioning after verified payment</span>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MOPSENTRY</span>
          <span>Trading involves risk. VPS hosting does not guarantee trading performance.</span>
        </footer>
      </div>
    </main>
  );
}
