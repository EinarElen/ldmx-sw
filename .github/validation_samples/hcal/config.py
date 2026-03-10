from LDMX.Framework import ldmxcfg
p = ldmxcfg.Process('test')

from LDMX.SimCore import simulator as sim
mySim = sim.simulator( "mySim" )
mySim.description = 'Hcal Muons and Neutrons'
mySim.setDetector( 'ldmx-det-v15-8gev' )
from LDMX.SimCore import generators as gen

# flat distribution of energy from 1 GeV to 8 GeV
# start near the ECAL entrance with a modest transverse spread
# so the event develops through ECAL into HCAL rather than spraying
# from a wide plane at the side of the detector
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

# one muon and one neutron both with the above initial kinematics
gps_cmds = ['/gps/particle mu-'] + beamline_cmds + [
        '/gps/source/add 1',
        '/gps/particle neutron'
        ] + beamline_cmds + [
        '/gps/source/multiplevertex True'
        ]

mySim.generators = [gen.gps('muon_neutron',gps_cmds)]

p.sequence = [ mySim ]

##################################################################
# Below should be the same for all sim scenarios

import os
import sys

p.run = int(os.environ['LDMX_RUN_NUMBER'])
p.maxEvents = int(os.environ['LDMX_NUM_EVENTS'])

p.histogramFile = 'hist.root'
p.outputFiles = ['events.root']
p.termLogLevel = 0

import LDMX.Ecal.EcalGeometry
import LDMX.Ecal.ecal_hardcoded_conditions
import LDMX.Hcal.HcalGeometry
import LDMX.Hcal.hcal_hardcoded_conditions
import LDMX.Ecal.digi as ecal_digi
import LDMX.Ecal.vetos as ecal_vetos
import LDMX.Hcal.digi as hcal_digi
hcal_digi_reco = hcal_digi.HcalSimpleDigiAndRecProducer()

from LDMX.DQM import dqm

p.sequence.extend([
        hcal_digi_reco,
        dqm.SimObjects(), 
        dqm.HCalDQM()
        ])
