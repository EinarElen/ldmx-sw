import type {
  EcalVetoProfiles,
  EcalVetoSegmentSummary,
  EcalVetoSeries,
  EcalVetoSummary,
  HcalVetoSummary,
  MetadataEntry,
  PhoenixEventData
} from '../../types';
import {
  asRecord,
  findMetadataValue,
  readBoolean,
  readFixedVector,
  readMetadataBoolean,
  readMetadataNumber,
  readNumber,
  readNumberArray,
  readNumberMatrix,
  readStringArray
} from './metadata';

/**
 * Extracts the compact HCAL veto summary from Phoenix metadata.
 */
export function extractHcalVetoSummary(
  metadata: MetadataEntry[]
): HcalVetoSummary | null {
  const pass = findMetadataValue(metadata, /^hcal_veto_pass$/i);
  const totalPe = findMetadataValue(metadata, /^hcal_veto_total_pe$/i);
  const numValidHits = findMetadataValue(
    metadata,
    /^hcal_veto_num_valid_hits$/i
  );
  const maxPe = findMetadataValue(metadata, /^hcal_veto_max_pe$/i);
  const maxSection = findMetadataValue(metadata, /^hcal_veto_max_section$/i);
  const maxLayer = findMetadataValue(metadata, /^hcal_veto_max_layer$/i);
  const maxStrip = findMetadataValue(metadata, /^hcal_veto_max_strip$/i);
  const maxTime = findMetadataValue(metadata, /^hcal_veto_max_time$/i);

  if (
    !pass &&
    !totalPe &&
    !numValidHits &&
    !maxPe &&
    !maxSection &&
    !maxLayer &&
    !maxStrip &&
    !maxTime
  ) {
    return null;
  }

  return {
    pass: pass ?? '—',
    totalPe: totalPe ?? '—',
    numValidHits: numValidHits ?? '—',
    maxPe: maxPe ?? '—',
    maxSection: maxSection ?? '—',
    maxLayer: maxLayer ?? '—',
    maxStrip: maxStrip ?? '—',
    maxTime: maxTime ?? '—'
  };
}

/**
 * Extracts the rich ECAL veto payload from either structured event data or
 * fallback metadata fields when the full object is unavailable.
 */
export function extractEcalVetoSummary(
  eventData: PhoenixEventData | null,
  metadata: MetadataEntry[]
): EcalVetoSummary | null {
  if (!eventData) return null;

  const payload = asRecord(eventData.EcalVeto);
  const containment = asRecord(payload?.containment);
  const segments = asRecord(payload?.segments);
  const profiles = asRecord(payload?.profiles);
  const recoilMomentum = readFixedVector(payload?.recoilMomentum, 3);
  const recoilPosition = readFixedVector(payload?.recoilPosition, 3);

  const disc = readNumber(payload?.disc) ?? readMetadataNumber(metadata, /^ecal_veto_disc$/i);
  const discCut =
    readNumber(payload?.discCut) ??
    readMetadataNumber(metadata, /^ecal_veto_disc_cut$/i);
  const discMargin =
    readNumber(payload?.discMargin) ??
    readMetadataNumber(metadata, /^ecal_veto_disc_margin$/i);
  const interesting =
    readBoolean(payload?.interesting) ??
    readMetadataBoolean(metadata, /^ecal_veto_interesting$/i) ??
    false;
  const pass =
    readBoolean(payload?.pass) ??
    readMetadataBoolean(metadata, /^ecal_veto_pass$/i);

  if (
    pass == null &&
    disc == null &&
    !payload &&
    !findMetadataValue(metadata, /^ecal_veto_/i)
  ) {
    return null;
  }

  return {
    avgLayerHit:
      readNumber(payload?.avgLayerHit) ??
      readMetadataNumber(metadata, /^ecal_veto_avg_layer_hit$/i),
    deepestLayerHit:
      readNumber(payload?.deepestLayerHit) ??
      readMetadataNumber(metadata, /^ecal_veto_deepest_layer_hit$/i),
    disc,
    discCut,
    discMargin,
    ecalBackEnergy:
      readNumber(payload?.ecalBackEnergy) ??
      readMetadataNumber(metadata, /^ecal_veto_ecal_back_energy$/i),
    epAng:
      readNumber(payload?.epAng) ??
      readMetadataNumber(metadata, /^ecal_veto_ep_ang$/i),
    epAngAtTarget:
      readNumber(payload?.epAngAtTarget) ??
      readMetadataNumber(metadata, /^ecal_veto_ep_ang_at_target$/i),
    epDot:
      readNumber(payload?.epDot) ??
      readMetadataNumber(metadata, /^ecal_veto_ep_dot$/i),
    epDotAtTarget:
      readNumber(payload?.epDotAtTarget) ??
      readMetadataNumber(metadata, /^ecal_veto_ep_dot_at_target$/i),
    epSep:
      readNumber(payload?.epSep) ??
      readMetadataNumber(metadata, /^ecal_veto_ep_sep$/i),
    fiducial:
      readBoolean(payload?.fiducial) ??
      readMetadataBoolean(metadata, /^ecal_veto_fiducial$/i),
    interesting,
    interestingTags: readStringArray(payload?.interestingTags),
    layerReadoutEnergy:
      readNumberArray(payload?.layerReadoutEnergy) ??
      readNumberArray((payload as Record<string, unknown> | null)?.layerReadout) ??
      [],
    maxCellDep:
      readNumber(payload?.maxCellDep) ??
      readMetadataNumber(metadata, /^ecal_veto_max_cell_dep$/i),
    nReadoutHits:
      readNumber(payload?.nReadoutHits) ??
      readMetadataNumber(metadata, /^ecal_veto_n_readout_hits$/i),
    nTrackingHits:
      readNumber(payload?.nTrackingHits) ??
      readMetadataNumber(metadata, /^ecal_veto_n_tracking_hits$/i),
    pass,
    peakLayerEnergy:
      readNumber(payload?.peakLayerEnergy) ??
      readMetadataNumber(metadata, /^ecal_veto_peak_layer_energy$/i),
    peakLayerIndex:
      readNumber(payload?.peakLayerIndex) ??
      readMetadataNumber(metadata, /^ecal_veto_peak_layer$/i),
    peakOutsideEnergy:
      readNumber(payload?.peakOutsideEnergy) ??
      readMetadataNumber(metadata, /^ecal_veto_peak_outside_energy$/i),
    peakOutsideRing:
      readNumber(payload?.peakOutsideRing) ??
      readMetadataNumber(metadata, /^ecal_veto_peak_outside_ring$/i),
    peakSegmentEnergy:
      readNumber(payload?.peakSegmentEnergy) ??
      readMetadataNumber(metadata, /^ecal_veto_peak_segment_energy$/i),
    peakSegmentIndex:
      readNumber(payload?.peakSegmentIndex) ??
      readMetadataNumber(metadata, /^ecal_veto_peak_segment$/i),
    profiles: {
      electron: {
        energy: readNumberMatrix(asRecord(profiles?.electron)?.energy),
        xMean: readNumberMatrix(asRecord(profiles?.electron)?.xMean),
        yMean: readNumberMatrix(asRecord(profiles?.electron)?.yMean)
      },
      outside: {
        energy: readNumberMatrix(asRecord(profiles?.outside)?.energy),
        layerMean: readNumberMatrix(asRecord(profiles?.outside)?.layerMean),
        layerStd: readNumberMatrix(asRecord(profiles?.outside)?.layerStd),
        nHits: readNumberMatrix(asRecord(profiles?.outside)?.nHits),
        xMean: readNumberMatrix(asRecord(profiles?.outside)?.xMean),
        xStd: readNumberMatrix(asRecord(profiles?.outside)?.xStd),
        yMean: readNumberMatrix(asRecord(profiles?.outside)?.yMean),
        yStd: readNumberMatrix(asRecord(profiles?.outside)?.yStd)
      },
      photon: {
        energy: readNumberMatrix(asRecord(profiles?.photon)?.energy),
        nHits: readNumberMatrix(asRecord(profiles?.photon)?.nHits),
        xMean: readNumberMatrix(asRecord(profiles?.photon)?.xMean),
        yMean: readNumberMatrix(asRecord(profiles?.photon)?.yMean)
      }
    } satisfies EcalVetoProfiles,
    recoilMomentum,
    recoilPosition,
    segments: {
      energy: readNumberArray(segments?.energy) ?? [],
      layerMean: readNumberArray(segments?.layerMean) ?? [],
      layerStd: readNumberArray(segments?.layerStd) ?? [],
      xMean: readNumberArray(segments?.xMean) ?? [],
      xStd: readNumberArray(segments?.xStd) ?? [],
      yMean: readNumberArray(segments?.yMean) ?? [],
      yStd: readNumberArray(segments?.yStd) ?? []
    } satisfies EcalVetoSegmentSummary,
    series: {
      electronEnergy: readNumberArray(containment?.electronEnergy) ?? [],
      outsideEnergy: readNumberArray(containment?.outsideEnergy) ?? [],
      outsideNHits: readNumberArray(containment?.outsideNHits) ?? [],
      outsideXStd: readNumberArray(containment?.outsideXStd) ?? [],
      outsideYStd: readNumberArray(containment?.outsideYStd) ?? [],
      photonEnergy: readNumberArray(containment?.photonEnergy) ?? []
    } satisfies EcalVetoSeries,
    showerRMS:
      readNumber(payload?.showerRMS) ??
      readMetadataNumber(metadata, /^ecal_veto_shower_rms$/i),
    stdLayerHit:
      readNumber(payload?.stdLayerHit) ??
      readMetadataNumber(metadata, /^ecal_veto_std_layer_hit$/i),
    summedDet:
      readNumber(payload?.summedDet) ??
      readMetadataNumber(metadata, /^ecal_veto_summed_det$/i),
    summedTightIso:
      readNumber(payload?.summedTightIso) ??
      readMetadataNumber(metadata, /^ecal_veto_summed_tight_iso$/i),
    trackingFiducial:
      readBoolean(payload?.trackingFiducial) ??
      readMetadataBoolean(metadata, /^ecal_veto_tracking_fiducial$/i),
    xStd:
      readNumber(payload?.xStd) ??
      readMetadataNumber(metadata, /^ecal_veto_x_std$/i),
    yStd:
      readNumber(payload?.yStd) ??
      readMetadataNumber(metadata, /^ecal_veto_y_std$/i)
  };
}
