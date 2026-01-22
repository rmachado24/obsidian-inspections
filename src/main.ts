import { Plugin } from "obsidian";
import { InspectionStore } from "./data/store";
import { InspectionSettings } from "./settings";
import { InspectionSettingTab } from "./ui/settings-tab";

export default class InspectionPlugin extends Plugin {
  settings: InspectionSettings;
  store: InspectionStore;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new InspectionSettingTab(this.app, this));
  }

  async loadSettings() {
    this.store = new InspectionStore(this);
    await this.store.load();
    this.settings = this.store.settings;
  }

  async saveSettings() {
    await this.store.saveFromSettings(this.settings);
  }
}
