from pathlib import Path
import os

from LDMX.Framework import ldmxcfg

PASS_NAME = 'ecal_pn_display_ecal_veto'
DEFAULT_MODEL = 'single-neutron'
MODEL_KEY = os.environ.get('LDMX_PN_MODEL', DEFAULT_MODEL).strip().lower()
ECAL_VETO_DISC_CUT = float(os.environ.get('LDMX_ECAL_VETO_DISC_CUT', '0.1'))

p = ldmxcfg.Process(PASS_NAME)
p.maxTriesPerEvent = int(os.environ.get('LDMX_MAX_TRIES_PER_EVENT', 20000))

from LDMX.Biasing import ecal
from LDMX.Biasing import particle_filter
from LDMX.SimCore import generators as gen
from LDMX.SimCore import kaon_physics
from LDMX.SimCore import photonuclear_models as pn_models

det = 'ldmx-det-v15-8gev'
mySim = ecal.photo_nuclear(det, gen.single_8gev_e_upstream_tagger())
mySim.beamSpotSmear = [20., 80., 0.]


def configure_model(sim, model_key):
    if model_key in ('standard', 'bertini', 'default'):
        return 'standard', 'standard Bertini photo-nuclear'

    if model_key in ('single-neutron', 'single_neutron', 'neutron'):
        sim.photonuclear_model = pn_models.BertiniSingleNeutronModel()
        sim.actions.append(
                particle_filter.PhotoNuclearTopologyFilter.SingleNeutronFilter()
                )
        return 'single-neutron', 'single-neutron enriched photo-nuclear'

    if model_key in ('nothing-hard', 'nothing_hard', 'soft'):
        sim.photonuclear_model = pn_models.BertiniNothingHardModel()
        sim.actions.append(
                particle_filter.PhotoNuclearTopologyFilter.NothingHardFilter()
                )
        return 'nothing-hard', 'nothing-hard photo-nuclear'

    if model_key == 'kaon':
        model = pn_models.BertiniAtLeastNProductsModel.kaon(
                min_products=int(os.environ.get('LDMX_PN_MIN_KAONS', '1')),
                hard_particle_threshold=float(
                        os.environ.get('LDMX_PN_HARD_THRESHOLD', '200.')
                        ),
                )
        model.zmin = int(os.environ.get('LDMX_PN_ZMIN', '0'))
        model.emin = float(os.environ.get('LDMX_PN_EMIN', '5000.'))
        sim.photonuclear_model = model
        sim.kaon_parameters = kaon_physics.KaonPhysics.upKaons()
        sim.actions.append(particle_filter.PhotoNuclearProductsFilter.kaon())
        return 'kaon', 'kaon-enhanced photo-nuclear'

    raise ValueError(
            'Unsupported LDMX_PN_MODEL '
            f'"{model_key}". Use standard, single-neutron, nothing-hard, or kaon.'
            )


model_key, model_label = configure_model(mySim, MODEL_KEY)
mySim.description = (
        'ECAL photonuclear display export with ECAL-veto diagnostics '
        f'and challenging-event selection ({model_label})'
        )

repo_root = Path(__file__).resolve().parents[3]
default_vis_path = (
        repo_root
        / 'EventDisplay'
        / 'ldmx-vis'
        / 'src'
        / 'assets'
        / 'test_data'
        / 'pn-validation-ecal-veto.json'
        )

p.sequence = [mySim]

p.run = int(os.environ.get('LDMX_RUN_NUMBER', 1))
p.maxEvents = int(os.environ.get('LDMX_NUM_EVENTS', 25))

p.histogramFile = 'hist.root'
p.outputFiles = ['events.root']
p.termLogLevel = int(os.environ.get('LDMX_TERM_LOG_LEVEL', 1))

import LDMX.Ecal.EcalGeometry
import LDMX.Ecal.ecal_hardcoded_conditions
import LDMX.Ecal.digi as ecal_digi
import LDMX.Ecal.ecalClusters as ecal_cluster
import LDMX.Ecal.vetos as ecal_vetos

import LDMX.Hcal.HcalGeometry
import LDMX.Hcal.hcal_hardcoded_conditions
import LDMX.Hcal.digi as hcal_digi
import LDMX.Hcal.hcal as hcal

from LDMX.DQM import dqm

ecal_veto = ecal_vetos.EcalVetoProcessor()
ecal_veto.disc_cut = ECAL_VETO_DISC_CUT
ecal_veto.recoil_from_tracking = False

hcal_digi_reco = hcal_digi.HcalSimpleDigiAndRecProducer()
hcal_veto = hcal.HcalVetoProcessor()

vis = dqm.VisGenerator()
vis.includeGroundTruth = False
vis.includeSimParticles = True
vis.includeAllTruthTracks = False
vis.includeEcalRecHits = True
vis.includeEcalClusters = True
vis.includeEcalVeto = True
vis.ecalVetoName = 'EcalVeto'
vis.ecalVetoPass = ''
vis.ecalVetoDiscCut = ecal_veto.disc_cut
vis.sampleLabel = 'pn-validation-ecal-veto'
vis.sampleModel = model_key
vis.sampleSelection = (
        'interesting-only'
        if os.environ.get('LDMX_VIS_INTERESTING_ONLY', '1') != '0'
        else 'all-retained'
        )
vis.sampleDescription = mySim.description
vis.onlyInterestingEcalVetoEvents = (
        os.environ.get('LDMX_VIS_INTERESTING_ONLY', '1') != '0'
        )
vis.ecalVetoNearThresholdWindow = float(
        os.environ.get('LDMX_ECAL_VETO_NEAR_WINDOW', '0.08')
        )
vis.ecalVetoOutsideContainmentThreshold = float(
        os.environ.get('LDMX_ECAL_VETO_OUTSIDE_THRESHOLD', '250.')
        )
vis.ecalVetoBackEnergyThreshold = float(
        os.environ.get('LDMX_ECAL_VETO_BACK_THRESHOLD', '150.')
        )
vis.ecalVetoDeepLayerThreshold = int(
        os.environ.get('LDMX_ECAL_VETO_DEEP_LAYER', '24')
        )
vis.includeHcalRecHits = True
vis.includeHcalSimHits = True
vis.includeHcalVeto = True
vis.ecalSimHitPass = PASS_NAME
vis.hcalSimHitPass = PASS_NAME
vis.simParticlePass = PASS_NAME
vis.trajectoryPass = PASS_NAME
vis.filename = os.environ.get('LDMX_VIS_JSON', str(default_vis_path))

p.sequence.extend([
        ecal_digi.EcalDigiProducer(),
        ecal_digi.EcalRecProducer(),
        ecal_cluster.EcalClusterProducer(),
        ecal_veto,
        hcal_digi_reco,
        hcal_veto,
        dqm.PhotoNuclearDQM(),
        vis,
        ])
