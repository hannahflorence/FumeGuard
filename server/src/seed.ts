import { DEFAULT_THRESHOLDS } from "@fumeguard/shared";
import { getDb } from "./firebase.js";

async function seed() {
  const db = getDb();
  await db.ref("config/thresholds").set(DEFAULT_THRESHOLDS);
  console.log("Seeded config/thresholds");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
