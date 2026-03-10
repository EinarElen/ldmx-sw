import { describeCollectionPath } from './classification';
import { formatNumber } from './formatting';
import type {
  EcalVetoSummary,
  EventCollectionSummary,
  HcalVetoSummary,
  MetadataEntry,
  PhoenixEventData
} from '../types';

/**
 * Phoenix JSON files sometimes contain top-level helper entries alongside
 * actual event payloads. This strips the input down to event-key objects.
 */
export function normalizeEventPayloads(input: unknown): Record<string, PhoenixEventData> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const entries = Object.entries(input as Record<string, unknown>).filter(
    ([, value]) => value && typeof value === 'object' && !Array.isArray(value)
  );

  return Object.fromEntries(entries) as Record<string, PhoenixEventData>;
}

/**
 * Builds the collection inventory shown in the sidebar/guide from the
 * current event payload, including the SimParticles map when present.
 */
export function summarizeEventCollections(
  eventData: PhoenixEventData | null
): EventCollectionSummary[] {
  if (!eventData) return [];

  const summaries: EventCollectionSummary[] = [];

  for (const [kind, collections] of Object.entries({
    Hits: eventData.Hits ?? {},
    Tracks: eventData.Tracks ?? {}
  }) as Array<[Extract<EventCollectionSummary['kind'], 'Hits' | 'Tracks'>, Record<string, unknown[]>]>) {
    for (const [name, values] of Object.entries(collections)) {
      const description = describeCollectionPath(name);
      summaries.push({
        kind,
        name,
        size: Array.isArray(values) ? values.length : 0,
        path: description.path,
        subsystem: description.subsystem
      });
    }
  }

  if (
    eventData.SimParticles &&
    typeof eventData.SimParticles === 'object' &&
    !Array.isArray(eventData.SimParticles)
  ) {
    const description = describeCollectionPath('SimParticles');
    summaries.push({
      kind: 'SimParticles',
      name: 'SimParticles',
      size: Object.keys(eventData.SimParticles).length,
      path: description.path,
      subsystem: description.subsystem
    });
  }

  return summaries.sort((left, right) => {
    if (left.subsystem !== right.subsystem) {
      return left.subsystem.localeCompare(right.subsystem);
    }
    if (right.size !== left.size) return right.size - left.size;
    return left.name.localeCompare(right.name);
  });
}

/**
 * Produces short operator-facing guidance for the current event by combining
 * sample metadata, veto summaries, and collection occupancy.
 */
export function buildEventGuide(
  eventData: PhoenixEventData | null,
  metadata: MetadataEntry[],
  hcalVetoSummary: HcalVetoSummary | null,
  ecalVetoSummary: EcalVetoSummary | null
): string[] {
  if (!eventData) {
    return [
      'Import a Phoenix JSON event file or switch to a bundled sample.',
      'Detector sliders on the left affect geometry solids only.',
      'Collection toggles hide or reveal event objects in the current event.'
    ];
  }

  const collectionSummary = summarizeEventCollections(eventData);
  const hitCollections = collectionSummary.filter((entry) => entry.kind === 'Hits');
  const trackCollections = collectionSummary.filter((entry) => entry.kind === 'Tracks');
  const dominantHit = hitCollections.reduce<EventCollectionSummary | null>(
    (largest, entry) => {
      if (!largest || entry.size > largest.size) return entry;
      return largest;
    },
    null
  );

  const lines = [
    `Current event contains ${hitCollections.length} hit collections and ${trackCollections.length} track collections.`,
    'Geometry tree hides detector subtrees; collection tree hides LDMX event products.',
    dominantHit
      ? `Most populated visible collection: ${dominantHit.name} (${dominantHit.size}).`
      : 'No hit collections are present in this event.'
  ];

  const sampleLabel = findMetadata(metadata, /^sample_label$/i);
  const sampleModel = findMetadata(metadata, /^sample_model$/i);
  const sampleSelection = findMetadata(metadata, /^sample_selection$/i);
  const sampleDescription = findMetadata(metadata, /^sample_description$/i);
  const sampleParts = [sampleLabel, sampleModel, sampleSelection].filter(Boolean);
  if (sampleParts.length) {
    lines.unshift(`Sample: ${sampleParts.join(' / ')}.`);
  }
  if (sampleDescription) {
    lines.unshift(sampleDescription);
  }

  if (hcalVetoSummary) {
    lines.unshift(
      hcalVetoSummary.pass.toLowerCase() === 'true'
        ? `HCAL veto passes with total PE ${hcalVetoSummary.totalPe}.`
        : `HCAL veto fails in ${hcalVetoSummary.maxSection} at layer ${hcalVetoSummary.maxLayer} with max PE ${hcalVetoSummary.maxPe}.`
    );
  }

  if (ecalVetoSummary) {
    const disc = formatNumber(ecalVetoSummary.disc, {
      decimals: 3,
      scientificBelow: 1e-4
    });
    const margin =
      ecalVetoSummary.discMargin == null
        ? null
        : formatNumber(ecalVetoSummary.discMargin, {
            decimals: 3,
            scientificBelow: 1e-4,
            signed: true
          });
    const passLabel =
      ecalVetoSummary.pass == null
        ? 'ECAL veto unavailable'
        : ecalVetoSummary.pass
          ? `ECAL veto passes at disc ${disc}`
          : `ECAL veto fails at disc ${disc}`;

    lines.unshift(
      margin
        ? `${passLabel} (margin ${margin}).`
        : `${passLabel}.`
    );

    if (ecalVetoSummary.interestingTags.length) {
      lines.unshift(
        `Interesting ECAL-veto features: ${ecalVetoSummary.interestingTags.join(', ')}.`
      );
    }
  }

  return lines;
}

function findMetadata(metadata: MetadataEntry[], pattern: RegExp) {
  return metadata.find((entry) => pattern.test(entry.label))?.value ?? '';
}
