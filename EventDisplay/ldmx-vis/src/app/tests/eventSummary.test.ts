import { describe, expect, it } from 'vitest';
import {
  buildEventGuide,
  normalizeEventPayloads,
  summarizeEventCollections
} from '../utils/eventSummary';
import type {
  EcalVetoSummary,
  HcalVetoSummary,
  MetadataEntry,
  PhoenixEventData
} from '../types';

function makeEcalVetoSummary(
  overrides: Partial<EcalVetoSummary> = {}
): EcalVetoSummary {
  return {
    avgLayerHit: 7.49,
    deepestLayerHit: 24,
    disc: 0.000034,
    discCut: 0.1,
    discMargin: -0.099966,
    ecalBackEnergy: 9.7,
    epAng: null,
    epAngAtTarget: null,
    epDot: null,
    epDotAtTarget: null,
    epSep: null,
    fiducial: true,
    interesting: true,
    interestingTags: ['outside-containment', 'deep-shower'],
    layerReadoutEnergy: [1, 3, 2],
    maxCellDep: 1098.9,
    nReadoutHits: 85,
    nTrackingHits: 65,
    pass: false,
    peakLayerEnergy: null,
    peakLayerIndex: 8,
    peakOutsideEnergy: null,
    peakOutsideRing: 0,
    peakSegmentEnergy: null,
    peakSegmentIndex: null,
    profiles: {
      electron: { energy: [], xMean: [], yMean: [] },
      outside: {
        energy: [],
        layerMean: [],
        layerStd: [],
        nHits: [],
        xMean: [],
        xStd: [],
        yMean: [],
        yStd: []
      },
      photon: { energy: [], nHits: [], xMean: [], yMean: [] }
    },
    recoilMomentum: [-64.2, -2.5, 249.4],
    recoilPosition: [-29.8, -0.7, 240],
    segments: {
      energy: [],
      layerMean: [],
      layerStd: [],
      xMean: [],
      xStd: [],
      yMean: [],
      yStd: []
    },
    series: {
      electronEnergy: [],
      outsideEnergy: [],
      outsideNHits: [],
      outsideXStd: [],
      outsideYStd: [],
      photonEnergy: []
    },
    showerRMS: 39.12,
    stdLayerHit: null,
    summedDet: 4862.6,
    summedTightIso: 1404.3,
    trackingFiducial: false,
    xStd: null,
    yStd: null,
    ...overrides
  };
}

describe('eventSummary', () => {
  it('normalizes payload objects and ignores non-event entries', () => {
    expect(
      normalizeEventPayloads({
        EVENT_KEY_1: { Hits: {} },
        bad: [1, 2, 3],
        alsoBad: null
      })
    ).toEqual({
      EVENT_KEY_1: { Hits: {} }
    });
  });

  it('summarizes collections and emits formatted event-guide lines', () => {
    const eventData: PhoenixEventData = {
      Hits: {
        ecal_sim_hits: [{}, {}],
        hcal_sim_back: [{}]
      },
      SimParticles: {
        '1': { trackID: 1 },
        '2': { trackID: 2 }
      },
      Tracks: {
        visualization_trajectories: [{}, {}, {}]
      }
    };
    const metadata: MetadataEntry[] = [
      { label: 'sample_label', value: 'ECAL veto' },
      { label: 'sample_model', value: 'single-neutron' },
      { label: 'sample_selection', value: 'interesting-only' },
      { label: 'sample_description', value: 'Interesting PN veto cases.' }
    ];
    const hcalSummary: HcalVetoSummary = {
      maxLayer: '37',
      maxPe: '28.5',
      maxSection: 'back',
      maxStrip: '12',
      maxTime: '6.5',
      numValidHits: '9',
      pass: 'false',
      totalPe: '41.1'
    };

    const collections = summarizeEventCollections(eventData);
    expect(collections.map((entry) => entry.name)).toContain('SimParticles');
    expect(collections.map((entry) => entry.name)).toContain(
      'visualization_trajectories'
    );

    const guide = buildEventGuide(
      eventData,
      metadata,
      hcalSummary,
      makeEcalVetoSummary()
    );

    expect(guide).toContain('Interesting PN veto cases.');
    expect(guide).toContain(
      'Sample: ECAL veto / single-neutron / interesting-only.'
    );
    expect(
      guide.some((line) =>
        line.includes('ECAL veto fails at disc 3.4e-5 (margin -0.09997).')
      )
    ).toBe(true);
    expect(
      guide.some((line) =>
        line.includes('HCAL veto fails in back at layer 37 with max PE 28.5.')
      )
    ).toBe(true);
    expect(
      guide.some((line) =>
        line.includes('Most populated visible collection: ecal_sim_hits (2).')
      )
    ).toBe(true);
  });
});
