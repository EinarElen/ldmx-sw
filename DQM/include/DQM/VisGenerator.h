#ifndef DQM_VISGENERATOR_H
#define DQM_VISGENERATOR_H

// LDMX Framework
#include "Framework/Configure/Parameters.h"
#include "Framework/EventProcessor.h"

// JSON
#include "DQM/json.hpp"

#include "DetDescr/EcalGeometry.h"
#include "DetDescr/HcalGeometry.h"
#include "DetDescr/HcalID.h"
#include "Ecal/Event/EcalVetoResult.h"
#include "Hcal/Event/HcalHit.h"
#include "Hcal/Event/HcalVetoResult.h"

#include <string>
#include <vector>

namespace dqm {

/**
 * @class VisGenerator
 * @brief Generates JSON file of event data for Phoenix visualisation
 */

class VisGenerator : public framework::Analyzer {
 public:
  VisGenerator(const std::string& name, framework::Process& process)
      : Analyzer(name, process) {}

  virtual void configure(framework::config::Parameters& ps);

  virtual void analyze(const framework::Event& event);

  void ecalClusterRecHit(const framework::Event& event,
                         const std::string& eKey);

  void groundTruthTracks(const framework::Event& event,
                         const std::string& eKey);

  void visualizationTrajectories(const framework::Event& event,
                                 const std::string& eKey);

  void simParticles(const framework::Event& event, const std::string& eKey);

  void hcalHitCollections(const framework::Event& event, const std::string& eKey);

  void ecalVeto(const framework::Event& event, const std::string& eKey,
                const ldmx::EcalVetoResult& veto);

  void hcalVeto(const framework::Event& event, const std::string& eKey);

  void extractLayers(const framework::Event& event, const std::string& eKey);

  // void caloCells(const framework::Event& event, const std::string& eKey);

  virtual void onNewRun(const ldmx::RunHeader& runHeader);

  virtual void onProcessEnd();

 private:
  // Include ground truth (simulated) info
  bool includeGroundTruth_;

  // Simulated info has contribs with originID (not available by default)
  bool originIdAvailable_;

  // Number of electrons in simulation
  int nbrOfElectrons_;

  // Collection Name for SimHits
  std::string ecalSimHitColl_;

  // Pass Name for SimHits
  std::string ecalSimHitPass_;

  // Collection name for Hcal SimHits
  std::string hcalSimHitColl_;

  // Pass name for Hcal SimHits
  std::string hcalSimHitPass_;

  // Include hcal sim hits
  bool includeHcalSimHits_;

  // Include ecal rec hits
  bool includeEcalRecHits_;

  // Collection Name for RecHits
  std::string ecalRecHitColl_;

  // Pass Name for RecHits
  std::string ecalRecHitPass_;

  // Include hcal rec hits
  bool includeHcalRecHits_;

  // Collection name for Hcal RecHits
  std::string hcalRecHitColl_;

  // Pass name for Hcal RecHits
  std::string hcalRecHitPass_;

  // Include ecal clusters
  bool includeEcalClusters_;

  // Collection name for ecal clusters
  std::string ecalClusterColl_;

  // Pass name for ecal clusters
  std::string ecalClusterPass_;

  // Generate json file visualizing hit origins
  // NEEDS ORIGIN ID
  bool visHitOrigin_;
  std::string truthFilename_;

  // Generate json file visualizing ecal layers
  bool visLayers_;
  std::string layerFilename_;

  // Include Hcal veto summary and max-hit object
  bool includeHcalVeto_;

  // Include Ecal veto summary and diagnostic profiles
  bool includeEcalVeto_;

  // Ecal veto collection name and pass
  std::string ecalVetoName_;
  std::string ecalVetoPass_;

  // Disc threshold used to judge near-threshold events in the UI/export
  double ecalVetoDiscCut_;

  // Keep only events with challenging ECAL-veto behavior
  bool onlyInterestingEcalVetoEvents_;

  // Thresholds for tagging ECAL-veto-interesting events
  double ecalVetoNearThresholdWindow_;
  double ecalVetoOutsideContainmentThreshold_;
  double ecalVetoBackEnergyThreshold_;
  int ecalVetoDeepLayerThreshold_;

  // Hcal veto collection name and pass
  std::string hcalVetoName_;
  std::string hcalVetoPass_;

  // SimParticle map pass name used for truth tracks
  std::string simParticlePass_;

  // Export full SimParticles map for lineage queries
  bool includeSimParticles_;

  // Export detailed geometry-space visualization trajectories if present
  bool includeVisualizationTrajectories_;

  // Visualization trajectory collection name and pass
  std::string trajectoryColl_;
  std::string trajectoryPass_;

  // Include all truth tracks above threshold instead of only primaries
  bool includeAllTruthTracks_;

  // Minimum energy for truth tracks to export [MeV]
  double truthTrackEnergyThreshold_;

  // Sample metadata for frontend guidance
  std::string sampleLabel_;
  std::string sampleModel_;
  std::string sampleSelection_;
  std::string sampleDescription_;

  // Output filename
  std::string filename_;

  // List of event numbers that should be included
  std::vector<int> onlyIncludeEvents_;
  // List of event numbers that should be excluded
  std::vector<int> excludeEvents_;

  // Run number
  int runNbr_{1};

  nlohmann::json j;

  nlohmann::json truth;

  nlohmann::json layer;

  // Colors available for clusters
  std::vector<std::string> colors{"0xFFB6C1", "0xFFA500", "0xFFFF00",
                                  "0x7FFF00", "0x00FFFF", "0x663399"};

  // String "translations" for hex colors above
  // If adding new hex colors, add translation here
  std::vector<std::string> colorstrings{"pink",  "orange", "yellow",
                                        "green", "blue",   "purple"};
};

}  // namespace dqm

#endif
