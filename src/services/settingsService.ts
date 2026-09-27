import { clone, db, simulateLatency } from "@/api/mockDb";
import type { AppSettings } from "@/types/models";

export const settingsService = {
  async get(): Promise<AppSettings> {
    await simulateLatency(50, 120);
    return clone(db.read().settings);
  },
  async update(input: AppSettings): Promise<AppSettings> {
    await simulateLatency();
    return db.write((data) => {
      data.settings = { ...input };
      return clone(data.settings);
    });
  },
  /** Restores the original demo dataset. */
  async resetDemoData(): Promise<void> {
    await simulateLatency(300, 600);
    db.reset();
  },
};
