export type ItemKind = "point" | "linear";

export interface RatingScale {
  min: number;
  max: number;
}

export interface ComponentRating {
  id: string;
  name: string;
  ratingScale: RatingScale;
  weightPercent: number;
  allowNotInspectedUsePrevious: boolean;
}

export interface ItemType {
  id: string;
  name: string;
  kind: ItemKind;
  components: ComponentRating[];
}

export interface NonInspectedItemType {
  id: string;
  name: string;
  kind: ItemKind;
}

export interface NetworkItem {
  id: string;
  name: string;
  typeId: string;
  station?: number;
  startStationItemId?: string;
  endStationItemId?: string;
}

export interface NetworkCollection {
  id: string;
  name: string;
  items: NetworkItem[];
}

export interface InspectionSettings {
  inspectedItemTypes: ItemType[];
  nonInspectedItemTypes: NonInspectedItemType[];
  collections: NetworkCollection[];
}

export const DEFAULT_SETTINGS: InspectionSettings = {
  inspectedItemTypes: [],
  nonInspectedItemTypes: [],
  collections: [],
};

export const MAX_ITEM_TYPES = 10;
export const MIN_RATING = 0;
export const MAX_RATING = 10;
