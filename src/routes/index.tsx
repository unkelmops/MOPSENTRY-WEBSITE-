import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, ArrowRight, ArrowUpRight, CandlestickChart,
  CheckCircle2, Cloud, CreditCard, LockKeyhole, MonitorSmartphone,
  ShieldCheck, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-mopsentry-a-clean.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOPSENTRY — Trading intelligence, in control" },
      { name: "description", content: "Explore MOPSENTRY, understand how the MT5 command centre works, and compare app, signals and VPS access." },
      { property: "og:title", content: "MOPSENTRY — Trading intelligence, in control" },
      { property: "og:description", content: "Explore the app before choosing your MOPSENTRY access." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Activity, title: "Trading overview", text: "See your MT5 connection, account snapshot, open positions and pending orders when your EA is connected." },
  { icon: Zap, title: "Robot controls", text: "Monitor your MOPSENTRY EA and manage supported robot settings from the app." },
  { icon: CandlestickChart, title: "Fundamental intelligence", text: "Understand selected high-impact USD releases, historical context and the possible market bias." },
];

const steps = [
  { number: "01", title: "Explore first", text: "Browse the product tour and understand the dashboard, robot controls, signals and hosting options. No account or payment is needed to view this page." },
  { number: "02", title: "Choose your access", text: "MOPSENTRY access is R500 for 12 months and includes the EA, mobile app, economic signals and e-book. VPS hosting is separate." },
  { number: "03", title: "Connect your setup", text: "Create your account, arrange your 12-month access, connect your MT5 terminal and follow the setup instructions. Your EA runs on MT5, not inside your phone." },
];

function Index() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute right-[-10rem] top-[35rem] h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="MOPSENTRY home"><img src={logo} alt="MOPSENTRY" width={1328} height={316} className="h-9 w-auto sm:h-11" /></Link>
          <nav className="flex items-center gap-4 text-xs font-medium text-slate-300 sm:gap-6 sm:text-sm">
            <a href="#features" className="hidden hover:text-white sm:inline">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <Link to="/vps" className="hidden hover:text-white sm:inline">Managed VPS</Link>
            <Button asChild size="sm" className="rounded-xl bg-blue-500 text-white hover:bg-blue-400"><Link to="/auth">Login / Register</Link></Button>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
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
              <Button asChild size="lg" className="h-12 rounded-xl bg-blue-500 px-7 font-semibold text-white shadow-[0_0_32px_rgba(59,130,246,0.35)] hover:bg-blue-400">
                <Link to="/auth">Explore App <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-white/20 bg-white/5 px-7 text-white hover:bg-white/10 hover:text-white">
                <a href="#pricing">View pricing</a>
              </Button>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-6">
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

        <section id="features" className="grid gap-3 border-t border-white/10 py-10 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition-colors hover:border-blue-300/30 hover:bg-blue-400/[0.06]">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-300/20 bg-blue-400/10 text-blue-200"><Icon className="h-5 w-5" /></div>
              <h2 className="mt-4 font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </div>
          ))}
        </section>

        <section id="how-it-works" className="scroll-mt-8 border-t border-white/10 py-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Getting started</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">See how MOPSENTRY works</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">You can read this guide and explore the product before creating an account or making a payment.</p>
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
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-400/[0.06] p-4">
            <MonitorSmartphone className="h-5 w-5 text-cyan-300" />
            <p className="flex-1 text-sm text-slate-300">The EA executes trades on your MT5 terminal. MOPSENTRY is the app for monitoring and supported remote controls.</p>
            <ShieldCheck className="h-5 w-5 text-cyan-300" />
          </div>
        </section>


        <section id="pricing" className="scroll-mt-8 border-t border-white/10 py-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Access & services</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Choose your MOPSENTRY setup</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Clear packages. Know exactly what you receive before you pay. VPS hosting is optional and billed separately.</p>
          </div>
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            <article className="flex flex-col rounded-2xl border border-blue-400/50 bg-gradient-to-b from-blue-500/15 to-white/[0.025] p-5 shadow-[0_0_45px_rgba(59,130,246,0.14)]">
              <div className="flex items-center gap-2 text-cyan-200"><MonitorSmartphone className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">MOPSENTRY Access</span></div>
              <p className="mt-5 text-4xl font-black">R500</p><p className="mt-1 text-sm text-slate-400">12 months · renew for R500</p>
              <p className="mt-4 text-sm leading-6 text-slate-300">Your complete MOPSENTRY package, bringing the EA, mobile command centre and learning resources together.</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> MOPSENTRY EA access</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> MOPSENTRY mobile app access</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> Fundamental economic signals</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> MOPSENTRY e-book and setup guidance</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> 12-month access period; renew for another year</li>
              </ul>
              <Button asChild className="mt-7 w-full rounded-xl bg-blue-500 text-white hover:bg-blue-400"><Link to="/auth">Register / Sign in <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
            </article>
            <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center gap-2 text-cyan-200"><Cloud className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">VPS Monthly</span></div>
              <p className="mt-5 text-4xl font-black">R200</p><p className="mt-1 text-sm text-slate-400">Per month</p>
              <p className="mt-4 text-sm leading-6 text-slate-300">A managed Windows VPS subscription for one MT5 terminal, with setup and renewal coordination by MOPSENTRY.</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> VPS hosting for MT5 and the EA</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> Initial VPS configuration assistance</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> Billed separately from MOPSENTRY access</li>
              </ul>
              <div className="mt-auto pt-7"><Button asChild variant="outline" className="w-full rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link to="/vps">Explore managed VPS <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
            </article>
            <article className="flex flex-col rounded-2xl border border-cyan-300/30 bg-gradient-to-b from-cyan-500/10 to-white/[0.025] p-5">
              <div className="flex items-center gap-2 text-cyan-200"><Cloud className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">VPS 3 Months</span></div>
              <p className="mt-5 text-4xl font-black">R500</p><p className="mt-1 text-sm text-slate-400">3 months · save R100</p>
              <p className="mt-4 text-sm leading-6 text-slate-300">A lower monthly equivalent for customers who want to arrange VPS hosting for three months at a time.</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-300">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> Three months of VPS hosting</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> Initial VPS configuration assistance</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" /> One payment for the three-month period</li>
              </ul>
              <div className="mt-auto pt-7"><Button asChild variant="outline" className="w-full rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><a href="#how-it-works">Enquire about VPS <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div>
            </article>
          </div>
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-200"><ShieldCheck className="h-4 w-4" /> Important trading disclaimer</div>
            <p className="mt-2 text-xs leading-6 text-slate-400">Trading Forex, CFDs and other leveraged financial products involves substantial risk and may not be suitable for every person. You can lose some or all of your capital. MOPSENTRY is a software and educational tool, not a financial adviser. Economic signals are informational market commentary, not trade instructions or guarantees. Past performance does not guarantee future results, and no profit is promised. You remain responsible for your trading decisions, broker conditions and risk management.</p>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Access terms, payment confirmation, renewal and refund conditions will be shown before checkout. Online payment and automatic access activation are not yet enabled; do not treat this page as a completed purchase flow.</p>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MOPSENTRY</span>
          <span>Trading involves risk. Market signals are informational, not guarantees.</span>
        </footer>
      </div>
    </main>
  );
}
