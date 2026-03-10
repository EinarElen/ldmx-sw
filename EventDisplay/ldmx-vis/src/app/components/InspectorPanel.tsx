import { EcalVetoSection } from './EcalVetoSection';
import { EventGuideSection } from './EventGuideSection';
import { HcalVetoSection } from './HcalVetoSection';
import { TruthPanel } from './TruthPanel';
import type {
  EcalVetoSummary,
  HcalVetoSummary,
  TruthFilterState,
  TruthContributionSummary,
  TruthHierarchyLink,
  TruthParticle,
  TruthTrajectory
} from '../types';

type InspectorPanelProps = {
  currentEventIndex: number;
  ecalVetoSummary: EcalVetoSummary | null;
  eventCount: number;
  eventGuide: string[];
  hcalVetoSummary: HcalVetoSummary | null;
  onSelectTruthTrack: (trackId: number | null) => void;
  onTruthFilterHideOrphanedLowEnergyEmChange: (value: boolean) => void;
  onTruthFilterMinEnergyChange: (value: number) => void;
  onTruthFilterOrphanedEmEnergyThresholdChange: (value: number) => void;
  onTruthFilterProcessTypeChange: (value: string) => void;
  onTruthFilterSpeciesChange: (value: TruthFilterState['species']) => void;
  onTruthFilterReset: () => void;
  selectedTruthParticle: TruthParticle | null;
  selectedTruthTrackId: number | null;
  selectedTruthTrajectory: TruthTrajectory | null;
  selectedTruthHierarchy: {
    bridgedDaughters: number[];
    directChildren: number;
    inferredChildren: number;
    missingDaughters: number[];
    visibleChildren: number;
  };
  truthChildrenMap: Map<number, TruthHierarchyLink[]>;
  truthContributions: TruthContributionSummary[];
  truthFilterProcessOptions: string[];
  truthFilters: TruthFilterState;
  truthParticles: TruthParticle[];
  truthRoots: TruthParticle[];
};

export function InspectorPanel({
  currentEventIndex,
  ecalVetoSummary,
  eventCount,
  eventGuide,
  hcalVetoSummary,
  onSelectTruthTrack,
  onTruthFilterHideOrphanedLowEnergyEmChange,
  onTruthFilterMinEnergyChange,
  onTruthFilterOrphanedEmEnergyThresholdChange,
  onTruthFilterProcessTypeChange,
  onTruthFilterSpeciesChange,
  onTruthFilterReset,
  selectedTruthParticle,
  selectedTruthHierarchy,
  selectedTruthTrackId,
  selectedTruthTrajectory,
  truthChildrenMap,
  truthContributions,
  truthFilterProcessOptions,
  truthFilters,
  truthParticles,
  truthRoots
}: InspectorPanelProps) {
  return (
    <aside className="inspector">
      <header className="inspector__header">
        inspector {currentEventIndex >= 0 ? `${currentEventIndex + 1}/${eventCount}` : ''}
      </header>
      <div className="inspector__body">
        <EventGuideSection lines={eventGuide} />
        <TruthPanel
          childrenMap={truthChildrenMap}
          contributions={truthContributions}
          onSelectTrack={onSelectTruthTrack}
          onFilterHideOrphanedLowEnergyEmChange={
            onTruthFilterHideOrphanedLowEnergyEmChange
          }
          onFilterMinEnergyChange={onTruthFilterMinEnergyChange}
          onFilterOrphanedEmEnergyThresholdChange={
            onTruthFilterOrphanedEmEnergyThresholdChange
          }
          onFilterProcessTypeChange={onTruthFilterProcessTypeChange}
          onFilterReset={onTruthFilterReset}
          onFilterSpeciesChange={onTruthFilterSpeciesChange}
          particles={truthParticles}
          processOptions={truthFilterProcessOptions}
          roots={truthRoots}
          selectedHierarchy={selectedTruthHierarchy}
          selectedParticle={selectedTruthParticle}
          selectedTrackId={selectedTruthTrackId}
          selectedTrajectory={selectedTruthTrajectory}
          filters={truthFilters}
        />
        <EcalVetoSection summary={ecalVetoSummary} title="ecal veto" />
        <HcalVetoSection summary={hcalVetoSummary} title="hcal veto" />
      </div>
    </aside>
  );
}
