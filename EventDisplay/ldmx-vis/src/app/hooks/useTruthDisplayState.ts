import { useEffect, useMemo, useState } from 'react';
import type { PhoenixEventData, TruthFilterState } from '../types';
import {
  buildTruthChildrenMap,
  chooseDefaultTruthTrack,
  collectTruthDescendants,
  extractTruthParticles,
  extractTruthTrajectories,
  summarizeTruthContributions,
  summarizeTruthHierarchy
} from '../utils/truth';
import {
  filterTruthParticles,
  filterTruthTrajectories,
  getTruthProcessOptions
} from '../utils/truthFilters';

const DEFAULT_TRUTH_FILTERS: TruthFilterState = {
  hideOrphanedLowEnergyEm: false,
  minEnergy: 0,
  orphanedEmEnergyThreshold: 50,
  processType: '',
  species: 'all'
};

/**
 * Owns truth selection/filter state and all derived lineage/trajectory views
 * used by the inspector and scene overlay.
 */
export function useTruthDisplayState(
  currentEventData: PhoenixEventData | null,
  showTrajectoryDescendants: boolean
) {
  const [selectedTruthTrackId, setSelectedTruthTrackId] = useState<number | null>(
    null
  );
  const [truthFilters, setTruthFilters] =
    useState<TruthFilterState>(DEFAULT_TRUTH_FILTERS);

  const truthParticles = useMemo(
    () => extractTruthParticles(currentEventData),
    [currentEventData]
  );
  const truthProcessOptions = useMemo(
    () => getTruthProcessOptions(truthParticles),
    [truthParticles]
  );
  const filteredTruthParticles = useMemo(
    () => filterTruthParticles(truthParticles, truthFilters),
    [truthFilters, truthParticles]
  );
  const truthTrajectories = useMemo(
    () => extractTruthTrajectories(currentEventData),
    [currentEventData]
  );
  const filteredTruthTrajectories = useMemo(
    () =>
      filterTruthTrajectories(
        truthTrajectories,
        new Set(filteredTruthParticles.map((particle) => particle.trackId))
      ),
    [filteredTruthParticles, truthTrajectories]
  );
  const truthChildrenMap = useMemo(
    () => buildTruthChildrenMap(filteredTruthParticles),
    [filteredTruthParticles]
  );
  const selectedTruthParticle = useMemo(
    () =>
      filteredTruthParticles.find(
        (particle) => particle.trackId === selectedTruthTrackId
      ) ?? null,
    [filteredTruthParticles, selectedTruthTrackId]
  );
  const selectedTruthTrajectory = useMemo(
    () =>
      selectedTruthTrackId == null
        ? null
        : filteredTruthTrajectories.get(selectedTruthTrackId) ?? null,
    [filteredTruthTrajectories, selectedTruthTrackId]
  );
  const selectedTruthHierarchy = useMemo(
    () =>
      summarizeTruthHierarchy(
        selectedTruthParticle,
        truthChildrenMap.childrenMap
      ),
    [selectedTruthParticle, truthChildrenMap]
  );
  const selectedTruthTrackIds = useMemo(() => {
    if (selectedTruthTrackId == null) return [] as number[];
    return [
      selectedTruthTrackId,
      ...collectTruthDescendants(
        selectedTruthTrackId,
        truthChildrenMap.childrenMap
      )
    ];
  }, [selectedTruthTrackId, truthChildrenMap]);
  const overlayTruthTrackIds = useMemo(() => {
    if (selectedTruthTrackId == null) return [] as number[];
    if (showTrajectoryDescendants) return selectedTruthTrackIds;
    return [selectedTruthTrackId];
  }, [selectedTruthTrackId, selectedTruthTrackIds, showTrajectoryDescendants]);
  const truthContributions = useMemo(
    () => summarizeTruthContributions(currentEventData, selectedTruthTrackIds),
    [currentEventData, selectedTruthTrackIds]
  );

  useEffect(() => {
    const nextDefaultTrackId = chooseDefaultTruthTrack(filteredTruthParticles);
    setSelectedTruthTrackId((previous) => {
      if (
        previous != null &&
        filteredTruthParticles.some((particle) => particle.trackId === previous)
      ) {
        return previous;
      }
      return nextDefaultTrackId;
    });
  }, [filteredTruthParticles]);

  function setTruthFilterProcessType(processType: string) {
    setTruthFilters((previous) => ({ ...previous, processType }));
  }

  function setTruthFilterSpecies(species: TruthFilterState['species']) {
    setTruthFilters((previous) => ({ ...previous, species }));
  }

  function setTruthFilterMinEnergy(minEnergy: number) {
    setTruthFilters((previous) => ({ ...previous, minEnergy }));
  }

  function setTruthFilterHideOrphanedLowEnergyEm(
    hideOrphanedLowEnergyEm: boolean
  ) {
    setTruthFilters((previous) => ({ ...previous, hideOrphanedLowEnergyEm }));
  }

  function setTruthFilterOrphanedEmEnergyThreshold(
    orphanedEmEnergyThreshold: number
  ) {
    setTruthFilters((previous) => ({
      ...previous,
      orphanedEmEnergyThreshold
    }));
  }

  function resetTruthFilters() {
    setTruthFilters(DEFAULT_TRUTH_FILTERS);
  }

  return {
    overlayTruthTrackIds,
    resetTruthFilters,
    selectedTruthHierarchy,
    selectedTruthParticle,
    selectedTruthTrackId,
    selectedTruthTrajectory,
    setSelectedTruthTrackId,
    setTruthFilterHideOrphanedLowEnergyEm,
    setTruthFilterMinEnergy,
    setTruthFilterOrphanedEmEnergyThreshold,
    setTruthFilterProcessType,
    setTruthFilterSpecies,
    truthChildrenMap: truthChildrenMap.childrenMap,
    truthContributions,
    truthFilterProcessOptions: truthProcessOptions,
    truthFilters,
    truthParticles: filteredTruthParticles,
    truthRoots: truthChildrenMap.roots,
    truthTrajectories: filteredTruthTrajectories
  };
}
