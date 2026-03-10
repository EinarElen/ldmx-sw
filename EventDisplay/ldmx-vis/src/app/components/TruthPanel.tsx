import type {
  TruthFilterState,
  TruthContributionSummary,
  TruthHierarchyLink,
  TruthParticle,
  TruthTrajectory
} from '../types';
import { TruthDetails } from './truth-panel/TruthDetails';
import { TruthFilterControls } from './truth-panel/TruthFilterControls';
import { TruthTree } from './truth-panel/TruthTree';

type TruthPanelProps = {
  childrenMap: Map<number, TruthHierarchyLink[]>;
  contributions: TruthContributionSummary[];
  filters: TruthFilterState;
  onSelectTrack: (trackId: number | null) => void;
  onFilterHideOrphanedLowEnergyEmChange: (value: boolean) => void;
  onFilterMinEnergyChange: (value: number) => void;
  onFilterOrphanedEmEnergyThresholdChange: (value: number) => void;
  onFilterProcessTypeChange: (value: string) => void;
  onFilterReset: () => void;
  onFilterSpeciesChange: (value: TruthFilterState['species']) => void;
  particles: TruthParticle[];
  processOptions: string[];
  roots: TruthParticle[];
  selectedHierarchy: {
    bridgedDaughters: number[];
    directChildren: number;
    inferredChildren: number;
    missingDaughters: number[];
    visibleChildren: number;
  };
  selectedParticle: TruthParticle | null;
  selectedTrackId: number | null;
  selectedTrajectory: TruthTrajectory | null;
};

export function TruthPanel({
  childrenMap,
  contributions,
  filters,
  onSelectTrack,
  onFilterHideOrphanedLowEnergyEmChange,
  onFilterMinEnergyChange,
  onFilterOrphanedEmEnergyThresholdChange,
  onFilterProcessTypeChange,
  onFilterReset,
  onFilterSpeciesChange,
  particles,
  processOptions,
  roots,
  selectedHierarchy,
  selectedParticle,
  selectedTrackId,
  selectedTrajectory
}: TruthPanelProps) {
  if (!particles.length && !processOptions.length) return null;

  return (
    <section className="inspector__details">
      <header className="inspector__subheader">truth</header>
      <div className="truth-panel__toolbar">
        <span>track</span>
        <input
          className="truth-panel__input"
          onChange={(event) => {
            const value = event.target.value.trim();
            onSelectTrack(value ? Number(value) : null);
          }}
          type="number"
          value={selectedTrackId ?? ''}
        />
        <small>{particles.length} shown</small>
      </div>
      <TruthFilterControls
        filters={filters}
        onFilterHideOrphanedLowEnergyEmChange={
          onFilterHideOrphanedLowEnergyEmChange
        }
        onFilterMinEnergyChange={onFilterMinEnergyChange}
        onFilterOrphanedEmEnergyThresholdChange={
          onFilterOrphanedEmEnergyThresholdChange
        }
        onFilterProcessTypeChange={onFilterProcessTypeChange}
        onFilterReset={onFilterReset}
        onFilterSpeciesChange={onFilterSpeciesChange}
        processOptions={processOptions}
      />
      <TruthTree
        childrenMap={childrenMap}
        onSelectTrack={onSelectTrack}
        roots={roots}
        selectedTrackId={selectedTrackId}
      />
      <TruthDetails
        contributions={contributions}
        selectedHierarchy={selectedHierarchy}
        selectedParticle={selectedParticle}
        selectedTrajectory={selectedTrajectory}
      />
    </section>
  );
}
