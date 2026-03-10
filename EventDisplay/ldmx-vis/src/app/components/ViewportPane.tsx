import type { ReactNode } from 'react';

type ViewportPaneProps = {
  currentEventKey: string;
  displayId: string;
  eventCount: number;
  navigationControls?: ReactNode;
  overlayControls?: ReactNode;
};

export function ViewportPane({
  currentEventKey,
  displayId,
  eventCount,
  navigationControls,
  overlayControls
}: ViewportPaneProps) {
  return (
    <section className="viewport-shell">
      <div className="viewport-frame">
        <div id={displayId} className="viewport-frame__canvas" />

        {!eventCount ? (
          <div className="viewport-empty">no event loaded — import event</div>
        ) : null}

        {navigationControls ? (
          <div className="viewport-overlay viewport-overlay--top-left">
            {navigationControls}
          </div>
        ) : null}

        <div className="viewport-overlay viewport-overlay--bottom">
          {overlayControls}
          {currentEventKey ? (
            <div className="canvas-readout">{currentEventKey}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
