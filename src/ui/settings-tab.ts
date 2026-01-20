import { App, PluginSettingTab, Setting } from "obsidian";
import InspectionPlugin from "../main";
import {
  ComponentRating,
  ItemKind,
  ItemType,
  MAX_ITEM_TYPES,
  MAX_RATING,
  MIN_RATING,
  NetworkCollection,
  NetworkItem,
  NonInspectedItemType,
} from "../settings";
import { createId } from "../utils/ids";
import { validateSettings } from "../validation/network";

interface ItemTypeSummary {
  id: string;
  name: string;
  kind: ItemKind;
}

export class InspectionSettingTab extends PluginSettingTab {
  plugin: InspectionPlugin;

  constructor(app: App, plugin: InspectionPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Inspection network")
      .setHeading();

    this.renderInspectedItemTypes(containerEl);
    this.renderNonInspectedItemTypes(containerEl);
    this.renderCollections(containerEl);
    this.renderValidation(containerEl);
  }

  private renderInspectedItemTypes(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName("Inspected item types")
      .setHeading();
    containerEl.createEl("p", {
      text: "Define up to 10 inspected facility types, each with rated components.",
    });

    new Setting(containerEl)
      .setName("Add inspected item type")
      .setDesc("Create a new inspected type for point or linear facilities.")
      .addButton((button) => {
        button
          .setButtonText("Add")
          .setDisabled(this.plugin.settings.inspectedItemTypes.length >= MAX_ITEM_TYPES)
          .onClick(async () => {
            this.plugin.settings.inspectedItemTypes.push({
              id: createId(),
              name: "",
              kind: "point",
              components: [],
            });
            await this.plugin.saveSettings();
            this.display();
          });
      });

    this.plugin.settings.inspectedItemTypes.forEach((itemType, index) => {
      this.renderInspectedItemType(containerEl, itemType, index);
    });
  }

  private renderInspectedItemType(
    containerEl: HTMLElement,
    itemType: ItemType,
    index: number
  ) {
    new Setting(containerEl)
      .setName(`Inspected type ${index + 1}`)
      .setHeading();

    new Setting(containerEl)
      .setName("Type name")
      .setDesc("Use a unique name within inspected types.")
      .addText((text) =>
        text
          .setPlaceholder("Canal check structure")
          .setValue(itemType.name)
          .onChange(async (value) => {
            itemType.name = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Type kind")
      .setDesc("Point items have a single station. Linear items connect two stations.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("point", "Point")
          .addOption("linear", "Linear")
          .setValue(itemType.kind)
          .onChange(async (value: ItemKind) => {
            itemType.kind = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName("Remove inspected type")
      .setDesc("Delete this inspected item type.")
      .addButton((button) =>
        button.setButtonText("Remove").setWarning().onClick(async () => {
          this.plugin.settings.inspectedItemTypes =
            this.plugin.settings.inspectedItemTypes.filter((type) => type.id !== itemType.id);
          await this.plugin.saveSettings();
          this.display();
        })
      );

    new Setting(containerEl)
      .setName("Rated components")
      .setHeading();

    new Setting(containerEl)
      .setName("Add component")
      .setDesc("Add a rated component for this inspected type.")
      .addButton((button) => {
        button.setButtonText("Add").onClick(async () => {
          itemType.components.push({
            id: createId(),
            name: "",
            ratingScale: { min: MIN_RATING, max: MAX_RATING },
            weightPercent: 0,
            allowNotInspectedUsePrevious: false,
          });
          await this.plugin.saveSettings();
          this.display();
        });
      });

    itemType.components.forEach((component) => {
      this.renderComponent(containerEl, itemType, component);
    });
  }

  private renderComponent(
    containerEl: HTMLElement,
    itemType: ItemType,
    component: ComponentRating
  ) {
    new Setting(containerEl)
      .setName("Component name")
      .setDesc("Short label for this rated component.")
      .addText((text) =>
        text.setValue(component.name).onChange(async (value) => {
          component.name = value;
          await this.plugin.saveSettings();
        })
      );

    const scaleSetting = new Setting(containerEl)
      .setName("Rating scale")
      .setDesc(`Choose a numeric scale between ${MIN_RATING} and ${MAX_RATING}.`);

    scaleSetting.addText((text) => {
      text.setValue(component.ratingScale.min.toString());
      text.inputEl.type = "number";
      text.inputEl.min = MIN_RATING.toString();
      text.inputEl.max = MAX_RATING.toString();
      text.onChange(async (value) => {
        component.ratingScale.min = Number(value);
        await this.plugin.saveSettings();
      });
    });

    scaleSetting.addText((text) => {
      text.setValue(component.ratingScale.max.toString());
      text.inputEl.type = "number";
      text.inputEl.min = MIN_RATING.toString();
      text.inputEl.max = MAX_RATING.toString();
      text.onChange(async (value) => {
        component.ratingScale.max = Number(value);
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl)
      .setName("Weight percent")
      .setDesc("Set a universal weight for this component.")
      .addText((text) => {
        text.setValue(component.weightPercent.toString());
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.max = "100";
        text.onChange(async (value) => {
          component.weightPercent = Number(value);
          await this.plugin.saveSettings();
        });
      })
      .addButton((button) =>
        button.setButtonText("Remove").setWarning().onClick(async () => {
          itemType.components = itemType.components.filter((entry) => entry.id !== component.id);
          await this.plugin.saveSettings();
          this.display();
        })
      );

    new Setting(containerEl)
      .setName("Allow not inspected/use previous")
      .setDesc("Enable when the component can be marked not inspected and reuse the previous rating.")
      .addToggle((toggle) => {
        toggle.setValue(component.allowNotInspectedUsePrevious).onChange(async (value) => {
          component.allowNotInspectedUsePrevious = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private renderNonInspectedItemTypes(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName("Non-inspected item types")
      .setHeading();
    containerEl.createEl("p", {
      text: "Define navigation or reference items that are not directly inspected.",
    });

    new Setting(containerEl)
      .setName("Add non-inspected item type")
      .setDesc("Create a new non-inspected point or linear item type.")
      .addButton((button) => {
        button.setButtonText("Add").onClick(async () => {
          this.plugin.settings.nonInspectedItemTypes.push({
            id: createId(),
            name: "",
            kind: "point",
          });
          await this.plugin.saveSettings();
          this.display();
        });
      });

    this.plugin.settings.nonInspectedItemTypes.forEach((itemType, index) => {
      this.renderNonInspectedItemType(containerEl, itemType, index);
    });
  }

  private renderNonInspectedItemType(
    containerEl: HTMLElement,
    itemType: NonInspectedItemType,
    index: number
  ) {
    new Setting(containerEl)
      .setName(`Non-inspected type ${index + 1}`)
      .setHeading();

    new Setting(containerEl)
      .setName("Type name")
      .setDesc("Use a unique name within non-inspected types.")
      .addText((text) =>
        text
          .setPlaceholder("Station marker")
          .setValue(itemType.name)
          .onChange(async (value) => {
            itemType.name = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Type kind")
      .setDesc("Point items have a single station. Linear items connect two stations.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("point", "Point")
          .addOption("linear", "Linear")
          .setValue(itemType.kind)
          .onChange(async (value: ItemKind) => {
            itemType.kind = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName("Remove non-inspected type")
      .setDesc("Delete this non-inspected item type.")
      .addButton((button) =>
        button.setButtonText("Remove").setWarning().onClick(async () => {
          this.plugin.settings.nonInspectedItemTypes =
            this.plugin.settings.nonInspectedItemTypes.filter((type) => type.id !== itemType.id);
          await this.plugin.saveSettings();
          this.display();
        })
      );
  }

  private renderCollections(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName("Collections")
      .setHeading();
    containerEl.createEl("p", {
      text: "Define each connected linear network (for example, a single canal).",
    });

    new Setting(containerEl)
      .setName("Add collection")
      .setDesc("Create a named collection of inspected and reference items.")
      .addButton((button) => {
        button.setButtonText("Add").onClick(async () => {
          this.plugin.settings.collections.push({
            id: createId(),
            name: "",
            items: [],
          });
          await this.plugin.saveSettings();
          this.display();
        });
      });

    this.plugin.settings.collections.forEach((collection, index) => {
      this.renderCollection(containerEl, collection, index);
    });
  }

  private renderCollection(
    containerEl: HTMLElement,
    collection: NetworkCollection,
    index: number
  ) {
    new Setting(containerEl)
      .setName(`Collection ${index + 1}`)
      .setHeading();

    new Setting(containerEl)
      .setName("Collection name")
      .setDesc("Names are used to group items into connected networks.")
      .addText((text) =>
        text
          .setPlaceholder("Example canal")
          .setValue(collection.name)
          .onChange(async (value) => {
            collection.name = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Remove collection")
      .setDesc("Delete this collection and its items.")
      .addButton((button) =>
        button.setButtonText("Remove").setWarning().onClick(async () => {
          this.plugin.settings.collections = this.plugin.settings.collections.filter(
            (entry) => entry.id !== collection.id
          );
          await this.plugin.saveSettings();
          this.display();
        })
      );

    new Setting(containerEl)
      .setName("Add item")
      .setDesc("Add an inspected or reference item to this collection.")
      .addButton((button) => {
        button.setButtonText("Add").onClick(async () => {
          const itemTypes = this.getItemTypeSummaries();
          const fallbackType = itemTypes[0];
          const fallbackTypeId = fallbackType ? fallbackType.id : "";

          collection.items.push({
            id: createId(),
            name: "",
            typeId: fallbackTypeId,
            station: undefined,
          });
          await this.plugin.saveSettings();
          this.display();
        });
      });

    if (collection.items.length === 0) {
      containerEl.createEl("p", {
        text: "No items yet. Add an item to begin describing stations and segments.",
      });
      return;
    }

    collection.items.forEach((item, itemIndex) => {
      this.renderCollectionItem(containerEl, collection, item, itemIndex);
    });
  }

  private renderCollectionItem(
    containerEl: HTMLElement,
    collection: NetworkCollection,
    item: NetworkItem,
    index: number
  ) {
    new Setting(containerEl)
      .setName(`Item ${index + 1}`)
      .setHeading();

    new Setting(containerEl)
      .setName("Item name")
      .setDesc("Item names must be unique within a collection.")
      .addText((text) =>
        text
          .setPlaceholder("Reach 1")
          .setValue(item.name)
          .onChange(async (value) => {
            item.name = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Item type")
      .setDesc("Choose the inspected or non-inspected type for this item.")
      .addDropdown((dropdown) => {
        const itemTypes = this.getItemTypeSummaries();
        if (itemTypes.length === 0) {
          dropdown.addOption("", "Add item types first");
          dropdown.setValue("");
          dropdown.setDisabled(true);
          return;
        }

        itemTypes.forEach((type) => {
          dropdown.addOption(type.id, `${type.name || "(unnamed)"} (${type.kind})`);
        });

        dropdown.setValue(item.typeId || itemTypes[0]?.id || "");
        dropdown.onChange(async (value) => {
          item.typeId = value;
          const kind = this.getItemKind(value);
          if (kind === "point") {
            item.startStationItemId = undefined;
            item.endStationItemId = undefined;
          } else if (kind === "linear") {
            item.station = undefined;
          }
          await this.plugin.saveSettings();
          this.display();
        });
      });

    const itemKind = this.getItemKind(item.typeId);
    if (itemKind === "point") {
      new Setting(containerEl)
        .setName("Station")
        .setDesc("Station value for this point item.")
        .addText((text) => {
          text.setValue(item.station?.toString() ?? "");
          text.inputEl.type = "number";
          text.onChange(async (value) => {
            item.station = value === "" ? undefined : Number(value);
            await this.plugin.saveSettings();
          });
        });
    }

    if (itemKind === "linear") {
      const pointItems = collection.items.filter(
        (entry) => this.getItemKind(entry.typeId) === "point"
      );

      const options = pointItems.map((entry) => ({
        id: entry.id,
        label: `${entry.name || "(unnamed)"} ${
          entry.station !== undefined ? `@ ${entry.station}` : "(no station)"
        }`,
      }));

      new Setting(containerEl)
        .setName("Start station item")
        .setDesc("Select the point item that defines the start station.")
        .addDropdown((dropdown) => {
          if (options.length === 0) {
            dropdown.addOption("", "Add a point item first");
            dropdown.setValue("");
            dropdown.setDisabled(true);
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          options.forEach((option) => dropdown.addOption(option.id, option.label));
          dropdown
            .setValue(item.startStationItemId || (options[0]?.id ?? ""))
            .onChange((value) => {
              item.startStationItemId = value;
              void this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName("End station item")
        .setDesc("Select the point item that defines the end station.")
        .addDropdown((dropdown) => {
          if (options.length === 0) {
            dropdown.addOption("", "Add a point item first");
            dropdown.setValue("");
            dropdown.setDisabled(true);
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          options.forEach((option) => dropdown.addOption(option.id, option.label));
          dropdown
            .setValue(item.endStationItemId || (options[0]?.id ?? ""))
            .onChange((value) => {
              item.endStationItemId = value;
              void this.plugin.saveSettings();
            });
        });
    }

    new Setting(containerEl)
      .setName("Remove item")
      .setDesc("Delete this item from the collection.")
      .addButton((button) =>
        button.setButtonText("Remove").setWarning().onClick(async () => {
          collection.items = collection.items.filter((entry) => entry.id !== item.id);
          await this.plugin.saveSettings();
          this.display();
        })
      );
  }

  private renderValidation(containerEl: HTMLElement) {
    const errors = validateSettings(this.plugin.settings);
    new Setting(containerEl)
      .setName("Validation")
      .setHeading();

    if (errors.length === 0) {
      containerEl.createEl("p", { text: "All settings are valid." });
      return;
    }

    const list = containerEl.createEl("ul");
    errors.forEach((error) => {
      list.createEl("li", { text: error });
    });
  }

  private getItemTypeSummaries(): ItemTypeSummary[] {
    const inspected = this.plugin.settings.inspectedItemTypes.map((type) => ({
      id: type.id,
      name: type.name,
      kind: type.kind,
    }));
    const nonInspected = this.plugin.settings.nonInspectedItemTypes.map((type) => ({
      id: type.id,
      name: type.name,
      kind: type.kind,
    }));
    return [...inspected, ...nonInspected];
  }

  private getItemKind(typeId: string): ItemKind | undefined {
    const match = this.getItemTypeSummaries().find((type) => type.id === typeId);
    return match?.kind;
  }
}
