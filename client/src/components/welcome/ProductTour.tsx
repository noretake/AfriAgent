import { AnimatePresence, motion } from "framer-motion";
import { Activity, Bot, Check, ClipboardCheck, LayoutDashboard, ScrollText, Shield, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

const STEP_MS = 4200;

const steps = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, title: "See your portfolio at a glance", blurb: "Live balances and prices from Binance, plus how much of today's limit is left." },
  { key: "copilot", label: "AI Copilot", icon: Bot, title: "Ask in plain language", blurb: "“Buy $40 of BTC” becomes a validated, structured intent — nothing runs yet." },
  { key: "approvals", label: "Approvals", icon: ClipboardCheck, title: "Policies decide, you approve", blurb: "Deterministic limits block or hold trades. Approve within 10 minutes or it expires." },
  { key: "audit", label: "Audit Log", icon: ScrollText, title: "Every step on the record", blurb: "Intent, policy verdict, approval and the exchange order ID — immutable and per-user." },
] as const;

type StepKey = (typeof steps)[number]["key"];

const nav = [
  { label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { label: "AI Copilot", icon: Bot, key: "copilot" },
  { label: "Approvals", icon: ClipboardCheck, key: "approvals" },
  { label: "Transactions", icon: Activity, key: "" },
  { label: "Policies", icon: Shield, key: "" },
  { label: "Audit Log", icon: ScrollText, key: "audit" },
  { label: "Security", icon: ShieldAlert, key: "" },
];

const rise = { hidden: { opacity: 0, y: 10 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.12 } }) };

function MockCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-800 bg-slate-900/80 p-3 ${className}`}>{children}</div>;
}

function DashboardScreen() {
  const bars = [62, 40, 78, 55, 90, 70, 48];
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        ["Portfolio value", "$10,431.20"],
        ["Daily limit left", "$160 / $200"],
        ["Pending approvals", "1"],
      ].map(([k, v], i) => (
        <motion.div key={k} custom={i} variants={rise} initial="hidden" animate="show">
          <MockCard>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">{v}</div>
          </MockCard>
        </motion.div>
      ))}
      <motion.div custom={3} variants={rise} initial="hidden" animate="show" className="col-span-2">
        <MockCard>
          <div className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">Holdings</div>
          <div className="flex h-20 items-end gap-2">
            {bars.map((h, i) => (
              <motion.div key={i} className="flex-1 rounded-t bg-brand-500/70" initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.5 + i * 0.07, type: "spring", stiffness: 120 }} />
            ))}
          </div>
        </MockCard>
      </motion.div>
      <motion.div custom={4} variants={rise} initial="hidden" animate="show">
        <MockCard className="h-full">
          <div className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">Prices</div>
          {[
            ["BTC", "$67,420"],
            ["ETH", "$3,512"],
            ["SOL", "$148"],
          ].map(([a, p]) => (
            <div key={a} className="flex justify-between py-0.5 text-xs">
              <span className="text-slate-300">{a}</span>
              <span className="text-slate-400">{p}</span>
            </div>
          ))}
        </MockCard>
      </motion.div>
    </div>
  );
}

function CopilotScreen() {
  return (
    <div className="space-y-3">
      <motion.div custom={0} variants={rise} initial="hidden" animate="show" className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-brand-500 px-3 py-2 text-xs text-slate-950">Buy $40 of BTC</div>
      </motion.div>
      <motion.div custom={1} variants={rise} initial="hidden" animate="show" className="flex gap-2">
        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800">
          <Bot className="h-3.5 w-3.5 text-brand-400" />
        </div>
        <div className="max-w-[85%] space-y-2 rounded-2xl rounded-bl-sm bg-slate-800 px-3 py-2 text-xs text-slate-200">
          <p>Understood. Here is the structured intent I will submit for policy review:</p>
          <pre className="rounded bg-slate-950/70 p-2 font-mono text-[10px] leading-snug text-brand-200">
            {`{ "action": "BUY", "asset": "BTC",\n  "amountUsd": 40, "confidence": 0.98 }`}
          </pre>
          <p className="text-slate-400">Policy check passed (max $50/trade). Awaiting your approval.</p>
        </div>
      </motion.div>
      <motion.div custom={2} variants={rise} initial="hidden" animate="show">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-500">
          <span className="flex-1">Ask AfriAgent…</span>
          <span className="rounded bg-brand-500 px-2 py-0.5 text-[10px] font-medium text-slate-950">Send</span>
        </div>
      </motion.div>
    </div>
  );
}

function ApprovalsScreen() {
  const [approved, setApproved] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setApproved(true), 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="space-y-3">
      <motion.div custom={0} variants={rise} initial="hidden" animate="show">
        <MockCard className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">BUY $40 of BTC</div>
            <motion.span
              layout
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${approved ? "bg-brand-500/20 text-brand-300" : "bg-amber-500/20 text-amber-300"}`}
            >
              {approved ? "APPROVED → EXECUTING" : "PENDING · expires in 9:41"}
            </motion.span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400">
            <div>
              Per-trade limit <span className="text-slate-200">$40 / $50</span>
            </div>
            <div>
              Daily used <span className="text-slate-200">$40 / $200</span>
            </div>
            <div>
              Exposure <span className="text-slate-200">0.4%</span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <motion.button
              type="button"
              className="flex items-center gap-1 rounded bg-brand-500 px-3 py-1 text-[11px] font-medium text-slate-950"
              animate={approved ? { scale: [1, 0.94, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Check className="h-3 w-3" /> Approve
            </motion.button>
            <span className="flex items-center gap-1 rounded border border-slate-700 px-3 py-1 text-[11px] text-slate-300">
              <X className="h-3 w-3" /> Reject
            </span>
          </div>
        </MockCard>
      </motion.div>
      <motion.div custom={1} variants={rise} initial="hidden" animate="show">
        <MockCard className="flex items-center justify-between opacity-70">
          <div>
            <div className="text-sm font-semibold">BUY $80 of BTC</div>
            <div className="text-[10px] text-slate-400">Exceeds max $50 per transaction</div>
          </div>
          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-medium text-rose-300">BLOCKED</span>
        </MockCard>
      </motion.div>
    </div>
  );
}

function AuditScreen() {
  const rows = [
    ["AGENT_MESSAGE", "“Buy $40 of BTC”"],
    ["INTENT_PARSED", "BUY BTC $40 (0.98)"],
    ["POLICY_EVALUATED", "PASS · requires approval"],
    ["APPROVAL_GRANTED", "by you · 2s ago"],
    ["ORDER_EXECUTED", "Binance #12196999 · LIVE_EXECUTED"],
  ];
  return (
    <MockCard className="divide-y divide-slate-800 p-0">
      {rows.map(([type, detail], i) => (
        <motion.div key={type} custom={i} variants={rise} initial="hidden" animate="show" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-xs sm:flex-nowrap">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          <span className="font-mono text-[10px] text-slate-400 sm:w-36 sm:shrink-0">{type}</span>
          <span className="min-w-0 break-words text-slate-200 sm:truncate">{detail}</span>
        </motion.div>
      ))}
    </MockCard>
  );
}

const screens: Record<StepKey, () => JSX.Element> = {
  dashboard: DashboardScreen,
  copilot: CopilotScreen,
  approvals: ApprovalsScreen,
  audit: AuditScreen,
};

/** Auto-playing, click-to-jump animated walkthrough of the app's main screens. */
export function ProductTour() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const step = steps[index];
  const Screen = screens[step.key];

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % steps.length), STEP_MS);
    return () => clearTimeout(t);
  }, [index, paused]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const active = i === index;
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                className={`relative w-full overflow-hidden rounded-xl border p-4 text-left transition ${active ? "border-brand-700 bg-slate-900" : "border-slate-800 bg-slate-950/40 hover:border-slate-700"}`}
              >
                <div className="flex items-center gap-3">
                  <s.icon className={`h-5 w-5 ${active ? "text-brand-400" : "text-slate-500"}`} />
                  <div>
                    <div className={`text-sm font-semibold ${active ? "text-white" : "text-slate-300"}`}>{s.title}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{s.blurb}</div>
                  </div>
                </div>
                {active && !paused && (
                  <motion.div key={index} className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-500" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: STEP_MS / 1000, ease: "linear" }} style={{ originX: 0 }} />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-1.5 border-b border-slate-800 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <span className="ml-3 rounded bg-slate-900 px-2 py-0.5 text-[10px] text-slate-500">afriagent.vercel.app/{step.key === "dashboard" ? "" : step.key}</span>
        </div>
        <div className="flex min-h-[300px]">
          <aside className="hidden w-36 shrink-0 border-r border-slate-800 p-2 sm:block">
            <div className="mb-3 flex items-center gap-1.5 px-2 pt-1">
              <Activity className="h-3.5 w-3.5 text-brand-400" />
              <span className="text-xs font-semibold">AfriAgent</span>
            </div>
            <nav className="relative space-y-0.5">
              {nav.map((n) => {
                const active = n.key === step.key;
                return (
                  <div key={n.label} className="relative flex items-center gap-2 rounded px-2 py-1.5 text-[11px] text-slate-400">
                    {active && <motion.div layoutId="tour-nav" className="absolute inset-0 rounded bg-slate-800" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                    <n.icon className={`relative h-3 w-3 ${active ? "text-white" : ""}`} />
                    <span className={`relative ${active ? "text-white" : ""}`}>{n.label}</span>
                  </div>
                );
              })}
            </nav>
          </aside>
          <div className="min-w-0 flex-1 p-4">
            <AnimatePresence mode="wait">
              <motion.div key={step.key} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
                <div className="mb-3 text-sm font-semibold">{step.label}</div>
                <Screen />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
