/**
 * Quick integration test — runs the full Tania pipeline locally.
 * Usage: node scripts/test-pipeline.js
 *
 * Make sure .env is loaded (use dotenv or set vars in shell).
 */

import { runTaniaPipeline } from "../index.js";

console.log("🎬 Starting Tania pipeline test...\n");

try {
  const result = await runTaniaPipeline({
    theme: "supra_nights",
    visualStyle: "cinematic_rain",
    extraContext: "Late Tuesday night, rain on the 121, no destination.",
  });

  console.log("\n✅ Pipeline complete:");
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error("\n❌ Pipeline failed:", err.message);
  process.exit(1);
}
