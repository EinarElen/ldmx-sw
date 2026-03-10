from LDMX.Framework import ldmxcfg
from pathlib import Path

p = ldmxcfg.Process('hcal_display')

from LDMX.SimCore import simulator as sim
from LDMX.SimCore import generators as gen

mySim = sim.simulator("mySim")
mySim.description = 'Hcal Muons and Neutrons for display export'
mySim.setDetector('ldmx-det-v15-8gev')

beamline_cmds = [
        '/gps/ene/type Lin',
        '/gps/ene/min 1 GeV',
        '/gps/ene/max 8 GeV',
        '/gps/ene/gradient 0.',
        '/gps/ene/intercept 1.',
        '/gps/direction 0 0 1',
        '/gps/pos/type Plane',
        '/gps/pos/shape Square',
        '/gps/pos/centre 0 0 235. mm',
        '/gps/pos/halfx 80 mm',
        '/gps/pos/halfy 80 mm'
        ]

gps_cmds = ['/gps/particle mu-'] + beamline_cmds + [
        '/gps/source/add 1',
        '/gps/particle neutron'
        ] + beamline_cmds + [
        '/gps/source/multiplevertex True'
        ]

mySim.generators = [gen.gps('muon_neutron', gps_cmds)]

import os

repo_root = Path(__file__).resolve().parents[3]
default_vis_path = (
        repo_root
        / 'EventDisplay'
        / 'ldmx-vis'
        / 'src'
        / 'assets'
        / 'test_data'
        / 'hcal-validation.json'
        )

p.run = int(os.environ.get('LDMX_RUN_NUMBER', 1))
p.maxEvents = int(os.environ.get('LDMX_NUM_EVENTS', 25))

p.histogramFile = 'hist.root'
p.outputFiles = ['events.root']
p.termLogLevel = 0

import LDMX.Ecal.EcalGeometry
import LDMX.Ecal.ecal_hardcoded_conditions
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
vis.includeEcalRecHits = False
vis.includeEcalClusters = False
vis.includeHcalRecHits = True
vis.includeHcalSimHits = True
vis.includeHcalVeto = True
vis.includeAllTruthTracks = False
vis.hcalSimHitPass = 'hcal_display'
vis.simParticlePass = 'hcal_display'
vis.truthTrackEnergyThreshold = 50.
vis.filename = os.environ.get('LDMX_VIS_JSON', str(default_vis_path))

p.sequence = [
        mySim,
        hcal_digi_reco,
        hcal_veto,
        dqm.SimObjects(),
        dqm.HCalDQM(),
        vis,
        ]
