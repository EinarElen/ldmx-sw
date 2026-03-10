import { ProfileStrip } from './ProfileStrip';
import type { EcalVetoSummary } from '../types';
import {
  formatInteger,
  formatNumber,
  formatVector
} from '../utils/formatting';

type EcalVetoSectionProps = {
  summary: EcalVetoSummary | null;
  title?: string;
};

function formatBoolean(value: boolean | null) {
  if (value == null) return '—';
  return value ? 'yes' : 'no';
}

export function EcalVetoSection({
  summary,
  title = 'ecal veto'
}: EcalVetoSectionProps) {
  if (!summary) return null;

  const statusClass =
    summary.pass === true
      ? 'sidebar-summary__badge sidebar-summary__badge--pass'
      : summary.pass === false
        ? 'sidebar-summary__badge sidebar-summary__badge--warn'
        : 'sidebar-summary__badge';

  const marginLabel =
    summary.discMargin == null
      ? '—'
      : formatNumber(summary.discMargin, {
          decimals: 3,
          scientificBelow: 1e-4,
          signed: true
        });
  const recoilMomentumLabel = formatVector(summary.recoilMomentum, {
    decimals: 1,
    scientificBelow: 1e-4
  });
  const recoilPositionLabel = formatVector(summary.recoilPosition, {
    decimals: 1,
    scientificBelow: 1e-4
  });

  return (
    <section className="sidebar-section">
      <header className="sidebar-section__header">{title}</header>
      <dl className="sidebar-summary">
        <div className="sidebar-summary__row">
          <dt>pass</dt>
          <dd>
            <span className={statusClass}>
              {summary.pass == null ? '—' : summary.pass ? 'pass' : 'fail'}
            </span>
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>disc</dt>
          <dd>
            {formatNumber(summary.disc, {
              decimals: 3,
              scientificBelow: 1e-4
            })}
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>cut / disc-cut</dt>
          <dd>
            {formatNumber(summary.discCut, {
              decimals: 3,
              scientificBelow: 1e-4
            })}{' '}
            / {marginLabel}
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>readout / track hits</dt>
          <dd>
            {formatInteger(summary.nReadoutHits)} /{' '}
            {formatInteger(summary.nTrackingHits)}
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>deepest / avg layer</dt>
          <dd>
            {formatInteger(summary.deepestLayerHit)} /{' '}
            {formatNumber(summary.avgLayerHit)}
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>summed det / iso</dt>
          <dd>
            {formatNumber(summary.summedDet, { decimals: 1 })} /{' '}
            {formatNumber(summary.summedTightIso, { decimals: 1 })}
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>max cell / rms</dt>
          <dd>
            {formatNumber(summary.maxCellDep, { decimals: 1 })} /{' '}
            {formatNumber(summary.showerRMS)}
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>back energy</dt>
          <dd>{formatNumber(summary.ecalBackEnergy, { decimals: 1 })}</dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>fiducial / tracking</dt>
          <dd>
            {formatBoolean(summary.fiducial)} /{' '}
            {formatBoolean(summary.trackingFiducial)}
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>peak layer / ring</dt>
          <dd>
            L{formatInteger(summary.peakLayerIndex)} / R
            {formatInteger(summary.peakOutsideRing)}
          </dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>recoil xy,z</dt>
          <dd>{recoilPositionLabel}</dd>
        </div>
        <div className="sidebar-summary__row">
          <dt>recoil px,py,pz</dt>
          <dd>{recoilMomentumLabel}</dd>
        </div>
      </dl>

      {summary.interestingTags.length ? (
        <div className="sidebar-badges">
          {summary.interestingTags.map((tag) => (
            <span key={tag} className="sidebar-summary__badge sidebar-summary__badge--warn">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="profile-strip-grid">
        <ProfileStrip
          accent="amber"
          label="layer readout"
          meta={
            summary.peakLayerIndex != null
              ? `peak L${summary.peakLayerIndex}`
              : null
          }
          values={summary.layerReadoutEnergy}
        />
        <ProfileStrip
          accent="magenta"
          label="outside containment"
          meta={
            summary.peakOutsideRing != null
              ? `peak R${summary.peakOutsideRing}`
              : null
          }
          values={summary.series.outsideEnergy}
        />
        <ProfileStrip
          accent="cyan"
          label="photon containment"
          values={summary.series.photonEnergy}
        />
        <ProfileStrip
          accent="blue"
          label="segment energy"
          meta={
            summary.peakSegmentIndex != null
              ? `peak S${summary.peakSegmentIndex}`
              : null
          }
          values={summary.segments.energy}
        />
      </div>
    </section>
  );
}
