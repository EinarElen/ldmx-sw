import type { HcalVetoSummary } from '../types';

type HcalVetoSectionProps = {
  summary: HcalVetoSummary | null;
  title?: string;
};

export function HcalVetoSection({
  summary,
  title = 'hcal veto'
}: HcalVetoSectionProps) {
  if (!summary) return null;

  const statusClass =
    summary.pass.toLowerCase() === 'true'
      ? 'sidebar-summary__badge sidebar-summary__badge--pass'
      : summary.pass.toLowerCase() === 'false'
        ? 'sidebar-summary__badge sidebar-summary__badge--warn'
        : 'sidebar-summary__badge';

  return (
    <section className="sidebar-section">
      <header className="sidebar-section__header">{title}</header>
      <dl className="sidebar-summary">
        <div className="sidebar-summary__row">
          <dt>pass</dt>
          <dd>
            <span className={statusClass}>
              {summary.pass.toLowerCase() === 'true'
                ? 'pass'
                : summary.pass.toLowerCase() === 'false'
                  ? 'fail'
                  : summary.pass}
            </span>
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>total pe</dt>
          <dd>{summary.totalPe}</dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>valid hits</dt>
          <dd>{summary.numValidHits}</dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>max pe</dt>
          <dd>{summary.maxPe}</dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>max cell</dt>
          <dd>
            {summary.maxSection} / L{summary.maxLayer} / S{summary.maxStrip}
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>max time</dt>
          <dd>{summary.maxTime}</dd>
        </div>
      </dl>
    </section>
  );
}
