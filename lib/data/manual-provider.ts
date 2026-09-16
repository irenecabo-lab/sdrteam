import fs from "node:fs/promises";
import path from "node:path";
import type { CompetitionSnapshot, DataProvider } from "@/lib/types";

// competition-data.json (gitignored - real data) falls back to the example
// fixture on first run so the app boots with something to look at even
// before anyone has touched /admin.
const DATA_DIR = path.join(process.cwd(), "data");
const LIVE_FILE = path.join(DATA_DIR, "competition-data.json");
const EXAMPLE_FILE = path.join(DATA_DIR, "competition-data.example.json");

export class ManualProvider implements DataProvider {
  async getSnapshot(): Promise<CompetitionSnapshot> {
    const raw = await this.readFile();
    return {
      generatedAt: new Date().toISOString(),
      source: "manual",
      dailyActivity: raw.dailyActivity ?? [],
      dealStageEvents: raw.dealStageEvents ?? [],
      meetings: raw.meetings ?? [],
      pipelineDeals: raw.pipelineDeals ?? [],
    };
  }

  private async readFile(): Promise<any> {
    try {
      const text = await fs.readFile(LIVE_FILE, "utf-8");
      return JSON.parse(text);
    } catch {
      const text = await fs.readFile(EXAMPLE_FILE, "utf-8");
      return JSON.parse(text);
    }
  }
}
