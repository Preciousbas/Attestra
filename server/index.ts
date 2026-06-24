import { createApp } from "./app.ts";
import { config } from "./config.ts";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Attestra API listening on http://localhost:${config.port}`);
  if (!config.compute.apiKey) {
    console.warn("⚠ ZG_COMPUTE_API_KEY not set — /signals/generate will return 503");
  }
});
