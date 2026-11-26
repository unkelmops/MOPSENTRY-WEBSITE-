import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, ArrowRight, ArrowUpRight, CandlestickChart, CheckCircle2,
  Cloud, LockKeyhole, MonitorSmartphone, ShieldCheck, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import logo from "@/assets/logo-mopsentry-a-clean.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOPSENTRY — Trading intelligence, in control" },
      { name: "description", content: "Explore MOPSENTRY, understand the MT5 command centre and discover managed VPS hosting." },
      { property: "og:title", content: "MOPSENTRY — Trading intelligence, in control" },
      { property: "og:description", content: "Explore the MOPSENTRY app, access and managed VPS hosting." },
    ],
  }),
  component: Index,
});

function InfoDialog({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-9 rounded-xl px-3 text-slate-300 hover:bg-white/10 hover:text-white">{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border border-blue-300/20 bg-[#0b1220] text-white shadow-[0_25px_100px_rgba(0,0,0,0.7)] sm:max-w-xl">
        <DialogHeader className="pr-7 text-left">
          <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-400">{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Index() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute right-[-10rem] top-[35rem] h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" aria-label="MOPSENTRY home"><img src={logo} alt="MOPSENTRY" width={1328} height={316} className="h-9 w-auto sm:h-11" /></Link>
          <nav className="flex items-center gap-1 text-xs font-medium sm:gap-2 sm:text-sm">
            <InfoDialog label="How it works" title="Your MOPSENTRY setup" description="A clear command centre for your MT5 robot and market information.">
              <div className="grid gap-3">
                {[
                  ["01", "Connect MT5", "Install the MOPSENTRY EA in your MT5 terminal and connect it to your account."],
                  ["02", "Manage in the app", "View connection status, positions, pending orders, robot controls and supported settings."],
                  ["03", "Stay informed", "Review economic-event context and market information from the MOPSENTRY command centre."],
                ].map(([number, title, text]) => <div key={number} className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs font-bold text-cyan-300">{number}</p><h3 className="mt-1 font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{text}</p></div>)}
              </div>
              <p className="text-xs leading-5 text-slate-500">The EA executes on MT5, not inside your phone. MOPSENTRY is the monitoring and supported remote-control app.</p>
              <Button asChild className="w-full rounded-xl bg-blue-500 text-white hover:bg-blue-400"><Link to="/auth">Explore the app <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
            </InfoDialog>
            <InfoDialog label="Pricing" title="MOPSENTRY access" description="See what is included before you register.">
              <div className="rounded-xl border border-blue-300/25 bg-blue-400/[0.07] p-4">
                <div className="flex items-center gap-2 text-cyan-200"><MonitorSmartphone className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Annual access</span></div>
                <p className="mt-3 text-3xl font-black">R500 <span className="text-sm font-medium text-slate-400">/ 12 months</span></p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {["MOPSENTRY EA access", "Mobile command centre", "Fundamental economic signals", "E-book and setup guidance"].map(item => <li key={item} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" />{item}</li>)}
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center gap-2 text-cyan-200"><Cloud className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Managed VPS</span></div>
                <p className="mt-2 text-sm leading-6 text-slate-300">Optional Windows VPS packages are listed separately. VPS order requests are open; card and bank / EFT payment options are being prepared.</p>
                <Button asChild variant="outline" className="mt-3 w-full rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link to="/vps">View VPS packages <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </div>
              <Button asChild className="w-full rounded-xl bg-blue-500 text-white hover:bg-blue-400"><Link to="/auth">Register / sign in <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
            </InfoDialog>
            <Link to="/vps" className="hidden rounded-xl px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white sm:inline-flex">VPS</Link>
            <Button asChild size="sm" className="ml-1 rounded-xl bg-blue-500 text-white hover:bg-blue-400"><Link to="/auth">Login / Register</Link></Button>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
              Your trading world. One clear view.
            </div>
            <h1 className="mt-7 text-5xl font-black leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Stay ahead.
              <span className="mt-2 block bg-gradient-to-r from-blue-300 via-cyan-200 to-sky-400 bg-clip-text text-transparent">Stay in control.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              MOPSENTRY brings your MT5 robot, trading activity and important market events into one focused command centre. Explore how it works before you decide what to purchase.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <InfoDialog label="Explore App" title="Inside the MOPSENTRY app" description="Your MT5 command centre, designed to keep the important information close.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    [Activity, "Trading overview", "Connection status, account snapshot, open positions and pending orders."],
                    [Zap, "Robot controls", "Monitor your EA and manage supported robot settings."],
                    [CandlestickChart, "Market intelligence", "Review selected high-impact USD events and market context."],
                    [LockKeyhole, "Account access", "Sign in to access your own MOPSENTRY workspace and connected setup."],
                  ].map(([Icon, title, text]) => {
                    const FeatureIcon = Icon as typeof Activity;
                    return <div key={title as string} className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><FeatureIcon className="h-5 w-5 text-cyan-300" /><h3 className="mt-2 text-sm font-semibold">{title as string}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{text as string}</p></div>;
                  })}
                </div>
                <Button asChild className="w-full rounded-xl bg-blue-500 text-white hover:bg-blue-400"><Link to="/auth">Continue to sign in <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </InfoDialog>
              <InfoDialog label="How VPS works" title="Managed VPS, made simple" description="A Windows VPS keeps your MT5 terminal running remotely, even when your personal computer is switched off.">
                <div className="space-y-3">
                  {[
                    ["01", "Choose a package", "Compare the five Windows VPS tiers on the MOPSENTRY VPS page."],
                    ["02", "Place your request", "Choose a package and send an order request directly to MOPSENTRY. Payment is not collected until availability, final pricing and fulfilment are confirmed."],
                    ["03", "Setup and support", "MOPSENTRY coordinates the hosting subscription and helps with your initial MT5 setup."],
                  ].map(([number, title, text]) => <div key={number} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4"><span className="text-xs font-bold text-cyan-300">{number}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p></div></div>)}
                </div>
                <p className="text-xs leading-5 text-amber-200/80">VPS order requests are open. Payment integration is still in progress; submitting a request does not take payment or guarantee immediate provisioning.</p>
                <Button asChild className="w-full rounded-xl bg-blue-500 text-white hover:bg-blue-400"><Link to="/vps">Explore VPS packages <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </InfoDialog>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-6">
              <div><p className="text-xl font-bold text-white">01</p><p className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">Monitor</p></div>
              <div><p className="text-xl font-bold text-white">02</p><p className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">Understand</p></div>
              <div><p className="text-xl font-bold text-white">03</p><p className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">Stay in control</p></div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div aria-hidden="true" className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-transparent blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/15 bg-gradient-to-br from-white/[0.12] to-white/[0.035] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-[#0b1220]/95 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div><p className="text-xs font-semibold tracking-[0.18em] text-blue-200">MOPSENTRY</p><p className="mt-1 text-[11px] text-slate-500">Trading overview preview</p></div>
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-slate-300">PRODUCT TOUR</div>
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div><p className="text-xs text-slate-400">Your MT5 connection</p><p className="mt-1 text-2xl font-bold">Your account</p></div>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-blue-200"><Zap className="h-5 w-5" /></div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Open positions</p><p className="mt-2 text-2xl font-bold">—</p><p className="mt-1 text-[10px] text-slate-500">Connect MT5 to view</p></div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Pending orders</p><p className="mt-2 text-2xl font-bold">—</p><p className="mt-1 text-[10px] text-slate-500">Connect MT5 to view</p></div>
                </div>
                <div className="mt-4 rounded-2xl border border-blue-400/15 bg-gradient-to-r from-blue-500/10 to-cyan-400/5 p-4">
                  <div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-200">Fundamental Signals</p><span className="text-[10px] text-cyan-200">Included with MOPSENTRY access</span></div>
                  <div className="mt-4 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-400/10 text-blue-200"><LockKeyhole className="h-4 w-4" /></div><div><p className="text-xs font-medium">Economic event analysis</p><p className="mt-1 text-[10px] text-slate-500">Included with your annual access</p></div></div>
                </div>
                <p className="mt-5 text-center text-[9px] uppercase tracking-[0.2em] text-slate-600">Illustrative preview · no sample account data</p>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-2xl border border-white/15 bg-[#101a2a]/95 px-4 py-3 text-xs text-slate-200 shadow-xl sm:flex"><Activity className="h-4 w-4 text-cyan-300" /> Explore before you purchase</div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MOPSENTRY</span>
          <span>Trading involves risk. Market information is informational, not a guarantee.</span>
        </footer>
      </div>
    </main>
  );
}
