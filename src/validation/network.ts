import {
  InspectionSettings,
  ItemKind,
  MAX_RATING,
  MIN_RATING,
  NetworkCollection,
} from "../settings";

interface ItemTypeSummary {
  id: string;
  name: string;
  kind: ItemKind;
}

function getItemTypeSummaries(settings: InspectionSettings): ItemTypeSummary[] {
  const inspected = settings.inspectedItemTypes.map((type) => ({
    id: type.id,
    name: type.name,
    kind: type.kind,
  }));
  const nonInspected = settings.nonInspectedItemTypes.map((type) => ({
    id: type.id,
    name: type.name,
    kind: type.kind,
  }));

  return [...inspected, ...nonInspected];
}

function validateCollectionConnectivity(
  collection: NetworkCollection,
  itemTypes: Map<string, ItemKind>
): string[] {
  const errors: string[] = [];
  const pointItems = collection.items.filter((item) => itemTypes.get(item.typeId) === "point");
  const pointIds = new Set(pointItems.map((item) => item.id));
  const nodes = new Set<string>();
  const adjacency = new Map<string, Set<string>>();

  for (const item of collection.items) {
    if (itemTypes.get(item.typeId) !== "linear") {
      continue;
    }

    if (!item.startStationItemId || !item.endStationItemId) {
      errors.push(
        `Collection "${collection.name}": linear item "${item.name}" must have both a start and end station item.`
      );
      continue;
    }

    if (!pointIds.has(item.startStationItemId) || !pointIds.has(item.endStationItemId)) {
      errors.push(
        `Collection "${collection.name}": linear item "${item.name}" must reference point items for start and end.`
      );
      continue;
    }

    nodes.add(item.startStationItemId);
    nodes.add(item.endStationItemId);

    if (!adjacency.has(item.startStationItemId)) {
      adjacency.set(item.startStationItemId, new Set());
    }
    if (!adjacency.has(item.endStationItemId)) {
      adjacency.set(item.endStationItemId, new Set());
    }

    adjacency.get(item.startStationItemId)?.add(item.endStationItemId);
    adjacency.get(item.endStationItemId)?.add(item.startStationItemId);
  }

  if (nodes.size <= 1) {
    return errors;
  }

  const [firstNode] = nodes;
  if (!firstNode) {
    return errors;
  }

  const visited = new Set<string>();
  const queue = [firstNode];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    const neighbors = adjacency.get(current) ?? new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  if (visited.size !== nodes.size) {
    errors.push(
      `Collection "${collection.name}": the linear network is not fully connected. Ensure each linear item connects through stationed point items.`
    );
  }

  return errors;
}

export function validateSettings(settings: InspectionSettings): string[] {
  const errors: string[] = [];

  const inspectedNames = new Set<string>();
  for (const itemType of settings.inspectedItemTypes) {
    const trimmed = itemType.name.trim();
    if (!trimmed) {
      errors.push("Inspected item types must have a name.");
    }
    if (inspectedNames.has(trimmed)) {
      errors.push(`Inspected item type name "${trimmed}" is duplicated.`);
    }
    inspectedNames.add(trimmed);

    for (const component of itemType.components) {
      if (!component.name.trim()) {
        errors.push(`Component names for "${itemType.name}" cannot be empty.`);
      }
      if (component.ratingScale.min < MIN_RATING || component.ratingScale.max > MAX_RATING) {
        errors.push(
          `Component "${component.name}" in "${itemType.name}" must use ratings between ${MIN_RATING} and ${MAX_RATING}.`
        );
      }
      if (component.ratingScale.min > component.ratingScale.max) {
        errors.push(
          `Component "${component.name}" in "${itemType.name}" must have a minimum rating less than or equal to the maximum.`
        );
      }
      if (component.weightPercent < 0 || component.weightPercent > 100) {
        errors.push(
          `Component "${component.name}" in "${itemType.name}" must use a weight between 0 and 100%.`
        );
      }
    }
  }

  const nonInspectedNames = new Set<string>();
  for (const itemType of settings.nonInspectedItemTypes) {
    const trimmed = itemType.name.trim();
    if (!trimmed) {
      errors.push("Non-inspected item types must have a name.");
    }
    if (nonInspectedNames.has(trimmed)) {
      errors.push(`Non-inspected item type name "${trimmed}" is duplicated.`);
    }
    nonInspectedNames.add(trimmed);
  }

  const itemTypeMap = new Map(
    getItemTypeSummaries(settings).map((type) => [type.id, type.kind])
  );

  for (const collection of settings.collections) {
    const itemNames = new Set<string>();

    for (const item of collection.items) {
      const trimmed = item.name.trim();
      if (!trimmed) {
        errors.push(`Collection "${collection.name}": items must have a name.`);
      }
      if (itemNames.has(trimmed)) {
        errors.push(`Collection "${collection.name}": item name "${trimmed}" is duplicated.`);
      }
      itemNames.add(trimmed);

      const kind = itemTypeMap.get(item.typeId);
      if (kind === "point") {
        if (item.station === undefined || Number.isNaN(item.station)) {
          errors.push(
            `Collection "${collection.name}": point item "${item.name}" must have a station value.`
          );
        }
      }
      if (kind === "linear") {
        if (!item.startStationItemId || !item.endStationItemId) {
          errors.push(
            `Collection "${collection.name}": linear item "${item.name}" must reference start and end station items.`
          );
        }
      }
    }

    errors.push(...validateCollectionConnectivity(collection, itemTypeMap));
  }

  return errors;
}
