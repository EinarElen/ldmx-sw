import type {
  CollectionSubsystemId,
  DetectorSubsystemId
} from '../../types';

export function classifyGeometryName(name: string): DetectorSubsystemId {
  const normalized = normalizeName(name);

  if (!normalized) return 'support';
  if (normalized.startsWith('tagger_')) return 'tagger';
  if (normalized.startsWith('trigger_pad')) return 'triggerPads';
  if (normalized.startsWith('target')) return 'target';
  if (normalized.startsWith('recoil_')) return 'recoilTracker';
  if (
    normalized.startsWith('back_hcal_') ||
    normalized.startsWith('side_hcal_')
  ) {
    return 'hcal';
  }

  if (
    normalized.startsWith('si_volume') ||
    normalized.startsWith('pcb_volume') ||
    normalized.startsWith('carbonbaseplate_volume') ||
    normalized.startsWith('c_volume_carboncoolingplane') ||
    normalized.startsWith('w_') ||
    normalized.includes('support_box') ||
    normalized.includes('strongback')
  ) {
    return 'ecal';
  }

  return 'support';
}

export function classifyCollectionName(name: string): CollectionSubsystemId {
  const normalized = normalizeName(name);

  if (normalized === 'simparticles') return 'truth';
  if (normalized === 'ground_truth_tracks') return 'truth';
  if (normalized === 'visualization_trajectories') return 'truth';
  if (normalized.startsWith('ecal_veto_')) return 'ecalVeto';
  if (normalized.startsWith('hcal_veto_')) return 'hcalVeto';
  if (normalized.includes('scoring')) return 'scoringPlanes';
  if (normalized.startsWith('hcal_')) return 'hcal';
  if (
    normalized.startsWith('ecal_') ||
    normalized.startsWith('cluster_') ||
    normalized === 'shared_hits' ||
    normalized === 'clusterless_hits' ||
    normalized === 'empty_clusters'
  ) {
    return 'ecal';
  }

  if (normalized.startsWith('recoil_') || normalized.includes('measurement')) {
    return 'recoilTracker';
  }
  if (normalized.startsWith('tagger_')) return 'tagger';
  if (
    normalized.startsWith('trigger_pad') ||
    normalized.includes('trigscint') ||
    normalized.includes('trigger_pad')
  ) {
    return 'triggerPads';
  }
  if (normalized.startsWith('target')) return 'target';

  if (
    normalized.includes('veto') ||
    normalized.includes('cutflow') ||
    normalized.includes('visibles') ||
    normalized.includes('triggerresult') ||
    normalized.includes('fiducial')
  ) {
    return 'analysis';
  }

  return 'analysis';
}

export function describeCollectionPath(name: string): {
  path: string[];
  subsystem: CollectionSubsystemId;
} {
  const normalized = normalizeName(name);
  const subsystem = classifyCollectionName(normalized);

  if (normalized === 'ground_truth_tracks') {
    return {
      subsystem,
      path: ['Truth', 'Trajectories', 'Ground truth tracks']
    };
  }

  if (normalized === 'visualization_trajectories') {
    return {
      subsystem,
      path: ['Truth', 'Trajectories', 'Detailed trajectories']
    };
  }

  if (normalized === 'simparticles') {
    return {
      subsystem,
      path: ['Truth', 'Particles', 'SimParticles']
    };
  }

  const hcalMatch = normalized.match(/^hcal_(sim|rec)_(back|top|bottom|left|right)$/);
  if (hcalMatch) {
    const kind = hcalMatch[1];
    const section = hcalMatch[2];
    if (!kind || !section) {
      return {
        subsystem,
        path: ['HCAL']
      };
    }
    return {
      subsystem,
      path: [
        'HCAL',
        kind === 'sim' ? 'Sim hits' : 'Rec hits',
        capitalize(section)
      ]
    };
  }

  if (normalized === 'hcal_veto_max_hit') {
    return {
      subsystem,
      path: ['HCAL veto', 'Decision hits', 'Max PE hit']
    };
  }

  if (normalized === 'ecal_veto_recoil_point') {
    return {
      subsystem,
      path: ['ECAL veto', 'Diagnostics', 'Recoil at ECAL face']
    };
  }

  if (normalized === 'ecal_rec_hits') {
    return { subsystem, path: ['ECAL', 'Rec hits'] };
  }
  if (normalized === 'ecal_sim_hits') {
    return { subsystem, path: ['ECAL', 'Sim hits'] };
  }
  if (normalized === 'shared_hits') {
    return { subsystem, path: ['ECAL', 'Cluster diagnostics', 'Shared hits'] };
  }
  if (normalized === 'clusterless_hits') {
    return {
      subsystem,
      path: ['ECAL', 'Cluster diagnostics', 'Clusterless hits']
    };
  }
  if (normalized === 'empty_clusters') {
    return {
      subsystem,
      path: ['ECAL', 'Cluster diagnostics', 'Empty clusters']
    };
  }
  if (normalized.startsWith('cluster_')) {
    return {
      subsystem,
      path: ['ECAL', 'Clusters', humanizeCollectionName(normalized)]
    };
  }

  if (normalized.includes('scoring')) {
    return {
      subsystem,
      path: ['Scoring planes', humanizeCollectionName(normalized)]
    };
  }

  if (normalized.startsWith('recoil_')) {
    return {
      subsystem,
      path: ['Recoil tracker', humanizeCollectionName(normalized)]
    };
  }

  if (normalized.startsWith('tagger_')) {
    return {
      subsystem,
      path: ['Tagger', humanizeCollectionName(normalized)]
    };
  }

  if (
    normalized.startsWith('trigger_pad') ||
    normalized.includes('trigscint') ||
    normalized.includes('trigger_pad')
  ) {
    return {
      subsystem,
      path: ['Trigger pads', humanizeCollectionName(normalized)]
    };
  }

  if (normalized.startsWith('target')) {
    return {
      subsystem,
      path: ['Target', humanizeCollectionName(normalized)]
    };
  }

  return {
    subsystem,
    path: [subsystemRootLabel(subsystem), humanizeCollectionName(normalized)]
  };
}

function subsystemRootLabel(subsystem: CollectionSubsystemId) {
  switch (subsystem) {
    case 'truth':
      return 'Truth';
    case 'scoringPlanes':
      return 'Scoring planes';
    case 'ecalVeto':
      return 'ECAL veto';
    case 'analysis':
      return 'Analysis';
    case 'hcalVeto':
      return 'HCAL veto';
    case 'target':
      return 'Target';
    case 'tagger':
      return 'Tagger';
    case 'triggerPads':
      return 'Trigger pads';
    case 'recoilTracker':
      return 'Recoil tracker';
    case 'ecal':
      return 'ECAL';
    case 'hcal':
      return 'HCAL';
    case 'support':
      return 'Support';
  }
}

function humanizeCollectionName(name: string) {
  return name
    .replace(/^hcal_/, '')
    .replace(/^ecal_/, '')
    .replace(/_/g, ' ')
    .replace(/\bpe\b/g, 'PE')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeName(name: string) {
  return name.toLowerCase().trim();
}
