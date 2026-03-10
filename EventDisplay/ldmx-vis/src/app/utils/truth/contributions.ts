import type { PhoenixEventData, TruthContributionSummary } from '../../types';
import { normalizeNumberList, numberValue } from './shared';

/**
 * Aggregates hit-level truth contribution evidence for the selected lineage
 * by scanning the various truth-id fields emitted on displayable hit objects.
 */
export function summarizeTruthContributions(
  eventData: PhoenixEventData | null,
  selectedTrackIds: number[]
): TruthContributionSummary[] {
  if (!eventData || !selectedTrackIds.length) return [];

  const trackIdSet = new Set(selectedTrackIds);
  const summaries: TruthContributionSummary[] = [];

  for (const [collectionName, entries] of Object.entries(eventData.Hits ?? {})) {
    if (!Array.isArray(entries)) continue;

    let count = 0;
    let totalEnergy = 0;
    const matchedTrackIds = new Set<number>();

    for (const entry of entries) {
      const record = entry as Record<string, unknown>;
      const relatedTrackIds = extractHitTrackIds(record);

      if (!relatedTrackIds.some((id) => trackIdSet.has(id))) continue;

      count += 1;
      totalEnergy += numberValue(record.energy);
      for (const id of relatedTrackIds) {
        if (trackIdSet.has(id)) matchedTrackIds.add(id);
      }
    }

    if (!count) continue;

    summaries.push({
      collectionName,
      count,
      totalEnergy,
      trackIds: Array.from(matchedTrackIds).sort((left, right) => left - right)
    });
  }

  return summaries.sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return right.totalEnergy - left.totalEnergy;
  });
}

function extractHitTrackIds(hit: Record<string, unknown>) {
  const ids = new Set<number>();

  for (const value of normalizeNumberList(hit.trackIDs)) ids.add(value);
  for (const value of normalizeNumberList(hit.incidentIDs)) ids.add(value);
  for (const value of normalizeNumberList(hit.originID)) ids.add(value);
  for (const value of normalizeNumberList(hit.immediate_child)) ids.add(value);

  return Array.from(ids);
}
