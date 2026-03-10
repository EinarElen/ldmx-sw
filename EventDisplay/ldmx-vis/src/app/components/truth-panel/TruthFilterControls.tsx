import type { TruthFilterState } from '../../types';

type TruthFilterControlsProps = {
  filters: TruthFilterState;
  processOptions: string[];
  onFilterHideOrphanedLowEnergyEmChange: (value: boolean) => void;
  onFilterMinEnergyChange: (value: number) => void;
  onFilterOrphanedEmEnergyThresholdChange: (value: number) => void;
  onFilterProcessTypeChange: (value: string) => void;
  onFilterReset: () => void;
  onFilterSpeciesChange: (value: TruthFilterState['species']) => void;
};

/**
 * Filter toolbar for the truth inspector tree.
 */
export function TruthFilterControls({
  filters,
  processOptions,
  onFilterHideOrphanedLowEnergyEmChange,
  onFilterMinEnergyChange,
  onFilterOrphanedEmEnergyThresholdChange,
  onFilterProcessTypeChange,
  onFilterReset,
  onFilterSpeciesChange
}: TruthFilterControlsProps) {
  return (
    <div className="truth-panel__filters">
      <label className="truth-panel__field">
        <span>species</span>
        <select
          onChange={(event) =>
            onFilterSpeciesChange(
              event.target.value as TruthFilterState['species']
            )
          }
          value={filters.species}
        >
          <option value="all">all</option>
          <option value="em">EM</option>
          <option value="muon">muon</option>
          <option value="chargedHadron">charged hadron</option>
          <option value="neutralHadron">neutral hadron</option>
          <option value="ion">ion</option>
          <option value="other">other</option>
        </select>
      </label>
      <label className="truth-panel__field">
        <span>process</span>
        <select
          onChange={(event) => onFilterProcessTypeChange(event.target.value)}
          value={filters.processType}
        >
          <option value="">all</option>
          {processOptions.map((processType) => (
            <option key={processType} value={processType}>
              {processType}
            </option>
          ))}
        </select>
      </label>
      <label className="truth-panel__field">
        <span>min KE [MeV]</span>
        <input
          className="truth-panel__input"
          min="0"
          onChange={(event) =>
            onFilterMinEnergyChange(Number(event.target.value) || 0)
          }
          step="10"
          type="number"
          value={filters.minEnergy}
        />
      </label>
      <label className="truth-panel__toggle">
        <span>hide orphan low-E EM</span>
        <input
          checked={filters.hideOrphanedLowEnergyEm}
          onChange={(event) =>
            onFilterHideOrphanedLowEnergyEmChange(event.target.checked)
          }
          type="checkbox"
        />
      </label>
      <label className="truth-panel__field">
        <span>orphan EM cut [MeV]</span>
        <input
          className="truth-panel__input"
          min="0"
          onChange={(event) =>
            onFilterOrphanedEmEnergyThresholdChange(
              Number(event.target.value) || 0
            )
          }
          step="10"
          type="number"
          value={filters.orphanedEmEnergyThreshold}
        />
      </label>
      <button className="truth-panel__reset" onClick={onFilterReset} type="button">
        reset filters
      </button>
    </div>
  );
}
