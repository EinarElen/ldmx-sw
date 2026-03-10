from pathlib import Path
import os

from LDMX.Framework import ldmxcfg

p = ldmxcfg.Process('ecal_pn_display')
p.maxTriesPerEvent = 10000

from LDMX.Biasing import ecal
from LDMX.SimCore import generators as gen

det = 'ldmx-det-v15-8gev'
mySim = ecal.photo_nuclear(det, gen.single_8gev_e_upstream_tagger())
mySim.beamSpotSmear = [20., 80., 0.]
mySim.description = 'ECAL photonuclear display export'

repo_root = Path(__file__).resolve().parents[3]
default_vis_path = (
        repo_root
        / 'EventDisplay'
        / 'ldmx-vis'
        / 'src'
        / 'assets'
        / 'test_data'
        / 'pn-validation.json'
        )

p.sequence = [mySim]

p.run = int(os.environ.get('LDMX_RUN_NUMBER', 1))
p.maxEvents = int(os.environ.get('LDMX_NUM_EVENTS', 5))

p.histogramFile = 'hist.root'
p.outputFiles = ['events.root']
p.termLogLevel = 0

import LDMX.Ecal.EcalGeometry
import LDMX.Ecal.ecal_hardcoded_conditions
import LDMX.Ecal.digi as ecal_digi
import LDMX.Ecal.ecalClusters as ecal_cluster

import LDMX.Hcal.HcalGeometry
import LDMX.Hcal.hcal_hardcoded_conditions
import LDMX.Hcal.digi as hcal_digi
import LDMX.Hcal.hcal as hcal

from LDMX.DQM import dqm

hcal_digi_reco = hcal_digi.HcalSimpleDigiAndRecProducer()
hcal_veto = hcal.HcalVetoProcessor()

vis = dqm.VisGenerator()
vis.includeGroundTruth = False
vis.includeSimParticles = True
vis.includeAllTruthTracks = False
vis.includeEcalRecHits = True
vis.includeEcalClusters = True
vis.includeHcalRecHits = True
vis.includeHcalSimHits = True
vis.includeHcalVeto = True
vis.ecalSimHitPass = 'ecal_pn_display'
vis.hcalSimHitPass = 'ecal_pn_display'
vis.simParticlePass = 'ecal_pn_display'
vis.trajectoryPass = 'ecal_pn_display'
vis.filename = os.environ.get('LDMX_VIS_JSON', str(default_vis_path))

p.sequence.extend([
        ecal_digi.EcalDigiProducer(),
        ecal_digi.EcalRecProducer(),
        ecal_cluster.EcalClusterProducer(),
        hcal_digi_reco,
        hcal_veto,
        dqm.PhotoNuclearDQM(),
        vis,
        ])
