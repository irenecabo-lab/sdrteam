import type { DataProvider } from "@/lib/types";
import { ManualProvider } from "./manual-provider";

// DATA_SOURCE=hubspot | manual (defaults to manual so the app always boots,
// even with no token configured yet).
export function getActiveProvider(): DataProvider {
  const source = process.env.DATA_SOURCE ?? "manual";
  if (source === "hubspot") {
    // Lazy import: hubspot-provider.ts touches process.env.HUBSPOT_PRIVATE_APP_TOKEN
    // at call time, not at module load, but keeping it dynamic avoids ever
    // bundling HubSpot fetch logic into a client build by accident.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HubSpotProvider } = require("./hubspot-provider");
    return new HubSpotProvider();
  }
  return new ManualProvider();
}
