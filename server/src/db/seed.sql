-- AfriAgent demo seed. Safe to re-run.
-- Demo portfolio balances (BTC 0.0098, ETH 0.14, USDT 280.52) live in the
-- MockBinanceService (the demo exchange), not in the database, mirroring how a
-- real exchange owns custody while the app owns policies, intents and history.

insert into users (id, email, name)
values ('00000000-0000-4000-8000-000000000001', 'demo@afriagent.local', 'Demo User')
on conflict (email) do nothing;

insert into policies (
  user_id, max_transaction_usd, daily_limit_usd, max_portfolio_exposure,
  allowed_assets, require_approval, risk_tolerance, version
)
values (
  '00000000-0000-4000-8000-000000000001', 50, 100, 30,
  '["BTC", "ETH", "USDT"]'::jsonb, true, 'conservative', 1
)
on conflict (user_id) do nothing;

insert into security_state (user_id, emergency_stop)
values ('00000000-0000-4000-8000-000000000001', false)
on conflict (user_id) do nothing;
