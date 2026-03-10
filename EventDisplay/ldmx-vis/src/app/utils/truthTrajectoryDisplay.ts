import type { TruthTrajectory } from '../types';

const WORLD_VOLUME = 'World_PV';
const WORLD_ESCAPE_DISTANCE_MM = 500;

function distance(
  left: [number, number, number],
  right: [number, number, number]
) {
  return Math.hypot(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2]
  );
}

/**
 * Drops the final bookkeeping jump to the far world boundary that Geant can
 * produce for escaped particles. Those points are useful for persistence but
 * visually misleading in the frontend.
 */
export function sanitizeTrajectoryPoints(
  points: TruthTrajectory['points']
): TruthTrajectory['points'] {
  if (points.length < 2) return points;

  const sanitized = [...points];

  while (sanitized.length >= 2) {
    const last = sanitized[sanitized.length - 1];
    const previous = sanitized[sanitized.length - 2];
    if (!last || !previous) break;
    const terminalWorldEscape =
      last.kind === 'endpoint' &&
      last.volume === WORLD_VOLUME &&
      distance(last.position, previous.position) > WORLD_ESCAPE_DISTANCE_MM;

    if (!terminalWorldEscape) break;
    sanitized.pop();
  }

  return sanitized;
}
