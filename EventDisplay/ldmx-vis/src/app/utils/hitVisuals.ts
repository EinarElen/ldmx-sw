import { Color, type Material, Object3D, Vector3 } from 'three';
import type { HitVisualStyle, PhoenixEventData } from '../types';

type HitEntry = Record<string, unknown>;

const baseScale = new Vector3(1, 1, 1);

export function styleHitCollection(
  collectionObject: Object3D,
  collectionName: string,
  eventData: PhoenixEventData | null,
  visualStyle: HitVisualStyle
) {
  const entries = getHitEntries(eventData, collectionName);
  if (!entries.length) return;

  const itemRoots = collectionObject.children.length
    ? collectionObject.children
    : [collectionObject];
  const count = Math.min(itemRoots.length, entries.length);
  if (!count) return;

  const energyMax = getMax(entries, (entry) => readNumeric(entry, 'energy'));
  const contributorMax = getMax(entries, (entry) =>
    readContributorCount(entry)
  );

  for (let index = 0; index < count; index += 1) {
    const object = itemRoots[index];
    const entry = entries[index];
    if (!object || !entry) continue;

    const color = resolveColor(entry, visualStyle, energyMax);
    const scale = resolveScale(entry, visualStyle, energyMax, contributorMax);
    applyItemVisuals(object, color, scale);
  }
}

function getHitEntries(
  eventData: PhoenixEventData | null,
  collectionName: string
) {
  const raw = eventData?.Hits?.[collectionName];
  return Array.isArray(raw)
    ? raw.filter((entry): entry is HitEntry => !!entry && typeof entry === 'object')
    : [];
}

function resolveColor(
  entry: HitEntry,
  visualStyle: HitVisualStyle,
  energyMax: number
) {
  switch (visualStyle.colorMode) {
    case 'energy':
      return colorByEnergy(readNumeric(entry, 'energy'), energyMax);
    case 'parentSpecies':
      return colorBySpecies(readParentSpecies(entry));
    case 'parentTrack':
      return colorByTrack(readParentTrack(entry));
    case 'source':
    default:
      return null;
  }
}

function resolveScale(
  entry: HitEntry,
  visualStyle: HitVisualStyle,
  energyMax: number,
  contributorMax: number
) {
  switch (visualStyle.sizeMode) {
    case 'energy':
      return scaleFromMetric(
        readNumeric(entry, 'energy'),
        energyMax,
        visualStyle.sizeStrength
      );
    case 'contributors':
      return scaleFromMetric(
        readContributorCount(entry),
        contributorMax,
        visualStyle.sizeStrength
      );
    case 'source':
    default:
      return 1;
  }
}

function scaleFromMetric(
  value: number | null,
  maxValue: number,
  strength: number
) {
  if (value == null || !Number.isFinite(value) || maxValue <= 0) return 1;
  const normalized = Math.max(0, Math.min(1, value / maxValue));
  return 0.7 + Math.sqrt(normalized) * strength;
}

function applyItemVisuals(object: Object3D, color: Color | null, scale: number) {
  captureBaseScale(object);
  if (scale === 1) {
    const stored = object.userData.ldmxBaseScale as number[] | undefined;
    const [x, y, z] = stored ?? [];
    if (x != null && y != null && z != null) {
      object.scale.set(x, y, z);
    } else {
      object.scale.copy(baseScale);
    }
  } else {
    const stored = object.userData.ldmxBaseScale as number[] | undefined;
    const [x, y, z] = stored ?? [];
    if (x != null && y != null && z != null) {
      object.scale.set(x * scale, y * scale, z * scale);
    } else {
      object.scale.setScalar(scale);
    }
  }

  object.traverse((child: Object3D) => {
    const material = (child as { material?: Material | Material[] }).material;
    if (!material) return;
    if (Array.isArray(material)) {
      material.forEach((entry) => setMaterialColor(entry, color));
      return;
    }
    setMaterialColor(material, color);
  });
}

function captureBaseScale(object: Object3D) {
  if (!Array.isArray(object.userData.ldmxBaseScale)) {
    object.userData.ldmxBaseScale = [
      object.scale.x || 1,
      object.scale.y || 1,
      object.scale.z || 1
    ];
  }
}

function setMaterialColor(material: Material, color: Color | null) {
  const target = material as Material & {
    color?: Color;
    userData?: Record<string, unknown>;
  };
  if (!target.color) return;

  target.userData ??= {};
  if (!(target.userData.ldmxBaseColor instanceof Color)) {
    target.userData.ldmxBaseColor = target.color.clone();
  }

  if (!color) {
    target.color.copy(target.userData.ldmxBaseColor as Color);
  } else {
    target.color.copy(color);
  }
  material.needsUpdate = true;
}

function colorByEnergy(value: number | null, maxValue: number) {
  if (value == null || !Number.isFinite(value) || maxValue <= 0) return null;
  const normalized = Math.max(0, Math.min(1, value / maxValue));
  return new Color().setHSL(0.62 - 0.56 * normalized, 0.72, 0.58);
}

function colorBySpecies(pdgId: number | null) {
  if (pdgId == null) return null;
  const absPdg = Math.abs(pdgId);
  if (absPdg === 11) return new Color('#61afef');
  if (absPdg === 22) return new Color('#e5c07b');
  if (absPdg === 13) return new Color('#e06c75');
  if (absPdg === 2112) return new Color('#c678dd');
  if (absPdg === 2212) return new Color('#d19a66');
  if (absPdg === 211 || absPdg === 111) return new Color('#98c379');
  return new Color('#c8ccd4');
}

function colorByTrack(trackId: number | null) {
  if (trackId == null) return null;
  const hue = ((Math.abs(trackId) * 0.16180339887498948) % 1 + 1) % 1;
  return new Color().setHSL(hue, 0.68, 0.6);
}

function readNumeric(entry: HitEntry, field: 'energy') {
  const value = entry[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readContributorCount(entry: HitEntry) {
  if (typeof entry.nContribs === 'number' && Number.isFinite(entry.nContribs)) {
    return entry.nContribs;
  }
  if (Array.isArray(entry.trackIDs)) return entry.trackIDs.length;
  if (Array.isArray(entry.incidentIDs)) return entry.incidentIDs.length;
  return null;
}

function readParentSpecies(entry: HitEntry) {
  if (typeof entry.pdgID === 'number') return entry.pdgID;
  if (Array.isArray(entry.pdgIDs)) {
    const candidate = entry.pdgIDs.find(
      (value) => typeof value === 'number' && Number.isFinite(value)
    );
    return typeof candidate === 'number' ? candidate : null;
  }
  return null;
}

function readParentTrack(entry: HitEntry) {
  if (typeof entry.trackID === 'number') return entry.trackID;
  if (Array.isArray(entry.trackIDs)) {
    const candidate = entry.trackIDs.find(
      (value) => typeof value === 'number' && Number.isFinite(value)
    );
    if (typeof candidate === 'number') return candidate;
  }
  if (Array.isArray(entry.incidentIDs)) {
    const candidate = entry.incidentIDs.find(
      (value) => typeof value === 'number' && Number.isFinite(value)
    );
    if (typeof candidate === 'number') return candidate;
  }
  if (Array.isArray(entry.originID)) {
    const candidate = entry.originID.find(
      (value) => typeof value === 'number' && Number.isFinite(value)
    );
    return typeof candidate === 'number' ? candidate : null;
  }
  if (typeof entry.originID === 'number') return entry.originID;
  return null;
}

function getMax(
  entries: HitEntry[],
  readValue: (entry: HitEntry) => number | null
) {
  let maxValue = 0;
  for (const entry of entries) {
    const value = readValue(entry);
    if (value != null && Number.isFinite(value)) {
      maxValue = Math.max(maxValue, value);
    }
  }
  return maxValue;
}
