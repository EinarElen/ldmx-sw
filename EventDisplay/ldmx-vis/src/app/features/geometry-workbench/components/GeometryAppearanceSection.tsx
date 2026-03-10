import { CollapsibleSidebarSection } from '../../../components/CollapsibleSidebarSection';
import type {
  GeometryAppearanceOverride,
  GeometrySelectionTarget,
  HcalProxyGranularity
} from '../../../types';

type GeometryAppearanceSectionProps = {
  appearance: GeometryAppearanceOverride | null;
  hcalProxyGranularity: HcalProxyGranularity;
  onChange: (patch: Partial<GeometryAppearanceOverride>) => void;
  onHcalProxyGranularityChange: (value: HcalProxyGranularity) => void;
  onReset: () => void;
  selectedLabel: string | null;
  selectedTarget: GeometrySelectionTarget | null;
};

export function GeometryAppearanceSection({
  appearance,
  hcalProxyGranularity,
  onChange,
  onHcalProxyGranularityChange,
  onReset,
  selectedLabel,
  selectedTarget
}: GeometryAppearanceSectionProps) {
  return (
    <CollapsibleSidebarSection
      className="geometry-workbench__section"
      title="appearance"
    >
      <div className="geometry-workbench__controls">
        <label className="sidebar-field">
          <span>hcal proxy</span>
          <select
            onChange={(event) =>
              onHcalProxyGranularityChange(
                event.target.value as HcalProxyGranularity
              )
            }
            value={hcalProxyGranularity}
          >
            <option value="section">section</option>
            <option value="layerGroup">layer group</option>
            <option value="layer">layer</option>
          </select>
        </label>
      </div>
      {appearance && selectedTarget?.type !== 'plane' ? (
        <div className="geometry-workbench__controls">
          <div className="geometry-workbench__selection-label">
            {selectedLabel}
          </div>
          <label className="sidebar-field">
            <span>mode</span>
            <select
              onChange={(event) =>
                onChange({
                  renderMode: event.target.value as GeometryAppearanceOverride['renderMode']
                })
              }
              value={appearance.renderMode}
            >
              <option value="solid">solid</option>
              <option value="ghost">ghost</option>
              <option value="wire">wire</option>
              <option value="solidWire">solid+wire</option>
              <option value="hidden">hidden</option>
            </select>
          </label>
          <label className="sidebar-slider">
            <span>{appearance.opacity.toFixed(2)}</span>
            <input
              max="1"
              min="0"
              onChange={(event) =>
                onChange({ opacity: Number(event.target.value) })
              }
              step="0.02"
              type="range"
              value={appearance.opacity}
            />
          </label>
          <label className="sidebar-field">
            <span>tint</span>
            <select
              onChange={(event) =>
                onChange({
                  color: appearance.color ?? '#61afef',
                  colorMode: event.target.value as GeometryAppearanceOverride['colorMode']
                })
              }
              value={appearance.colorMode}
            >
              <option value="default">default</option>
              <option value="custom">custom</option>
            </select>
          </label>
          {appearance.colorMode === 'custom' ? (
            <label className="sidebar-field">
              <span>color</span>
              <input
                className="geometry-workbench__color"
                onChange={(event) => onChange({ color: event.target.value })}
                type="color"
                value={appearance.color ?? '#61afef'}
              />
            </label>
          ) : null}
          <label className="sidebar-slider">
            <span>{appearance.edgeOpacity.toFixed(2)}</span>
            <input
              max="1"
              min="0"
              onChange={(event) =>
                onChange({ edgeOpacity: Number(event.target.value) })
              }
              step="0.02"
              type="range"
              value={appearance.edgeOpacity}
            />
          </label>
          <button className="chrome-button" onClick={onReset} type="button">
            reset
          </button>
        </div>
      ) : (
        <p className="sidebar-section__hint">
          select a geometry node or group to edit appearance
        </p>
      )}
    </CollapsibleSidebarSection>
  );
}
