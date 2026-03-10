import type {
  TruthContributionSummary,
  TruthParticle,
  TruthTrajectory
} from '../../types';
import { sanitizeTrajectoryPoints } from '../../utils/truthTrajectoryDisplay';

type TruthDetailsProps = {
  contributions: TruthContributionSummary[];
  selectedHierarchy: {
    bridgedDaughters: number[];
    directChildren: number;
    inferredChildren: number;
    missingDaughters: number[];
    visibleChildren: number;
  };
  selectedParticle: TruthParticle | null;
  selectedTrajectory: TruthTrajectory | null;
};

/**
 * Detailed readout for the currently selected truth particle.
 */
export function TruthDetails({
  contributions,
  selectedHierarchy,
  selectedParticle,
  selectedTrajectory
}: TruthDetailsProps) {
  if (!selectedParticle) return null;

  const detailRows = buildTruthDetailRows(
    selectedParticle,
    selectedHierarchy,
    selectedTrajectory
  );

  return (
    <>
      <dl className="inspector-kv">
        {detailRows.map(([label, value]) => (
          <div key={label} className="inspector-kv__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="truth-panel__hits">
        {contributions.map((entry) => (
          <button
            key={entry.collectionName}
            className="truth-panel__hit"
            type="button"
          >
            <span>{entry.collectionName}</span>
            <small>
              {entry.count} / {entry.totalEnergy.toFixed(3)}
            </small>
          </button>
        ))}
      </div>
    </>
  );
}

function buildTruthDetailRows(
  particle: TruthParticle,
  hierarchy: TruthDetailsProps['selectedHierarchy'],
  trajectory: TruthTrajectory | null
) {
  const sanitizedTrajectoryEnd = getSanitizedTrajectoryEnd(trajectory);

  return [
    ['track', String(particle.trackId)],
    ['pdg', particle.pdgId == null ? '—' : String(particle.pdgId)],
    [
      'kinetic E',
      particle.kineticEnergy == null
        ? particle.energy == null
          ? '—'
          : particle.energy.toFixed(2)
        : particle.kineticEnergy.toFixed(2)
    ],
    ['total E', particle.energy == null ? '—' : particle.energy.toFixed(2)],
    ['mass', particle.mass == null ? '—' : particle.mass.toFixed(2)],
    ['process', particle.processType || '—'],
    [
      'parents',
      particle.parentIds.length ? particle.parentIds.join(', ') : '—'
    ],
    [
      'daughters',
      particle.daughterIds.length ? particle.daughterIds.join(', ') : '—'
    ],
    ['visible daughters', String(hierarchy.visibleChildren)],
    ['direct daughters', String(hierarchy.directChildren)],
    ['inferred daughters', String(hierarchy.inferredChildren)],
    [
      'missing daughters',
      hierarchy.missingDaughters.length
        ? hierarchy.missingDaughters.join(', ')
        : '—'
    ],
    ['vertex', particle.vertexVolume || '—'],
    ['material', particle.interactionMaterial || '—'],
    [
      'start',
      particle.vertex ? formatVector3(particle.vertex) : '—'
    ],
    [
      'path end',
      sanitizedTrajectoryEnd
        ? formatVector3(sanitizedTrajectoryEnd)
        : particle.endpoint
          ? formatVector3(particle.endpoint)
          : '—'
    ],
    ['sim end', particle.endpoint ? formatVector3(particle.endpoint) : '—']
  ] satisfies Array<[string, string]>;
}

function getSanitizedTrajectoryEnd(trajectory: TruthTrajectory | null) {
  if (!trajectory) return null;
  const points = sanitizeTrajectoryPoints(trajectory.points);
  const lastPoint = points.length ? points[points.length - 1] : null;
  return lastPoint?.position ?? null;
}

function formatVector3(value: [number, number, number]) {
  return value.map((entry) => entry.toFixed(1)).join(', ');
}
