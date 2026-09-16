// Re-exported with the names hubspot-provider.ts expects. Kept as a thin
// wrapper so config/hubspot-stages.config.ts stays the single source of
// truth for the actual IDs.
import { SPAIN_PIPELINE_ID, STAGE_IDS } from "@/config/hubspot-stages.config";

export { SPAIN_PIPELINE_ID };
export const STAGE_TRANSITION_STAGE_IDS = STAGE_IDS;
