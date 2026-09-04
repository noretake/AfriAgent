import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createServices } from "./services.js";

async function main() {
  const services = await createServices();
  const app = createApp(services);

  app.listen(env.PORT, () => {
    console.log(`AfriAgent API listening on http://localhost:${env.PORT}`);
    console.log(`  mode:     ${services.demoMode ? "DEMO" : "LIVE"} (exchange: ${services.exchange.name})`);
    console.log(`  storage:  ${services.store.kind}`);
    console.log(`  ai:       ${services.agent.parserName}`);
    console.log(`  client:   ${env.CLIENT_URL}`);
  });
}

main().catch((err) => {
  console.error("Failed to start AfriAgent server:", err);
  process.exit(1);
});
