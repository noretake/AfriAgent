import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AgentResponse } from "../../../shared/types";
import { ApprovalCard } from "../components/ApprovalCard";
import { PolicyChecks } from "../components/PolicyChecks";
import { StatusBadge } from "../components/StatusBadge";
import { useInvalidateFinancial } from "../hooks/useApi";
import { api, ApiError } from "../services/api";
import { usd } from "../utils/format";

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: AgentResponse;
  error?: boolean;
}

const suggestions = ["What is my balance?", "Show my portfolio", "Analyze BTC market", "Buy $40 of BTC", "Buy $80 of BTC", "Why was my last transaction blocked?"];

export function CopilotPage() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidateFinancial();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setItems((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: message }]);
    try {
      const response = await api.sendMessage(message, sessionId);
      setSessionId(response.sessionId);
      setItems((prev) => [...prev, { id: response.messageId, role: "assistant", text: response.message, response }]);
      if (response.intent?.type === "TRADE") await invalidate();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "The backend did not respond.";
      setItems((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: msg, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const onApprovalDone = (message: string, ok: boolean) => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: message, error: !ok }]);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">AI Copilot</h1>
        <p className="text-sm text-slate-400">
          Every request becomes a structured intent, validated and evaluated by the deterministic Policy Engine before anything executes.
        </p>
      </header>

      <div className="card flex-1 space-y-4 overflow-y-auto">
        {items.length === 0 && (
          <div className="space-y-3 text-sm text-slate-400">
            <p>Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} className="btn-secondary text-xs" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] space-y-3 rounded-xl px-4 py-3 text-sm ${item.role === "user" ? "bg-brand-600/30 text-brand-50" : item.error ? "border border-rose-900 bg-rose-950/40 text-rose-100" : "bg-slate-800 text-slate-100"}`}>
              <div className="whitespace-pre-wrap">{item.text}</div>
              {item.response && <ResponseDetails response={item.response} onApprovalDone={onApprovalDone} />}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-slate-500">AfriAgent is thinking…</div>}
        <div ref={bottom} />
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input className="input" placeholder='e.g. "Buy $40 of BTC"' value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} />
        <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
          <Send className="h-4 w-4" /> Send
        </button>
      </form>
    </div>
  );
}

function ResponseDetails({ response, onApprovalDone }: { response: AgentResponse; onApprovalDone: (m: string, ok: boolean) => void }) {
  const { intent, policy, approval, transaction, data } = response;
  return (
    <div className="space-y-3 border-t border-slate-700 pt-3">
      {intent && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>Intent:</span>
          <StatusBadge value={intent.type} />
          {intent.type === "TRADE" && (
            <span className="text-slate-200">
              {intent.action} {usd(intent.amountUsd)} of {intent.asset}
            </span>
          )}
          <span className="ml-auto">parser: {response.parser}</span>
        </div>
      )}
      {policy && <PolicyChecks result={policy} />}
      {approval && <ApprovalCard approval={approval} onDone={onApprovalDone} />}
      {transaction && !approval && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Transaction</span>
          <StatusBadge value={transaction.status} />
          {transaction.executionLabel && <StatusBadge value={transaction.executionLabel} />}
          {transaction.externalTransactionId && <span className="font-mono text-slate-400">{transaction.externalTransactionId}</span>}
        </div>
      )}
      {data?.market && (
        <div className="text-xs text-slate-400">
          24h change {data.market.change24h}% · volume {usd(data.market.volume24h, 0)}
        </div>
      )}
    </div>
  );
}
