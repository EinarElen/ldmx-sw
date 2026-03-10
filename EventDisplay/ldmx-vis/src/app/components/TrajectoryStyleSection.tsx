import { CollapsibleSidebarSection } from './CollapsibleSidebarSection';
import type {
  TrajectoryColorMode,
  TrajectorySizeMode,
  TrajectoryStyleMode,
  TrajectoryVisualStyle
} from '../types';

type TrajectoryStyleSectionProps = {
  onColorModeChange: (mode: TrajectoryColorMode) => void;
  onSizeModeChange: (mode: TrajectorySizeMode) => void;
  onSizeScaleChange: (value: number) => void;
  onStyleModeChange: (mode: TrajectoryStyleMode) => void;
  onEmphasizeSelectedChange: (value: boolean) => void;
  onShowDescendantsChange: (value: boolean) => void;
  style: TrajectoryVisualStyle;
};

export function TrajectoryStyleSection({
  onColorModeChange,
  onSizeModeChange,
  onSizeScaleChange,
  onStyleModeChange,
  onEmphasizeSelectedChange,
  onShowDescendantsChange,
  style
}: TrajectoryStyleSectionProps) {
  return (
    <CollapsibleSidebarSection title="trajectory styling">
      <div className="sidebar-controls">
        <label className="sidebar-field">
          <span>color</span>
          <select
            value={style.colorMode}
            onChange={(event) =>
              onColorModeChange(event.target.value as TrajectoryColorMode)
            }
          >
            <option value="selection">selection</option>
            <option value="pdg">species</option>
            <option value="role">source</option>
            <option value="track">track id</option>
          </select>
        </label>

        <label className="sidebar-field">
          <span>style</span>
          <select
            value={style.styleMode}
            onChange={(event) =>
              onStyleModeChange(event.target.value as TrajectoryStyleMode)
            }
          >
            <option value="plain">plain</option>
            <option value="species">species</option>
            <option value="role">source</option>
          </select>
        </label>

        <label className="sidebar-field">
          <span>width</span>
          <select
            value={style.sizeMode}
            onChange={(event) =>
              onSizeModeChange(event.target.value as TrajectorySizeMode)
            }
          >
            <option value="uniform">uniform</option>
            <option value="pdg">species</option>
            <option value="role">source</option>
          </select>
        </label>

        <label className="sidebar-slider">
          <span>{style.sizeScale.toFixed(2)}</span>
          <input
            type="range"
            min="0.5"
            max="2.4"
            step="0.05"
            value={style.sizeScale}
            onChange={(event) =>
              onSizeScaleChange(Number(event.target.value))
            }
          />
        </label>

        <label className="sidebar-toggle">
          <span>show daughters</span>
          <input
            checked={style.showDescendants}
            onChange={(event) =>
              onShowDescendantsChange(event.target.checked)
            }
            type="checkbox"
          />
        </label>

        <label className="sidebar-toggle">
          <span>emphasize selected</span>
          <input
            checked={style.emphasizeSelected}
            onChange={(event) =>
              onEmphasizeSelectedChange(event.target.checked)
            }
            type="checkbox"
          />
        </label>
      </div>
    </CollapsibleSidebarSection>
  );
}
