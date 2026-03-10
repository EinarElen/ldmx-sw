import type { TruthHierarchyLink, TruthParticle } from '../../types';
import { truthDisplayEnergy } from './shared';

/**
 * Picks a stable default track for the inspector: prefer visible primaries
 * and rank them by display energy, which is kinetic energy for hadrons.
 */
export function chooseDefaultTruthTrack(particles: TruthParticle[]) {
  if (!particles.length) return null;

  const primary = particles
    .filter((particle) =>
      particle.parentIds.length === 0 || particle.parentIds.includes(0)
    )
    .sort((left, right) => truthDisplayEnergy(right) - truthDisplayEnergy(left))[0];

  const firstParticle = particles[0];
  if (!firstParticle) return null;
  return primary?.trackId ?? firstParticle.trackId;
}

/**
 * Builds the inspector tree from visible truth particles. Missing direct
 * parents are bridged when a visible ancestor claims the missing track id
 * in its daughter list.
 */
export function buildTruthChildrenMap(particles: TruthParticle[]) {
  const particleMap = new Map(
    particles.map((particle) => [particle.trackId, particle] as const)
  );
  const daughterClaimMap = buildDaughterClaimMap(particles);
  const parentLinks = new Map<
    number,
    {
      parentId: number;
      relation: TruthHierarchyLink['relation'];
      viaTrackIds: number[];
    }
  >();
  const childrenMap = new Map<number, TruthHierarchyLink[]>();

  for (const particle of particles) {
    const parentLink = resolveDisplayParent(
      particle,
      particleMap,
      daughterClaimMap
    );
    if (!parentLink) continue;

    parentLinks.set(particle.trackId, parentLink);
    const bucket = childrenMap.get(parentLink.parentId) ?? [];
    bucket.push({
      child: particle,
      relation: parentLink.relation,
      viaTrackIds: parentLink.viaTrackIds
    });
    childrenMap.set(parentLink.parentId, bucket);
  }

  for (const entry of childrenMap.values()) {
    entry.sort((left, right) => left.child.trackId - right.child.trackId);
  }

  const roots = particles.filter((particle) => !parentLinks.has(particle.trackId));

  return {
    childrenMap,
    roots
  };
}

/**
 * Collects descendant track ids from the display hierarchy rather than from
 * raw daughter ids, so inferred links participate in selection/highlighting.
 */
export function collectTruthDescendants(
  trackId: number | null,
  childrenMap: Map<number, TruthHierarchyLink[]>
) {
  if (trackId == null) return [] as number[];

  const descendants: number[] = [];
  const queue = [...(childrenMap.get(trackId) ?? [])];

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    descendants.push(current.child.trackId);
    queue.push(...(childrenMap.get(current.child.trackId) ?? []));
  }

  return descendants;
}

/**
 * Summarizes which visible lineage relationships exist for the currently
 * selected particle and which declared daughter ids remain unavailable.
 */
export function summarizeTruthHierarchy(
  particle: TruthParticle | null,
  childrenMap: Map<number, TruthHierarchyLink[]>
) {
  if (!particle) {
    return {
      visibleChildren: 0,
      directChildren: 0,
      inferredChildren: 0,
      missingDaughters: [] as number[],
      bridgedDaughters: [] as number[]
    };
  }

  const links = childrenMap.get(particle.trackId) ?? [];
  const directChildren = links.filter((link) => link.relation === 'direct');
  const inferredChildren = links.filter((link) => link.relation === 'inferred');
  const bridgedDaughters = new Set<number>();

  for (const link of inferredChildren) {
    for (const id of link.viaTrackIds) {
      bridgedDaughters.add(id);
    }
  }

  const missingDaughters = particle.daughterIds.filter(
    (daughterId) =>
      !directChildren.some((link) => link.child.trackId === daughterId) &&
      !bridgedDaughters.has(daughterId)
  );

  return {
    visibleChildren: links.length,
    directChildren: directChildren.length,
    inferredChildren: inferredChildren.length,
    missingDaughters,
    bridgedDaughters: Array.from(bridgedDaughters).sort((left, right) => left - right)
  };
}

function buildDaughterClaimMap(particles: TruthParticle[]) {
  const map = new Map<number, TruthParticle[]>();

  for (const particle of particles) {
    for (const daughterId of particle.daughterIds.filter((id) => id > 0)) {
      const bucket = map.get(daughterId) ?? [];
      bucket.push(particle);
      map.set(daughterId, bucket);
    }
  }

  for (const entry of map.values()) {
    entry.sort((left, right) => left.trackId - right.trackId);
  }

  return map;
}

function resolveDisplayParent(
  particle: TruthParticle,
  particleMap: Map<number, TruthParticle>,
  daughterClaimMap: Map<number, TruthParticle[]>
) {
  const directParents = particle.parentIds
    .filter((id) => id > 0)
    .map((id) => particleMap.get(id))
    .filter((entry): entry is TruthParticle => entry != null)
    .sort((left, right) => left.trackId - right.trackId);

  if (directParents.length) {
    const [directParent] = directParents;
    if (!directParent) return null;
    return {
      parentId: directParent.trackId,
      relation: 'direct' as const,
      viaTrackIds: []
    };
  }

  const candidates = particle.parentIds
    .filter((id) => id > 0)
    .map((id) => resolveInferredAncestor(id, daughterClaimMap, new Set<number>()))
    .filter(
      (
        entry
      ): entry is { parentId: number; relation: 'inferred'; viaTrackIds: number[] } =>
        entry != null
    )
    .sort((left, right) => left.parentId - right.parentId);

  return candidates[0] ?? null;
}

function resolveInferredAncestor(
  missingParentId: number,
  daughterClaimMap: Map<number, TruthParticle[]>,
  visitedMissingIds: Set<number>
): { parentId: number; relation: 'inferred'; viaTrackIds: number[] } | null {
  if (visitedMissingIds.has(missingParentId)) return null;
  visitedMissingIds.add(missingParentId);

  const claimers = daughterClaimMap.get(missingParentId) ?? [];
  if (claimers.length) {
    const [firstClaimer] = claimers;
    if (!firstClaimer) return null;
    return {
      parentId: firstClaimer.trackId,
      relation: 'inferred',
      viaTrackIds: [missingParentId]
    };
  }

  return null;
}
