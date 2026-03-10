import type {
  TruthHierarchyLink,
  TruthParticle
} from '../../types';
import { truthDisplayEnergy } from '../../utils/truth';

type TruthTreeProps = {
  childrenMap: Map<number, TruthHierarchyLink[]>;
  onSelectTrack: (trackId: number | null) => void;
  roots: TruthParticle[];
  selectedTrackId: number | null;
};

/**
 * Hierarchical truth-particle browser used by the inspector.
 */
export function TruthTree({
  childrenMap,
  onSelectTrack,
  roots,
  selectedTrackId
}: TruthTreeProps) {
  return (
    <div className="truth-panel__tree">
      {roots.length ? (
        roots.map((particle) => (
          <TruthTreeRow
            key={particle.trackId}
            childrenMap={childrenMap}
            onSelectTrack={onSelectTrack}
            particle={particle}
            selectedTrackId={selectedTrackId}
          />
        ))
      ) : (
        <div className="truth-panel__empty">no truth tracks match filters</div>
      )}
    </div>
  );
}

type TruthTreeRowProps = {
  childrenMap: Map<number, TruthHierarchyLink[]>;
  onSelectTrack: (trackId: number | null) => void;
  particle: TruthParticle;
  relation?: TruthHierarchyLink['relation'];
  selectedTrackId: number | null;
  viaTrackIds?: number[];
};

function TruthTreeRow({
  childrenMap,
  onSelectTrack,
  particle,
  relation,
  selectedTrackId,
  viaTrackIds = []
}: TruthTreeRowProps) {
  const children = childrenMap.get(particle.trackId) ?? [];

  return (
    <div className="truth-tree__node">
      <button
        className={`truth-tree__row ${
          selectedTrackId === particle.trackId ? 'truth-tree__row--selected' : ''
        }`}
        onClick={() => onSelectTrack(particle.trackId)}
        type="button"
      >
        <span>
          {particle.trackId} {particle.pdgId == null ? '' : `(${particle.pdgId})`}
          {relation === 'inferred' ? ` <- via ${viaTrackIds.join(', ')}` : ''}
        </span>
        <small>
          {truthDisplayEnergy(particle).toFixed(1)} MeV · {children.length} /{' '}
          {particle.daughterIds.length}
        </small>
      </button>
      {children.length ? (
        <div className="truth-tree__children">
          {children.map((child) => (
            <TruthTreeRow
              key={child.child.trackId}
              childrenMap={childrenMap}
              onSelectTrack={onSelectTrack}
              particle={child.child}
              relation={child.relation}
              selectedTrackId={selectedTrackId}
              viaTrackIds={child.viaTrackIds}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
