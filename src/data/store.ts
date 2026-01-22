import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, InspectionSettings } from "../settings";
import {
  InspectionDatabase,
  createEmptyDatabase,
  databaseToSettings,
  settingsToDatabase,
} from "./schema";

interface StoredDataV1 {
  schemaVersion: 1;
  database: InspectionDatabase;
}

function isStoredDataV1(data: unknown): data is StoredDataV1 {
  if (!data || typeof data !== "object") {
    return false;
  }
  const record = data as Record<string, unknown>;
  return record.schemaVersion === 1 && typeof record.database === "object";
}

export class InspectionStore {
  private plugin: Plugin;
  settings: InspectionSettings = { ...DEFAULT_SETTINGS };
  database: InspectionDatabase = createEmptyDatabase();

  constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  async load(): Promise<void> {
    const raw: unknown = await this.plugin.loadData();

    if (isStoredDataV1(raw)) {
      this.database = raw.database;
      this.settings = databaseToSettings(this.database);
      return;
    }

    const legacySettings = (raw ?? {}) as Partial<InspectionSettings>;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...legacySettings,
    };
    this.database = settingsToDatabase(this.settings);
    await this.save();
  }

  async saveFromSettings(settings: InspectionSettings): Promise<void> {
    this.settings = settings;
    this.database = settingsToDatabase(settings);
    await this.save();
  }

  private async save(): Promise<void> {
    await this.plugin.saveData({
      schemaVersion: 1,
      database: this.database,
    });
  }
}
