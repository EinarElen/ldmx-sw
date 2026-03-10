type TitleBarProps = {
  clipping: boolean;
  currentEventIndex: number;
  eventCount: number;
  inspectorOpen: boolean;
  onGeometryImport: () => void;
  onImportEvent: () => void;
  onInspectorToggle: () => void;
  onNextEvent: () => void;
  onPreviousEvent: () => void;
  onToggleClipping: () => void;
  onToggleProjection: () => void;
  orthographic: boolean;
};

export function TitleBar({
  clipping,
  currentEventIndex,
  eventCount,
  inspectorOpen,
  onGeometryImport,
  onImportEvent,
  onInspectorToggle,
  onNextEvent,
  onPreviousEvent,
  onToggleClipping,
  onToggleProjection,
  orthographic
}: TitleBarProps) {
  return (
    <header className="titlebar">
      <div className="titlebar__path">ldmx / event-display</div>
      <div className="titlebar__event-nav">
        <button
          className="chrome-button"
          disabled={currentEventIndex <= 0}
          onClick={onPreviousEvent}
          type="button"
        >
          prev
        </button>
        <span className="titlebar__event-label">
          {eventCount
            ? currentEventIndex >= 0
              ? `${currentEventIndex + 1} / ${eventCount}`
              : `— / ${eventCount}`
            : '0 / 0'}
        </span>
        <button
          className="chrome-button"
          disabled={eventCount === 0 || currentEventIndex >= eventCount - 1}
          onClick={onNextEvent}
          type="button"
        >
          next
        </button>
      </div>
      <div className="titlebar__actions">
        <button className="chrome-button" onClick={onImportEvent} type="button">
          event
        </button>
        <button className="chrome-button" onClick={onGeometryImport} type="button">
          geometry
        </button>
        <button className="chrome-button" onClick={onToggleProjection} type="button">
          {orthographic ? 'ortho' : 'persp'}
        </button>
        <button className="chrome-button" onClick={onToggleClipping} type="button">
          {clipping ? 'clip on' : 'clip off'}
        </button>
        <button className="chrome-button" onClick={onInspectorToggle} type="button">
          {inspectorOpen ? 'inspector on' : 'inspector off'}
        </button>
      </div>
    </header>
  );
}
