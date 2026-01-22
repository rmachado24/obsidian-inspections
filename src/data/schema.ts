import {
  ComponentRating,
  InspectionSettings,
  ItemKind,
  ItemType,
  MAX_RATING,
  MIN_RATING,
  NetworkCollection,
  NetworkItem,
  NonInspectedItemType,
} from "../settings";

export interface ItemTypeRecord {
  id: string;
  name: string;
  kind: ItemKind;
  inspected: boolean;
}

export interface ComponentRecord {
  id: string;
  itemTypeId: string;
  name: string;
  ratingScale: {
    min: number;
    max: number;
  };
  weightPercent: number;
  allowNotInspectedUsePrevious: boolean;
}

export interface CollectionRecord {
  id: string;
  name: string;
  itemIds: string[];
}

export interface ItemRecord {
  id: string;
  name: string;
  typeId: string;
  station?: number;
  startStationItemId?: string;
  endStationItemId?: string;
}

export interface InspectionDatabase {
  schemaVersion: 1;
  inspectedItemTypeIds: string[];
  nonInspectedItemTypeIds: string[];
  itemTypes: Record<string, ItemTypeRecord>;
  componentIdsByItemType: Record<string, string[]>;
  components: Record<string, ComponentRecord>;
  collectionIds: string[];
  collections: Record<string, CollectionRecord>;
  items: Record<string, ItemRecord>;
}

export function createEmptyDatabase(): InspectionDatabase {
  return {
    schemaVersion: 1,
    inspectedItemTypeIds: [],
    nonInspectedItemTypeIds: [],
    itemTypes: {},
    componentIdsByItemType: {},
    components: {},
    collectionIds: [],
    collections: {},
    items: {},
  };
}

export function settingsToDatabase(settings: InspectionSettings): InspectionDatabase {
  const database = createEmptyDatabase();

  settings.inspectedItemTypes.forEach((itemType) => {
    database.inspectedItemTypeIds.push(itemType.id);
    database.itemTypes[itemType.id] = {
      id: itemType.id,
      name: itemType.name,
      kind: itemType.kind,
      inspected: true,
    };
    database.componentIdsByItemType[itemType.id] = [];

    itemType.components.forEach((component) => {
      database.componentIdsByItemType[itemType.id].push(component.id);
      database.components[component.id] = {
        id: component.id,
        itemTypeId: itemType.id,
        name: component.name,
        ratingScale: {
          min: component.ratingScale.min,
          max: component.ratingScale.max,
        },
        weightPercent: component.weightPercent,
        allowNotInspectedUsePrevious: component.allowNotInspectedUsePrevious,
      };
    });
  });

  settings.nonInspectedItemTypes.forEach((itemType) => {
    database.nonInspectedItemTypeIds.push(itemType.id);
    database.itemTypes[itemType.id] = {
      id: itemType.id,
      name: itemType.name,
      kind: itemType.kind,
      inspected: false,
    };
  });

  settings.collections.forEach((collection) => {
    database.collectionIds.push(collection.id);
    database.collections[collection.id] = {
      id: collection.id,
      name: collection.name,
      itemIds: [],
    };

    collection.items.forEach((item) => {
      database.collections[collection.id].itemIds.push(item.id);
      database.items[item.id] = {
        id: item.id,
        name: item.name,
        typeId: item.typeId,
        station: item.station,
        startStationItemId: item.startStationItemId,
        endStationItemId: item.endStationItemId,
      };
    });
  });

  return database;
}

export function databaseToSettings(database: InspectionDatabase): InspectionSettings {
  const inspectedItemTypes: ItemType[] = database.inspectedItemTypeIds
    .map((id) => mapInspectedItemType(database, id))
    .filter((itemType): itemType is ItemType => Boolean(itemType));

  const nonInspectedItemTypes: NonInspectedItemType[] = database.nonInspectedItemTypeIds
    .map((id) => mapNonInspectedItemType(database, id))
    .filter((itemType): itemType is NonInspectedItemType => Boolean(itemType));

  const collections: NetworkCollection[] = database.collectionIds
    .map((id) => mapCollection(database, id))
    .filter((collection): collection is NetworkCollection => Boolean(collection));

  return {
    inspectedItemTypes,
    nonInspectedItemTypes,
    collections,
  };
}

function mapInspectedItemType(
  database: InspectionDatabase,
  itemTypeId: string
): ItemType | null {
  const itemType = database.itemTypes[itemTypeId];
  if (!itemType || !itemType.inspected) {
    return null;
  }

  const componentIds = database.componentIdsByItemType[itemTypeId] ?? [];
  const components: ComponentRating[] = componentIds
    .map((componentId) => mapComponent(database, componentId, itemTypeId))
    .filter((component): component is ComponentRating => Boolean(component));

  return {
    id: itemType.id,
    name: itemType.name,
    kind: itemType.kind,
    components,
  };
}

function mapNonInspectedItemType(
  database: InspectionDatabase,
  itemTypeId: string
): NonInspectedItemType | null {
  const itemType = database.itemTypes[itemTypeId];
  if (!itemType || itemType.inspected) {
    return null;
  }

  return {
    id: itemType.id,
    name: itemType.name,
    kind: itemType.kind,
  };
}

function mapComponent(
  database: InspectionDatabase,
  componentId: string,
  itemTypeId: string
): ComponentRating | null {
  const component = database.components[componentId];
  if (!component || component.itemTypeId !== itemTypeId) {
    return null;
  }

  return {
    id: component.id,
    name: component.name,
    ratingScale: {
      min: component.ratingScale.min ?? MIN_RATING,
      max: component.ratingScale.max ?? MAX_RATING,
    },
    weightPercent: component.weightPercent,
    allowNotInspectedUsePrevious: component.allowNotInspectedUsePrevious,
  };
}

function mapCollection(
  database: InspectionDatabase,
  collectionId: string
): NetworkCollection | null {
  const collection = database.collections[collectionId];
  if (!collection) {
    return null;
  }

  const items: NetworkItem[] = (collection.itemIds ?? [])
    .map((itemId) => mapItem(database, itemId))
    .filter((item): item is NetworkItem => Boolean(item));

  return {
    id: collection.id,
    name: collection.name,
    items,
  };
}

function mapItem(database: InspectionDatabase, itemId: string): NetworkItem | null {
  const item = database.items[itemId];
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    typeId: item.typeId,
    station: item.station,
    startStationItemId: item.startStationItemId,
    endStationItemId: item.endStationItemId,
  };
}
