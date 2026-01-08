"""Test configuration for the Bertini cascade history capture with kaon biasing.

This test runs a photonuclear simulation with BertiniWithHistoryModel
and can optionally enable kaon biasing to enhance kaon production.

Usage:
    fire bertini_history_test.py [--with-kaon-biasing] [--kaon-bias-factor F]
                                  [--num-events N] [--run R]

Based on the ecal_pn validation sample configuration.
"""

from LDMX.Framework import ldmxcfg
import argparse
import os

# Parse command line arguments
parser = argparse.ArgumentParser(description='Bertini cascade history test with kaon biasing')
parser.add_argument('--with-kaon-biasing', action='store_true',
                    help='Enable kaon biasing via rejection sampling')
parser.add_argument('--kaon-bias-factor', type=float, default=10.0,
                    help='Kaon bias enhancement factor (default: 10.0)')
parser.add_argument('--kaon-bias-threshold', type=float, default=2000.0,
                    help='Minimum photon energy for kaon biasing [MeV] (default: 2000)')
parser.add_argument('--kaon-bias-max-energy', type=float, default=10000.0,
                    help='Maximum photon energy for kaon biasing [MeV] (default: 10000)')
parser.add_argument('--num-events', type=int, default=100,
                    help='Number of events to generate (default: 100)')
parser.add_argument('--run', type=int, default=1,
                    help='Run number (default: 1)')
args, _ = parser.parse_known_args()

# Also support environment variables for CI compatibility
num_events = int(os.environ.get('LDMX_NUM_EVENTS', args.num_events))
run_number = int(os.environ.get('LDMX_RUN_NUMBER', args.run))

p = ldmxcfg.Process("bertini_history_test")
p.maxTriesPerEvent = 10000
p.maxEvents = num_events
p.run = run_number

# Set output file names based on whether kaon biasing is enabled
if args.with_kaon_biasing:
    p.outputFiles = [f"events_kaon_bias_{args.kaon_bias_factor:.0f}x.root"]
    p.histogramFile = f"hist_kaon_bias_{args.kaon_bias_factor:.0f}x.root"
    label = f"kaon_biasing_{args.kaon_bias_factor:.0f}x"
else:
    p.outputFiles = ["events_no_bias.root"]
    p.histogramFile = "hist_no_bias.root"
    label = "no_bias"

# Use the standard ecal.photo_nuclear setup with 8 GeV beam
from LDMX.Biasing import ecal
from LDMX.SimCore import generators as gen

det = 'ldmx-det-v14-8gev'
mySim = ecal.photo_nuclear(det, gen.single_8gev_e_upstream_tagger())

# Always use BertiniWithHistoryModel, optionally with kaon biasing
from LDMX.SimCore import photonuclear_models
model = photonuclear_models.BertiniWithHistoryModel()

if args.with_kaon_biasing:
    model.use_kaon_biasing = True
    model.kaon_bias_factor = args.kaon_bias_factor
    model.kaon_bias_threshold = args.kaon_bias_threshold
    model.kaon_bias_max_energy = args.kaon_bias_max_energy
    mySim.description = f'ECal PN with Bertini history + kaon biasing ({args.kaon_bias_factor}x)'
else:
    mySim.description = 'ECal PN with Bertini history (no kaon biasing)'

mySim.photonuclear_model = model

p.sequence = [mySim]

# Load required geometry
import LDMX.Ecal.EcalGeometry
import LDMX.Hcal.HcalGeometry

# Add DQM modules
from LDMX.DQM import dqm
p.sequence.append(dqm.PhotoNuclearDQM())

# Always add CascadeHistoryDQM since we always use history model
p.sequence.append(dqm.CascadeHistoryDQM())

# Set log level: 0=debug, 1=info, 2=warn, 3=error
p.termLogLevel = 1

print(f"Running {label}: {num_events} events, run {run_number}")
print(f"  Histogram file: {p.histogramFile}")
print(f"  Events file: {p.outputFiles[0]}")
if args.with_kaon_biasing:
    print(f"  Kaon bias factor: {args.kaon_bias_factor}")
    print(f"  Kaon bias energy range: [{args.kaon_bias_threshold}, {args.kaon_bias_max_energy}] MeV")
