import { STATUS_LABEL } from '../constants';
import type { Status } from '../types';

type StatusBarProps = {
  currentEventIndex: number;
  currentEventKey: string;
  eventCount: number;
  geometryLabel: string;
  sourceLabel: string;
  status: Status;
};

export function StatusBar({
  currentEventIndex,
  currentEventKey,
  eventCount,
  geometryLabel,
  sourceLabel,
  status
}: StatusBarProps) {
  const dotState =
    status === 'ready' ? 'ok' : status === 'error' ? 'err' : 'busy';

  return (
    <footer className="statusbar">
      <div className="statusbar__group">
        <span className="statusbar__item">
          <span className={`statusbar__dot statusbar__dot--${dotState}`} />
          <strong>{STATUS_LABEL[status].toUpperCase()}</strong>
        </span>
        <span className="statusbar__sep">|</span>
        <span className="statusbar__item">
          event <strong>{currentEventKey || 'none'}</strong>
        </span>
        <span className="statusbar__sep">|</span>
        <span className="statusbar__item">
          index{' '}
          <strong>{currentEventIndex >= 0 ? `${currentEventIndex + 1}/${eventCount}` : '—'}</strong>
        </span>
        <span className="statusbar__sep">|</span>
        <span className="statusbar__item">
          geometry <strong>{geometryLabel}</strong>
        </span>
        <span className="statusbar__sep">|</span>
        <span className="statusbar__item">
          source <strong>{sourceLabel || '-'}</strong>
        </span>
      </div>
    </footer>
  );
}
