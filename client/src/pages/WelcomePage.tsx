import { motion } from "framer-motion";
import { Activity, ArrowRight, Bot, ClipboardCheck, Database, Lock, MessageSquareText, Octagon, ScrollText, Shield, Zap } from "lucide-react";
import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { ProductTour } from "../components/welcome/ProductTour";

const HeroScene = lazy(() => import("../components/welcome/HeroScene").then((m) => ({ default: m.HeroScene })));

const flow = [
  { icon: MessageSquareText, title: "1. Ask", text: "Type a question or a request in plain language: “What’s my BTC exposure?” or “Buy $40 of ETH”." },
  { icon: Bot, title: "2. Understand", text: "The agent turns it into a structured, schema-validated intent. It can read data — it can never execute on its own." },
  { icon: Shield, title: "3. Policy check", text: "Deterministic rules enforce per-trade and daily limits, portfolio exposure, an asset allowlist and your risk level." },
  { icon: ClipboardCheck, title: "4. You approve", text: "Trades wait for your explicit approval and expire after 10 minutes. Blocked trades never reach the exchange." },
  { icon: Zap, title: "5. Execute & audit", text: "Approved orders go to Binance and are recorded with the real order ID. Every step lands in an immutable audit log." },
];

const guarantees = [
  { icon: Octagon, title: "Emergency stop", text: "One switch halts all execution instantly while keeping read-only access." },
  { icon: Lock, title: "Your account, your data", text: "Sign in with email, Google, GitHub or an Ethereum wallet. Policies, approvals and history are private per user." },
  { icon: Database, title: "Nothing fabricated", text: "Balances, prices and order IDs come straight from the exchange. No confirmation, no claim of execution." },
  { icon: ScrollText, title: "Testnet first", text: "Practise on Binance Spot Testnet with play funds before real money is ever involved." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function WelcomePage({ signedIn, configured }: { signedIn: boolean; configured: boolean }) {
  const ctaTo = signedIn || !configured ? "/" : "/login";
  const ctaLabel = signedIn ? "Open dashboard" : configured ? "Get started" : "Try the demo";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-brand-400" />
            <span className="text-lg font-semibold">AfriAgent</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#how" className="hover:text-white">
              How it works
            </a>
            <a href="#tour" className="hover:text-white">
              Tour
            </a>
            <a href="#safety" className="hover:text-white">
              Safety
            </a>
          </nav>
          <Link to={ctaTo} className="btn-primary px-4 py-1.5 text-sm">
            {signedIn ? "Dashboard" : configured ? "Sign in" : "Open app"}
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.18),transparent_55%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
            <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-brand-800 bg-brand-950/40 px-3 py-1 text-xs text-brand-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" /> Human-in-the-loop trading agent for Binance
            </motion.span>
            <motion.h1 variants={fadeUp} className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              AI that acts.
              <br />
              <span className="text-brand-400">You stay in control.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 max-w-lg text-lg text-slate-300">
              AfriAgent turns plain-language requests into validated trade intents, runs them through your own deterministic policies, and executes on Binance only after you
              approve — with every step audited.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Link to={ctaTo} className="btn-primary px-5 py-2.5">
                {ctaLabel} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#tour" className="btn-secondary px-5 py-2.5">
                Watch the tour
              </a>
            </motion.div>
            <motion.dl variants={fadeUp} className="mt-10 grid grid-cols-3 gap-4 text-sm">
              {[
                ["0", "trades without approval"],
                ["10 min", "approval window"],
                ["100%", "actions audited"],
              ].map(([v, k]) => (
                <div key={k}>
                  <dt className="text-2xl font-semibold text-white">{v}</dt>
                  <dd className="text-slate-400">{k}</dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="h-[360px] md:h-[480px]">
            <Suspense fallback={<div className="h-full w-full animate-pulse rounded-full bg-slate-900/60" />}>
              <HeroScene />
            </Suspense>
          </motion.div>
        </div>
      </section>

      <section id="how" className="border-t border-slate-800/80 bg-slate-950">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="max-w-2xl">
            <h2 className="text-3xl font-semibold">How it works</h2>
            <p className="mt-3 text-slate-400">The AI proposes. Your policies decide. You approve. The exchange confirms. In that order, every time.</p>
          </motion.div>
          <motion.ol
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="mt-10 grid gap-4 md:grid-cols-5"
          >
            {flow.map((f) => (
              <motion.li key={f.title} variants={fadeUp} className="card relative">
                <f.icon className="h-6 w-6 text-brand-400" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{f.text}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      <section id="tour" className="border-t border-slate-800/80 bg-gradient-to-b from-slate-950 to-slate-900/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="max-w-2xl">
            <h2 className="text-3xl font-semibold">A tour of the platform</h2>
            <p className="mt-3 text-slate-400">Follow one request — “Buy $40 of BTC” — from the Copilot to the audit log. Hover to pause, click a step to jump.</p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} className="mt-10">
            <ProductTour />
          </motion.div>
        </div>
      </section>

      <section id="safety" className="border-t border-slate-800/80">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="max-w-2xl">
            <h2 className="text-3xl font-semibold">Built for safety first</h2>
            <p className="mt-3 text-slate-400">The agent cannot approve its own actions, change your policies, or move funds off the exchange.</p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="mt-10 grid gap-4 sm:grid-cols-2"
          >
            {guarantees.map((g) => (
              <motion.div key={g.title} variants={fadeUp} className="card flex gap-4">
                <g.icon className="h-6 w-6 shrink-0 text-brand-400" />
                <div>
                  <h3 className="font-semibold">{g.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{g.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="border-t border-slate-800/80 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.15),transparent_60%)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold">Ready to put your agent to work?</h2>
          <p className="mt-3 max-w-xl text-slate-400">Start on Binance Testnet with conservative limits. Turn them up only when you are comfortable.</p>
          <Link to={ctaTo} className="btn-primary mt-8 px-6 py-3 text-base">
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        AfriAgent · Automate the way Binance works for you — through your agent.
      </footer>
    </div>
  );
}
