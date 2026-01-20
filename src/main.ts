import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, InspectionSettings } from "./settings";
import { InspectionSettingTab } from "./ui/settings-tab";

export default class InspectionPlugin extends Plugin {
  settings: InspectionSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new InspectionSettingTab(this.app, this));
  }

  async loadSettings() {
    const stored = (await this.loadData()) as Partial<InspectionSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
