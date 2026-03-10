/**
 * @file VisGenerator.cxx
 */

#include "DQM/VisGenerator.h"

#include "DetDescr/EcalGeometry.h"
#include "DetDescr/HcalID.h"
#include "Ecal/Event/EcalCluster.h"
#include "Ecal/Event/EcalHit.h"
#include "Ecal/Event/EcalVetoResult.h"
#include "SimCore/Event/SimCalorimeterHit.h"
#include "SimCore/Event/SimParticle.h"
#include "SimCore/Event/SimTrajectory.h"
#include "SimCore/Event/SimTrackerHit.h"
// #include "DQM/json.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <optional>
#include <unordered_map>
using json = nlohmann::json;

namespace dqm {

namespace {

std::string hcalSectionName(int section) {
  switch (section) {
    case ldmx::HcalID::HcalSection::BACK:
      return "back";
    case ldmx::HcalID::HcalSection::TOP:
      return "top";
    case ldmx::HcalID::HcalSection::BOTTOM:
      return "bottom";
    case ldmx::HcalID::HcalSection::LEFT:
      return "left";
    case ldmx::HcalID::HcalSection::RIGHT:
      return "right";
    default:
      return "unknown";
  }
}

std::string hcalSectionColor(int section, bool simulated) {
  static const std::array<std::string, 5> recColors = {
      "0xE3A857", "0x76B7B2", "0x59A14F", "0xAF7AA1", "0xEDC948"};
  static const std::array<std::string, 5> simColors = {
      "0xFFBE7D", "0x9CDED9", "0x8CD17D", "0xD4A6C8", "0xF5DA7A"};

  const auto& palette = simulated ? simColors : recColors;
  if (section >= 0 && section < static_cast<int>(palette.size())) {
    return palette.at(section);
  }
  return simulated ? "0x8FD3FF" : "0xFF7F50";
}

std::array<double, 3> hcalHalfDimensions(
    const ldmx::HcalGeometry& geometry, const ldmx::HcalID& id) {
  const double length = 0.5 * geometry.getScintillatorLength(id);
  const double width = 0.5 * geometry.getScintillatorWidth();
  const double thickness = 0.5 * geometry.getScintillatorThickness();
  const auto orientation = geometry.getScintillatorOrientation(id);

  if (id.section() == ldmx::HcalID::HcalSection::BACK) {
    if (orientation == ldmx::HcalGeometry::ScintillatorOrientation::horizontal)
      return {length, width, thickness};
    return {width, length, thickness};
  }

  if (id.section() == ldmx::HcalID::HcalSection::TOP ||
      id.section() == ldmx::HcalID::HcalSection::BOTTOM) {
    if (orientation == ldmx::HcalGeometry::ScintillatorOrientation::horizontal)
      return {length, thickness, width};
    return {width, thickness, length};
  }

  if (orientation == ldmx::HcalGeometry::ScintillatorOrientation::vertical)
    return {thickness, length, width};
  return {thickness, width, length};
}

std::array<double, 3> hcalSimHitHalfDimensions(
    const ldmx::HcalGeometry& geometry, const ldmx::HcalID& id) {
  const double footprint = 0.45 * geometry.getScintillatorWidth();
  const double depth = 0.55 * geometry.getScintillatorThickness();

  if (id.section() == ldmx::HcalID::HcalSection::BACK) {
    return {footprint, footprint, depth};
  }

  if (id.section() == ldmx::HcalID::HcalSection::TOP ||
      id.section() == ldmx::HcalID::HcalSection::BOTTOM) {
    return {footprint, depth, footprint};
  }

  return {depth, footprint, footprint};
}

std::array<double, 3> hcalBackRecHitHalfDimensions(
    const ldmx::HcalGeometry& geometry, const ldmx::HcalID& id) {
  const double footprint = 0.45 * geometry.getScintillatorWidth();
  const double depth = 0.55 * geometry.getScintillatorThickness();
  const auto orientation = geometry.getScintillatorOrientation(id);

  if (orientation == ldmx::HcalGeometry::ScintillatorOrientation::horizontal) {
    return {footprint, footprint, depth};
  }

  return {footprint, footprint, depth};
}

std::string simProcessLabel(int processType) {
  switch (processType) {
    case ldmx::SimParticle::ProcessType::annihil:
      return "annihil";
    case ldmx::SimParticle::ProcessType::compt:
      return "compt";
    case ldmx::SimParticle::ProcessType::conv:
      return "conv";
    case ldmx::SimParticle::ProcessType::electronNuclear:
      return "electronNuclear";
    case ldmx::SimParticle::ProcessType::eBrem:
      return "eBrem";
    case ldmx::SimParticle::ProcessType::eIoni:
      return "eIoni";
    case ldmx::SimParticle::ProcessType::msc:
      return "msc";
    case ldmx::SimParticle::ProcessType::phot:
      return "phot";
    case ldmx::SimParticle::ProcessType::photonNuclear:
      return "photonNuclear";
    case ldmx::SimParticle::ProcessType::GammaToMuPair:
      return "GammaToMuPair";
    case ldmx::SimParticle::ProcessType::eDarkBrem:
      return "eDarkBrem";
    case ldmx::SimParticle::ProcessType::Decay:
      return "Decay";
    case ldmx::SimParticle::ProcessType::Primary:
      return "Primary";
    case ldmx::SimParticle::ProcessType::muonNuclear:
      return "muonNuclear";
    case ldmx::SimParticle::ProcessType::neutronInelastic:
      return "neutronInelastic";
    case ldmx::SimParticle::ProcessType::neutronCapture:
      return "neutronCapture";
    case ldmx::SimParticle::ProcessType::kaonInelastic:
      return "kaonInelastic";
    case ldmx::SimParticle::ProcessType::pionInelastic:
      return "pionInelastic";
    case ldmx::SimParticle::ProcessType::protonInelastic:
      return "protonInelastic";
    default:
      return "unknown";
  }
}

bool isInterestingTruthTrack(const ldmx::SimParticle& particle) {
  switch (particle.getProcessType()) {
    case ldmx::SimParticle::ProcessType::electronNuclear:
    case ldmx::SimParticle::ProcessType::photonNuclear:
    case ldmx::SimParticle::ProcessType::muonNuclear:
    case ldmx::SimParticle::ProcessType::neutronInelastic:
    case ldmx::SimParticle::ProcessType::neutronCapture:
    case ldmx::SimParticle::ProcessType::kaonInelastic:
    case ldmx::SimParticle::ProcessType::pionInelastic:
    case ldmx::SimParticle::ProcessType::protonInelastic:
      return true;
    default:
      return false;
  }
}

double trackSegmentLength(const ldmx::SimParticle& particle) {
  const auto start = particle.getVertex();
  const auto end = particle.getEndPoint();
  const double dx = end.at(0) - start.at(0);
  const double dy = end.at(1) - start.at(1);
  const double dz = end.at(2) - start.at(2);
  return std::sqrt(dx * dx + dy * dy + dz * dz);
}

template <typename T>
json jsonArray(const std::vector<T>& values) {
  json output = json::array();
  for (const auto& value : values) {
    output.push_back(value);
  }
  return output;
}

template <typename T>
json jsonMatrix(const std::vector<std::vector<T>>& values) {
  json output = json::array();
  for (const auto& row : values) {
    output.push_back(jsonArray(row));
  }
  return output;
}

template <typename T>
double sumValues(const std::vector<T>& values) {
  double total{0.};
  for (const auto& value : values) {
    total += static_cast<double>(value);
  }
  return total;
}

template <typename T>
std::pair<int, double> maxIndexValue(const std::vector<T>& values) {
  if (values.empty()) return {-1, 0.};

  const auto it = std::max_element(values.begin(), values.end());
  return {static_cast<int>(std::distance(values.begin(), it)),
          static_cast<double>(*it)};
}

std::vector<std::string> ecalInterestingTags(
    const ldmx::EcalVetoResult& veto, double discCut,
    double nearThresholdWindow, double outsideContainmentThreshold,
    double backEnergyThreshold, int deepLayerThreshold) {
  std::vector<std::string> tags;
  const auto outsideContainment = veto.getOutsideContainmentEnergy();
  const auto [peakOutsideRing, peakOutsideEnergy] =
      maxIndexValue(outsideContainment);
  const double totalOutsideEnergy = sumValues(outsideContainment);

  if (!veto.passesVeto()) tags.emplace_back("fail");
  if (discCut >= 0. &&
      std::abs(veto.getDisc() - discCut) <= nearThresholdWindow) {
    tags.emplace_back("near-threshold");
  }
  if (peakOutsideRing >= 0 &&
      (peakOutsideEnergy >= outsideContainmentThreshold ||
       totalOutsideEnergy >= outsideContainmentThreshold)) {
    tags.emplace_back("outside-containment");
  }
  if (veto.getEcalBackEnergy() >= backEnergyThreshold) {
    tags.emplace_back("back-leakage");
  }
  if (deepLayerThreshold >= 0 &&
      veto.getDeepestLayerHit() >= deepLayerThreshold) {
    tags.emplace_back("deep-shower");
  }
  if (!veto.getTrackingFiducial()) tags.emplace_back("tracking-missing");

  return tags;
}

bool isInterestingEcalVetoEvent(const ldmx::EcalVetoResult& veto,
                                double discCut,
                                double nearThresholdWindow,
                                double outsideContainmentThreshold,
                                double backEnergyThreshold,
                                int deepLayerThreshold) {
  const auto outsideContainment = veto.getOutsideContainmentEnergy();
  const auto peakOutside = maxIndexValue(outsideContainment);
  const double peakOutsideEnergy = peakOutside.second;
  const double totalOutsideEnergy = sumValues(outsideContainment);

  return !veto.passesVeto() ||
         (discCut >= 0. &&
          std::abs(veto.getDisc() - discCut) <= nearThresholdWindow) ||
         peakOutsideEnergy >= outsideContainmentThreshold ||
         totalOutsideEnergy >= outsideContainmentThreshold ||
         veto.getEcalBackEnergy() >= backEnergyThreshold ||
         (deepLayerThreshold >= 0 &&
          veto.getDeepestLayerHit() >= deepLayerThreshold);
}

}  // namespace

void VisGenerator::configure(framework::config::Parameters& ps) {
  includeGroundTruth_ = ps.getParameter<bool>("includeGroundTruth");
  originIdAvailable_ = ps.getParameter<bool>("originIdAvailable");
  nbrOfElectrons_ = ps.getParameter<int>("nbrOfElectrons");

  ecalSimHitColl_ = ps.getParameter<std::string>("ecalSimHitColl");
  ecalSimHitPass_ = ps.getParameter<std::string>("ecalSimHitPass");
  includeHcalSimHits_ = ps.getParameter<bool>("includeHcalSimHits");
  hcalSimHitColl_ = ps.getParameter<std::string>("hcalSimHitColl");
  hcalSimHitPass_ = ps.getParameter<std::string>("hcalSimHitPass");

  visHitOrigin_ = ps.getParameter<bool>("visHitOrigin");
  truthFilename_ = ps.getParameter<std::string>("truthFilename");

  includeEcalRecHits_ = ps.getParameter<bool>("includeEcalRecHits");
  ecalRecHitColl_ = ps.getParameter<std::string>("ecalRecHitColl");
  ecalRecHitPass_ = ps.getParameter<std::string>("ecalRecHitPass");
  includeHcalRecHits_ = ps.getParameter<bool>("includeHcalRecHits");
  hcalRecHitColl_ = ps.getParameter<std::string>("hcalRecHitColl");
  hcalRecHitPass_ = ps.getParameter<std::string>("hcalRecHitPass");

  includeEcalClusters_ = ps.getParameter<bool>("includeEcalClusters");
  ecalClusterColl_ = ps.getParameter<std::string>("ecalClusterColl");
  ecalClusterPass_ = ps.getParameter<std::string>("ecalClusterPass");
  includeEcalVeto_ = ps.getParameter<bool>("includeEcalVeto");
  ecalVetoName_ = ps.getParameter<std::string>("ecalVetoName");
  ecalVetoPass_ = ps.getParameter<std::string>("ecalVetoPass");
  ecalVetoDiscCut_ = ps.getParameter<double>("ecalVetoDiscCut");
  onlyInterestingEcalVetoEvents_ =
      ps.getParameter<bool>("onlyInterestingEcalVetoEvents");
  ecalVetoNearThresholdWindow_ =
      ps.getParameter<double>("ecalVetoNearThresholdWindow");
  ecalVetoOutsideContainmentThreshold_ =
      ps.getParameter<double>("ecalVetoOutsideContainmentThreshold");
  ecalVetoBackEnergyThreshold_ =
      ps.getParameter<double>("ecalVetoBackEnergyThreshold");
  ecalVetoDeepLayerThreshold_ =
      ps.getParameter<int>("ecalVetoDeepLayerThreshold");
  includeHcalVeto_ = ps.getParameter<bool>("includeHcalVeto");
  hcalVetoName_ = ps.getParameter<std::string>("hcalVetoName");
  hcalVetoPass_ = ps.getParameter<std::string>("hcalVetoPass");

  visLayers_ = ps.getParameter<bool>("visLayers");
  layerFilename_ = ps.getParameter<std::string>("layerFilename");

  filename_ = ps.getParameter<std::string>("filename");
  simParticlePass_ = ps.getParameter<std::string>("simParticlePass");
  includeSimParticles_ = ps.getParameter<bool>("includeSimParticles");
  includeVisualizationTrajectories_ =
      ps.getParameter<bool>("includeVisualizationTrajectories");
  trajectoryColl_ = ps.getParameter<std::string>("trajectoryColl");
  trajectoryPass_ = ps.getParameter<std::string>("trajectoryPass");
  includeAllTruthTracks_ = ps.getParameter<bool>("includeAllTruthTracks");
  truthTrackEnergyThreshold_ =
      ps.getParameter<double>("truthTrackEnergyThreshold");
  sampleLabel_ = ps.getParameter<std::string>("sampleLabel");
  sampleModel_ = ps.getParameter<std::string>("sampleModel");
  sampleSelection_ = ps.getParameter<std::string>("sampleSelection");
  sampleDescription_ = ps.getParameter<std::string>("sampleDescription");

  onlyIncludeEvents_ = ps.getParameter<std::vector<int>>("onlyIncludeEvents");
  excludeEvents_ = ps.getParameter<std::vector<int>>("excludeEvents");
  // if onlyincludeevents = [ -1 ], user has not given custom parameters --
  // clear
  if (onlyIncludeEvents_.size() == 1 &&
      std::find(onlyIncludeEvents_.begin(), onlyIncludeEvents_.end(), -1) !=
          onlyIncludeEvents_.end()) {
    onlyIncludeEvents_.clear();
  }
  // if excludeevents = [ -1 ], user has not given custom parameters -- clear
  if (excludeEvents_.size() == 1 &&
      std::find(excludeEvents_.begin(), excludeEvents_.end(), -1) !=
          excludeEvents_.end()) {
    excludeEvents_.clear();
  }
  return;
}

void VisGenerator::ecalClusterRecHit(const framework::Event& event,
                                     const std::string& eKey) {
  // GROUND TRUTH HIT INFO
  std::vector<ldmx::SimCalorimeterHit> ecalSimHits;
  if (includeGroundTruth_) {
    ecalSimHits = event.getCollection<ldmx::SimCalorimeterHit>(ecalSimHitColl_,
                                                               ecalSimHitPass_);
  }

  // Initialize different collections based on what we want to visualize
  std::vector<ldmx::EcalCluster> ecalClusters;
  std::vector<ldmx::EcalHit> ecalRecHits;
  std::unordered_map<int, std::vector<int>> hitToCluster;
  if (includeEcalClusters_)
    ecalClusters = event.getCollection<ldmx::EcalCluster>(ecalClusterColl_,
                                                          ecalClusterPass_);
  if (includeEcalRecHits_) {
    ecalRecHits =
        event.getCollection<ldmx::EcalHit>(ecalRecHitColl_, ecalRecHitPass_);
    if (includeEcalClusters_) hitToCluster.reserve(ecalRecHits.size());
    // ----- HIT ORIGIN VISUALIZATION -----
    if (visHitOrigin_) {
      truth[eKey]["event number"] = event.getEventNumber();
      truth[eKey]["run number"] = runNbr_;
      truth[eKey]["Hits"] = json::object();
    }
  }

  int clusterID = 1;
  double clusterSize = 5.0;  // scale to energy?
  double singleClusterSize = 1.0;
  float clusterHitSize = 2.0;
  float clusterlessHitSize = 1.0;

  if (includeEcalClusters_) {
    // Clusters with zero hits should be removed by clusterproducer, this is for
    // debug
    j[eKey]["Hits"]["empty_clusters"] = json::array();

    for (auto const& cl : ecalClusters) {
      json cluster = json::object();
      cluster["type"] = "Box";
      if (cl.getHitIDs().size() != 0) {  // if cluster is not empty
        // create collection for cluster
        std::string& hex = colors[clusterID % colors.size()];
        std::string cKey = "cluster_" + std::to_string(clusterID);
        j[eKey]["Hits"][cKey] = json::array();
        // create centroid object
        cluster["energy"] = cl.getEnergy();
        cluster["color"] = hex;
        cluster["col"] = colorstrings[clusterID % colorstrings.size()];
        cluster["pos"] = {cl.getCentroidX(), cl.getCentroidY(),
                          cl.getCentroidZ(), clusterSize,
                          clusterSize,       clusterSize};
        if (includeEcalRecHits_) {
          // These need to be initialized as rechits will have this info
          cluster["ID"] = -1;
          if (includeGroundTruth_) {
            if (originIdAvailable_)
              cluster["originID"] = -1;
            else {
              cluster["incidentID"] = -1;
              cluster["E from unknown (%)"] = -1.;
            }
            for (int i = 1; i < nbrOfElectrons_ + 1; i++) {
              cluster[std::string("E from e") + std::to_string(i) + " (%)"] =
                  -1.;
            }
            cluster["immediate_child"] = false;
          }
          for (auto const& clHitID : cl.getHitIDs()) {
            // map hit id to cluster it belongs to
            auto it = hitToCluster.find(clHitID);
            if (it != hitToCluster.end()) {
              auto& vec = it->second;
              vec.push_back(clusterID);
          } else
              hitToCluster.insert({static_cast<int>(clHitID), {clusterID}});
          }
        }
        j[eKey]["Hits"][cKey].push_back(cluster);
        clusterID++;
      } else {  // empty cluster
        cluster["color"] = "0x000000";
        cluster["pos"] = {cl.getCentroidX(), cl.getCentroidY(),
                          cl.getCentroidZ(), singleClusterSize,
                          singleClusterSize, singleClusterSize};
        j[eKey]["Hits"]["empty_clusters"].push_back(cluster);
      }
    }
  }

  if (includeEcalRecHits_) {
    std::string hit_coll_name;
    if (includeEcalClusters_) {
      hit_coll_name = "clusterless_hits";
      j[eKey]["Hits"]["shared_hits"] = json::array();
    } else
      hit_coll_name = "ecal_rec_hits";
    j[eKey]["Hits"][hit_coll_name] = json::array();

    if (visHitOrigin_) {
      // double e1 = 0;
      // double e2 = 0;
      // make collection for each electron
      for (int i = 1; i < nbrOfElectrons_ + 1; i++) {
        truth[eKey]["Hits"][std::string("e") + std::to_string(i)] =
            json::array();
      }
      truth[eKey]["Hits"]["mixed"] = json::array();
    }

    for (auto const& hit : ecalRecHits) {
      json h = json::object();
      h["ID"] = hit.getID();
      h["type"] = "Box";
      h["energy"] = hit.getEnergy();
      if (includeGroundTruth_) {
        // find simhit matching to this rechit
        auto it = std::find_if(ecalSimHits.begin(), ecalSimHits.end(),
                               [&hit](const auto& simHit) {
                                 return simHit.getID() == hit.getID();
                               });
        if (it != ecalSimHits.end()) {
          std::vector<double> e;
          e.resize(nbrOfElectrons_ + 1);
          double eSum = 0.;
          int tag = 0;
          bool immediate_child = true;
          if (originIdAvailable_) {
            h["originID"] = json::array();
            for (int i = 0; i < it->getNumberOfContribs(); i++) {
              // for each contrib
              auto c = it->getContrib(i);
              h["originID"].push_back(c.origin_id_);
              if (i != 0 && c.origin_id_ != tag)
                tag = 0;  // mixed hit
              else
                tag = c.origin_id_;
              e[c.origin_id_] += c.edep_;  // add edep to correct electron
              eSum += c.edep_;
              if (c.incident_id_ > nbrOfElectrons_) {
                immediate_child =
                    false;  // not an immediate child of initial electrons
              }
            }
          } else {
            double eUnknown = 0.;
            h["incidentID"] = json::array();
            for (int i = 0; i < it->getNumberOfContribs(); i++) {
              auto c = it->getContrib(i);
              h["incidentID"].push_back(c.incident_id_);
              if (i != 0 && c.incident_id_ != tag)
                tag = 0;  // mixed hit
              else
                tag = c.incident_id_;
              if (c.incident_id_ > nbrOfElectrons_) {
                // if incident != initial electron
                // we don't know which electron this contrib comes from
                eUnknown += c.edep_;
                immediate_child = false;
              } else
                e[c.incident_id_] += c.edep_;
              eSum += c.edep_;
            }
            if (eSum > 0) {
              h["E from unknown (%)"] = 100. * eUnknown / eSum;
            }
          }
          if (eSum > 0) {
            for (int i = 1; i < nbrOfElectrons_ + 1; i++) {
              h[std::string("E from e") + std::to_string(i) + " (%)"] =
                  100. * e[i] / eSum;
            }
          }
          h["immediate_child"] = immediate_child;

          if (visHitOrigin_) {
            // add hit to truth json
            clusterHitSize = 2.0;
            json t = json::object();
            t["ID"] = hit.getID();
            t["type"] = "Box";
            t["energy"] = hit.getEnergy();
            t["originID"] = tag;
            t["immediate_child"] = immediate_child;
            t["pos"] = {hit.getXPos(),  hit.getYPos(),  hit.getZPos(),
                        clusterHitSize, clusterHitSize, clusterHitSize};
            t["color"] = colors[tag % nbrOfElectrons_];
            if (tag == 0)
              truth[eKey]["Hits"]["mixed"].push_back(t);
            else
              truth[eKey]["Hits"][std::string("e") + std::to_string(tag)]
                  .push_back(t);
          }
        }
      }
      if (includeEcalClusters_) {
        // Add hit to cluster it belongs to
        auto it = hitToCluster.find(hit.getID());
        if (it != hitToCluster.end()) {  // if hit is associated to a cluster
          auto& vec = it->second;
          if (vec.size() != 1) {  // if hit is shared between many clusters
            // Create a shared hit object
            json sh = json::object();
            clusterHitSize = 4.0;
            sh["ID"] = hit.getID();
            sh["type"] = "Box";
            sh["energy"] = hit.getEnergy();
            sh["color"] = "0xA9A9A9";
            sh["pos"] = {hit.getXPos(),  hit.getYPos(),  hit.getZPos(),
                         clusterHitSize, clusterHitSize, clusterHitSize};
            j[eKey]["Hits"]["shared_hits"].push_back(sh);
          }
          // add hit to cluster collection
          // color will automatically be set to same as centroid
          clusterHitSize = 2.0;
          h["pos"] = {hit.getXPos(),  hit.getYPos(),  hit.getZPos(),
                      clusterHitSize, clusterHitSize, clusterHitSize};
          for (int i = 0; i < vec.size(); i++) {
            std::string cKey = "cluster_" + std::to_string(vec[0]);
            j[eKey]["Hits"][cKey].push_back(h);
          }
          continue;
        }
      }
      // if hit is not associated to a cluster
      h["color"] = "0xFF0000";
      h["pos"] = {hit.getXPos(),      hit.getYPos(),      hit.getZPos(),
                  clusterlessHitSize, clusterlessHitSize, clusterlessHitSize};
      j[eKey]["Hits"][hit_coll_name].push_back(h);
    }
  }

  // For scoring plane hits
  // auto
  // ecalSpHits{event.getCollection<ldmx::SimTrackerHit>("EcalScoringPlaneHits")};
  // j[eKey]["Hits"]["plane_hits"] = json::array();
  // truth[eKey]["Hits"]["plane_hits"] = json::array();
  // for (ldmx::SimTrackerHit &spHit : ecalSpHits) {
  //   // std::cout << hit_id.plane() << std::endl;
  //   if ((spHit.getTrackID() == 1 || spHit.getTrackID() == 2)) {
  //     json ph = json::object();
  //     ph["ID"] = spHit.getTrackID();
  //     ph["type"] = "Box";
  //     std::vector<float> pos = spHit.getPosition();
  //     ph["pos"] = { double(pos[0]), double(pos[1]),
  //     double(pos[2]), 5.0, 5.0, 5.0 }; if (spHit.getTrackID() == 1) {
  //       ph["color"] = "0xEADE76";
  //     } else {
  //       ph["color"] = "0x76BDEA";
  //     }
  //     j[eKey]["Hits"]["plane_hits"].push_back(ph);
  //     truth[eKey]["Hits"]["plane_hits"].push_back(ph);
  //     // std::cout << hit_id.plane() << std::endl;
  //     // std::cout << pos[0] << ":" << pos[1] << ":" << pos[2] << std::endl;
  //   }
  //   if (hit_id.plane() != 31 || spHit.getMomentum()[2] <= 0) continue;

  //   if (spHit.getTrackID() == recoilTrackID) {
  //     if (sqrt(pow(spHit.getMomentum()[0], 2) +
  //               pow(spHit.getMomentum()[1], 2) +
  //               pow(spHit.getMomentum()[2], 2)) > pmax) {
  //       recoilP = spHit.getMomentum();
  //       recoilPos = spHit.getPosition();
  //       pmax = sqrt(pow(recoilP[0], 2) + pow(recoilP[1], 2) +
  //                   pow(recoilP[2], 2));
  //     }
  //   }
  // }
}

void VisGenerator::hcalHitCollections(const framework::Event& event,
                                      const std::string& eKey) {
  const auto& geometry = getCondition<ldmx::HcalGeometry>(
      ldmx::HcalGeometry::CONDITIONS_OBJECT_NAME);

  if (includeHcalSimHits_) {
    const auto& hcalSimHits = event.getCollection<ldmx::SimCalorimeterHit>(
        hcalSimHitColl_, hcalSimHitPass_);
    for (const auto& hit : hcalSimHits) {
      const ldmx::HcalID id(hit.getID());
      const auto pos = hit.getPosition();
      const auto dims = hcalSimHitHalfDimensions(geometry, id);
      const std::string collName =
          "hcal_sim_" + hcalSectionName(id.section());
      if (!j[eKey]["Hits"].contains(collName)) {
        j[eKey]["Hits"][collName] = json::array();
      }

      json h = json::object();
      h["ID"] = hit.getID();
      h["type"] = "Box";
      h["section"] = hcalSectionName(id.section());
      h["layer"] = id.layer();
      h["strip"] = id.strip();
      h["time"] = hit.getTime();
      h["energy"] = hit.getEdep();
      h["nContribs"] = hit.getNumberOfContribs();
      h["color"] = hcalSectionColor(id.section(), true);
      h["extent"] = "localized";
      h["pos"] = {double(pos.at(0)), double(pos.at(1)), double(pos.at(2)),
                  dims.at(0),       dims.at(1),       dims.at(2)};
      h["incidentIDs"] = json::array();
      h["trackIDs"] = json::array();
      h["pdgIDs"] = json::array();
      for (unsigned i = 0; i < hit.getNumberOfContribs(); ++i) {
        const auto contrib = hit.getContrib(i);
        h["incidentIDs"].push_back(contrib.incident_id_);
        h["trackIDs"].push_back(contrib.track_id_);
        h["pdgIDs"].push_back(contrib.pdg_code_);
      }
      j[eKey]["Hits"][collName].push_back(h);
    }
  }

  if (includeHcalRecHits_) {
    const auto& hcalRecHits =
        event.getCollection<ldmx::HcalHit>(hcalRecHitColl_, hcalRecHitPass_);
    for (const auto& hit : hcalRecHits) {
      const ldmx::HcalID id(hit.getID());
      const bool localizeRecHit =
          id.section() == ldmx::HcalID::HcalSection::BACK;
      const auto dims = localizeRecHit ? hcalBackRecHitHalfDimensions(geometry, id)
                                       : hcalHalfDimensions(geometry, id);
      const std::string collName =
          "hcal_rec_" + hcalSectionName(id.section());
      if (!j[eKey]["Hits"].contains(collName)) {
        j[eKey]["Hits"][collName] = json::array();
      }

      json h = json::object();
      h["ID"] = hit.getID();
      h["type"] = "Box";
      h["section"] = hcalSectionName(id.section());
      h["layer"] = id.layer();
      h["strip"] = id.strip();
      h["time"] = hit.getTime();
      h["energy"] = hit.getEnergy();
      h["pe"] = hit.getPE();
      h["minPE"] = hit.getMinPE();
      h["noise"] = hit.isNoise();
      h["color"] = hcalSectionColor(id.section(), false);
      h["extent"] = localizeRecHit ? "localized" : "strip";
      h["pos"] = {hit.getXPos(), hit.getYPos(), hit.getZPos(), dims.at(0),
                  dims.at(1), dims.at(2)};
      j[eKey]["Hits"][collName].push_back(h);
    }
  }
}

void VisGenerator::groundTruthTracks(const framework::Event& event,
                                     const std::string& eKey) {
  j[eKey]["Tracks"]["ground_truth_tracks"] = json::array();
  if (visHitOrigin_) {
    truth[eKey]["Tracks"] = json::object();
    truth[eKey]["Tracks"]["ground_truth_tracks"] = json::array();
  }
  auto particle_map{
      event.getMap<int, ldmx::SimParticle>("SimParticles", simParticlePass_)};
  for (const auto& it : particle_map) {
    const auto& particle = it.second;
    const auto& start = particle.getVertex();
    const auto& end = particle.getEndPoint();
    const bool isPrimary =
        particle.getParents().empty() ||
        std::find(particle.getParents().begin(), particle.getParents().end(),
                  0) != particle.getParents().end();
    if (trackSegmentLength(particle) < 1e-3) continue;
    if (particle.getEnergy() < truthTrackEnergyThreshold_) continue;
    if (!includeAllTruthTracks_ && !isPrimary &&
        !isInterestingTruthTrack(particle))
      continue;

    json track = json::object();
    track["trackID"] = it.first;
    track["parentID"] = particle.getParents();
    track["daughterID"] = particle.getDaughters();
    track["pdgID"] = particle.getPdgID();
    track["energy"] = particle.getEnergy();
    track["processType"] = simProcessLabel(particle.getProcessType());
    track["vertexVolume"] = particle.getVertexVolume();
    track["interactionMaterial"] = particle.getInteractionMaterial();
    track["pos"] = json::array({json::array({start[0], start[1], start[2]}),
                                json::array({end[0], end[1], end[2]})});
    j[eKey]["Tracks"]["ground_truth_tracks"].push_back(track);
    if (visHitOrigin_) {
      truth[eKey]["Tracks"]["ground_truth_tracks"].push_back(track);
    }
  }
}

void VisGenerator::simParticles(const framework::Event& event,
                                const std::string& eKey) {
  j[eKey]["SimParticles"] = json::object();
  auto particle_map{
      event.getMap<int, ldmx::SimParticle>("SimParticles", simParticlePass_)};

  for (const auto& it : particle_map) {
    const auto& particle = it.second;
    const auto& vertex = particle.getVertex();
    const auto& end = particle.getEndPoint();
    const auto& momentum = particle.getMomentum();

    json entry = json::object();
    entry["trackID"] = it.first;
    entry["parentID"] = particle.getParents();
    entry["daughterID"] = particle.getDaughters();
    entry["pdgID"] = particle.getPdgID();
    entry["energy"] = particle.getEnergy();
    entry["mass"] = particle.getMass();
    entry["charge"] = particle.getCharge();
    entry["time"] = particle.getTime();
    entry["genStatus"] = particle.getGenStatus();
    entry["processType"] = simProcessLabel(particle.getProcessType());
    entry["vertexVolume"] = particle.getVertexVolume();
    entry["interactionMaterial"] = particle.getInteractionMaterial();
    entry["vertex"] = {vertex.at(0), vertex.at(1), vertex.at(2)};
    entry["endpoint"] = {end.at(0), end.at(1), end.at(2)};
    entry["momentum"] = {momentum.at(0), momentum.at(1), momentum.at(2)};

    j[eKey]["SimParticles"][std::to_string(it.first)] = entry;
  }
}

void VisGenerator::visualizationTrajectories(const framework::Event& event,
                                             const std::string& eKey) {
  if (!event.exists(trajectoryColl_, trajectoryPass_)) return;

  j[eKey]["Tracks"]["visualization_trajectories"] = json::array();
  const auto trajectories =
      event.getCollection<ldmx::SimTrajectory>(trajectoryColl_, trajectoryPass_);

  for (const auto& trajectory : trajectories) {
    if (trajectory.getPoints().size() < 2) continue;

    json entry = json::object();
    entry["trackID"] = trajectory.getTrackID();
    entry["parentID"] = trajectory.getParentID();
    entry["pdgID"] = trajectory.getPdgID();
    entry["role"] = trajectory.getRole();
    entry["pos"] = json::array();
    entry["times"] = json::array();
    entry["pointKinds"] = json::array();
    entry["volumes"] = json::array();

    for (const auto& point : trajectory.getPoints()) {
      entry["pos"].push_back({point.getX(), point.getY(), point.getZ()});
      entry["times"].push_back(point.getTime());
      entry["pointKinds"].push_back(point.getKind());
      entry["volumes"].push_back(point.getVolume());
    }

    j[eKey]["Tracks"]["visualization_trajectories"].push_back(entry);
  }
}

void VisGenerator::ecalVeto(const framework::Event& event,
                            const std::string& eKey,
                            const ldmx::EcalVetoResult& veto) {
  const auto& geometry = getCondition<ldmx::EcalGeometry>(
      ldmx::EcalGeometry::CONDITIONS_OBJECT_NAME);
  const auto interestingTags = ecalInterestingTags(
      veto, ecalVetoDiscCut_, ecalVetoNearThresholdWindow_,
      ecalVetoOutsideContainmentThreshold_, ecalVetoBackEnergyThreshold_,
      ecalVetoDeepLayerThreshold_);

  const auto electronContainment = veto.getElectronContainmentEnergy();
  const auto photonContainment = veto.getPhotonContainmentEnergy();
  const auto outsideContainment = veto.getOutsideContainmentEnergy();
  const auto outsideContainmentNHits = veto.getOutsideContainmentNHits();
  const auto layerReadout = veto.getEcalLayerEdepReadout();
  const auto segmentEnergy = veto.getEnergySeg();

  const auto [peakLayerIndex, peakLayerEnergy] = maxIndexValue(layerReadout);
  const auto [peakOutsideRing, peakOutsideEnergy] =
      maxIndexValue(outsideContainment);
  const auto [peakSegmentIndex, peakSegmentEnergy] =
      maxIndexValue(segmentEnergy);

  j[eKey]["ecal_veto_pass"] = veto.passesVeto();
  j[eKey]["ecal_veto_disc"] = veto.getDisc();
  j[eKey]["ecal_veto_disc_cut"] = ecalVetoDiscCut_;
  j[eKey]["ecal_veto_interesting"] = !interestingTags.empty();
  j[eKey]["ecal_veto_fiducial"] = veto.getFiducial();
  j[eKey]["ecal_veto_tracking_fiducial"] = veto.getTrackingFiducial();
  j[eKey]["ecal_veto_deepest_layer_hit"] = veto.getDeepestLayerHit();
  j[eKey]["ecal_veto_n_readout_hits"] = veto.getNReadoutHits();
  j[eKey]["ecal_veto_n_tracking_hits"] = veto.getNTrackingHits();
  j[eKey]["ecal_veto_summed_det"] = veto.getSummedDet();
  j[eKey]["ecal_veto_summed_tight_iso"] = veto.getSummedTightIso();
  j[eKey]["ecal_veto_max_cell_dep"] = veto.getMaxCellDep();
  j[eKey]["ecal_veto_shower_rms"] = veto.getShowerRMS();
  j[eKey]["ecal_veto_x_std"] = veto.getXStd();
  j[eKey]["ecal_veto_y_std"] = veto.getYStd();
  j[eKey]["ecal_veto_avg_layer_hit"] = veto.getAvgLayerHit();
  j[eKey]["ecal_veto_std_layer_hit"] = veto.getStdLayerHit();
  j[eKey]["ecal_veto_ecal_back_energy"] = veto.getEcalBackEnergy();
  j[eKey]["ecal_veto_ep_ang"] = veto.getEPAng();
  j[eKey]["ecal_veto_ep_ang_at_target"] = veto.getEPAngAtTarget();
  j[eKey]["ecal_veto_ep_sep"] = veto.getEPSep();
  j[eKey]["ecal_veto_ep_dot"] = veto.getEPDot();
  j[eKey]["ecal_veto_ep_dot_at_target"] = veto.getEPDotAtTarget();
  j[eKey]["ecal_veto_peak_layer"] = peakLayerIndex;
  j[eKey]["ecal_veto_peak_layer_energy"] = peakLayerEnergy;
  j[eKey]["ecal_veto_peak_outside_ring"] = peakOutsideRing;
  j[eKey]["ecal_veto_peak_outside_energy"] = peakOutsideEnergy;
  j[eKey]["ecal_veto_peak_segment"] = peakSegmentIndex;
  j[eKey]["ecal_veto_peak_segment_energy"] = peakSegmentEnergy;
  j[eKey]["ecal_veto_recoil_x"] = veto.getRecoilX();
  j[eKey]["ecal_veto_recoil_y"] = veto.getRecoilY();

  const auto recoilMomentum = veto.getRecoilMomentum();
  j[eKey]["ecal_veto_recoil_px"] = recoilMomentum.at(0);
  j[eKey]["ecal_veto_recoil_py"] = recoilMomentum.at(1);
  j[eKey]["ecal_veto_recoil_pz"] = recoilMomentum.at(2);

  json summary = json::object();
  summary["pass"] = veto.passesVeto();
  summary["disc"] = veto.getDisc();
  summary["discCut"] = ecalVetoDiscCut_;
  if (ecalVetoDiscCut_ >= 0.) {
    const double discMargin = veto.getDisc() - ecalVetoDiscCut_;
    j[eKey]["ecal_veto_disc_margin"] = discMargin;
    summary["discMargin"] = discMargin;
  } else {
    j[eKey]["ecal_veto_disc_margin"] = nullptr;
    summary["discMargin"] = nullptr;
  }
  summary["interesting"] = !interestingTags.empty();
  summary["interestingTags"] = jsonArray(interestingTags);
  summary["fiducial"] = veto.getFiducial();
  summary["trackingFiducial"] = veto.getTrackingFiducial();
  summary["deepestLayerHit"] = veto.getDeepestLayerHit();
  summary["nReadoutHits"] = veto.getNReadoutHits();
  summary["nTrackingHits"] = veto.getNTrackingHits();
  summary["summedDet"] = veto.getSummedDet();
  summary["summedTightIso"] = veto.getSummedTightIso();
  summary["maxCellDep"] = veto.getMaxCellDep();
  summary["showerRMS"] = veto.getShowerRMS();
  summary["xStd"] = veto.getXStd();
  summary["yStd"] = veto.getYStd();
  summary["avgLayerHit"] = veto.getAvgLayerHit();
  summary["stdLayerHit"] = veto.getStdLayerHit();
  summary["ecalBackEnergy"] = veto.getEcalBackEnergy();
  summary["epAng"] = veto.getEPAng();
  summary["epAngAtTarget"] = veto.getEPAngAtTarget();
  summary["epSep"] = veto.getEPSep();
  summary["epDot"] = veto.getEPDot();
  summary["epDotAtTarget"] = veto.getEPDotAtTarget();
  summary["peakLayerIndex"] = peakLayerIndex;
  summary["peakLayerEnergy"] = peakLayerEnergy;
  summary["peakOutsideRing"] = peakOutsideRing;
  summary["peakOutsideEnergy"] = peakOutsideEnergy;
  summary["peakSegmentIndex"] = peakSegmentIndex;
  summary["peakSegmentEnergy"] = peakSegmentEnergy;
  summary["recoilMomentum"] = {recoilMomentum.at(0), recoilMomentum.at(1),
                               recoilMomentum.at(2)};
  summary["recoilPosition"] = {veto.getRecoilX(), veto.getRecoilY(),
                               geometry.getEcalFrontZ()};

  summary["containment"] = json::object();
  summary["containment"]["electronEnergy"] = jsonArray(electronContainment);
  summary["containment"]["photonEnergy"] = jsonArray(photonContainment);
  summary["containment"]["outsideEnergy"] = jsonArray(outsideContainment);
  summary["containment"]["outsideNHits"] =
      jsonArray(outsideContainmentNHits);
  summary["containment"]["outsideXStd"] =
      jsonArray(veto.getOutsideContainmentXStd());
  summary["containment"]["outsideYStd"] =
      jsonArray(veto.getOutsideContainmentYStd());

  summary["segments"] = json::object();
  summary["segments"]["energy"] = jsonArray(segmentEnergy);
  summary["segments"]["xMean"] = jsonArray(veto.getXMeanSeg());
  summary["segments"]["yMean"] = jsonArray(veto.getYMeanSeg());
  summary["segments"]["xStd"] = jsonArray(veto.getXStdSeg());
  summary["segments"]["yStd"] = jsonArray(veto.getYStdSeg());
  summary["segments"]["layerMean"] = jsonArray(veto.getLayerMeanSeg());
  summary["segments"]["layerStd"] = jsonArray(veto.getLayerStdSeg());

  summary["layerReadoutEnergy"] = jsonArray(layerReadout);

  summary["profiles"] = json::object();
  summary["profiles"]["electron"] = {
      {"energy", jsonMatrix(veto.getEleContEnergy())},
      {"xMean", jsonMatrix(veto.getEleContXMean())},
      {"yMean", jsonMatrix(veto.getEleContYMean())}};
  summary["profiles"]["photon"] = {
      {"energy", jsonMatrix(veto.getPhContEnergy())},
      {"nHits", jsonMatrix(veto.getPhContNHits())},
      {"xMean", jsonMatrix(veto.getPhContXMean())},
      {"yMean", jsonMatrix(veto.getPhContYMean())}};
  summary["profiles"]["outside"] = {
      {"energy", jsonMatrix(veto.getOutContEnergy())},
      {"nHits", jsonMatrix(veto.getOutContNHits())},
      {"xMean", jsonMatrix(veto.getOutContXMean())},
      {"yMean", jsonMatrix(veto.getOutContYMean())},
      {"xStd", jsonMatrix(veto.getOutContXStd())},
      {"yStd", jsonMatrix(veto.getOutContYStd())},
      {"layerMean", jsonMatrix(veto.getOutContLayerMean())},
      {"layerStd", jsonMatrix(veto.getOutContLayerStd())}};

  j[eKey]["EcalVeto"] = summary;

  const bool recoilDefined =
      std::abs(veto.getRecoilX()) > 1e-6 || std::abs(veto.getRecoilY()) > 1e-6 ||
      std::abs(recoilMomentum.at(0)) > 1e-6 ||
      std::abs(recoilMomentum.at(1)) > 1e-6 ||
      std::abs(recoilMomentum.at(2)) > 1e-6;
  if (recoilDefined) {
    j[eKey]["Hits"]["ecal_veto_recoil_point"] = json::array();
    json recoilMarker = json::object();
    recoilMarker["type"] = "Box";
    recoilMarker["color"] = veto.passesVeto() ? "0x5F96D3" : "0xD3855F";
    recoilMarker["role"] = "ecal_veto_recoil_point";
    recoilMarker["trackFiducial"] = veto.getTrackingFiducial();
    recoilMarker["pos"] = {veto.getRecoilX(), veto.getRecoilY(),
                           geometry.getEcalFrontZ(), 12.0, 12.0, 6.0};
    recoilMarker["momentum"] = {recoilMomentum.at(0), recoilMomentum.at(1),
                                recoilMomentum.at(2)};
    recoilMarker["disc"] = veto.getDisc();
    j[eKey]["Hits"]["ecal_veto_recoil_point"].push_back(recoilMarker);
  }
}

void VisGenerator::hcalVeto(const framework::Event& event,
                            const std::string& eKey) {
  const auto& geometry = getCondition<ldmx::HcalGeometry>(
      ldmx::HcalGeometry::CONDITIONS_OBJECT_NAME);
  const auto veto =
      event.getObject<ldmx::HcalVetoResult>(hcalVetoName_, hcalVetoPass_);
  const auto maxHit = veto.getMaxPEHit();

  j[eKey]["hcal_veto_pass"] = veto.passesVeto();
  j[eKey]["hcal_veto_total_pe"] = veto.getTotalPE();
  j[eKey]["hcal_veto_num_valid_hits"] = veto.getNumValidHits();
  j[eKey]["hcal_veto_max_pe"] = maxHit.getPE();
  j[eKey]["hcal_veto_max_time"] = maxHit.getTime();
  j[eKey]["hcal_veto_max_section"] =
      maxHit.getSection() >= 0 ? hcalSectionName(maxHit.getSection()) : "none";
  j[eKey]["hcal_veto_max_layer"] = maxHit.getLayer();
  j[eKey]["hcal_veto_max_strip"] = maxHit.getStrip();

  if (maxHit.getID() < 0 || maxHit.getSection() < 0) return;

  const ldmx::HcalID id(maxHit.getID());
  const auto dims = hcalHalfDimensions(geometry, id);
  j[eKey]["Hits"]["hcal_veto_max_hit"] = json::array();
  json hit = json::object();
  hit["ID"] = maxHit.getID();
  hit["type"] = "Box";
  hit["section"] = hcalSectionName(maxHit.getSection());
  hit["layer"] = maxHit.getLayer();
  hit["strip"] = maxHit.getStrip();
  hit["time"] = maxHit.getTime();
  hit["energy"] = maxHit.getEnergy();
  hit["pe"] = maxHit.getPE();
  hit["minPE"] = maxHit.getMinPE();
  hit["noise"] = maxHit.isNoise();
  hit["color"] = veto.passesVeto() ? "0x7BC275" : "0xD16D77";
  hit["extent"] = "strip";
  hit["pos"] = {maxHit.getXPos(), maxHit.getYPos(), maxHit.getZPos(),
                dims.at(0),       dims.at(1),       dims.at(2)};
  j[eKey]["Hits"]["hcal_veto_max_hit"].push_back(hit);
}

static bool compZ(const ldmx::EcalHit& a, const ldmx::EcalHit& b) {
  return a.getZPos() < b.getZPos();
}

void VisGenerator::extractLayers(const framework::Event& event,
                                 const std::string& eKey) {
  layer[eKey]["event number"] = event.getEventNumber();
  layer[eKey]["run number"] = runNbr_;
  layer[eKey]["Hits"] = json::object();
  std::vector<double> layerThickness = {2.,   3.5,  5.3,  5.3, 5.3, 5.3,
                                        5.3,  5.3,  5.3,  5.3, 5.3, 10.5,
                                        10.5, 10.5, 10.5, 10.5};
  std::vector<ldmx::EcalHit> ecalRecHits =
      event.getCollection<ldmx::EcalHit>(ecalRecHitColl_, ecalRecHitPass_);
  if (ecalRecHits.empty()) return;
  std::sort(ecalRecHits.begin(), ecalRecHits.end(), compZ);
  int layerTag = 0;
  double layerZ = ecalRecHits[0].getZPos();
  std::string hex = colors[layerTag % colors.size()];
  std::string col = colorstrings[layerTag % colorstrings.size()];
  std::string layerKey = "layer_0";
  layer[eKey]["Hits"][layerKey] = json::array();
  double air = 10.;
  for (const auto& hit : ecalRecHits) {
    if (layerTag != 17 &&
        hit.getZPos() > layerZ + layerThickness[layerTag] + air) {
      layerZ = hit.getZPos();
      layerTag++;
      layerKey = "layer_" + std::to_string(layerTag);
      hex = colors[layerTag % colors.size()];
      col = colorstrings[layerTag % colorstrings.size()];
      layer[eKey]["Hits"][layerKey] = json::array();
    }
    json h = json::object();
    h["ID"] = hit.getID();
    h["type"] = "Box";
    h["energy"] = hit.getEnergy();
    h["color"] = hex;
    h["col"] = col;
    h["pos"] = {hit.getXPos(), hit.getYPos(), hit.getZPos(), 2.0, 2.0, 2.0};
    layer[eKey]["Hits"][layerKey].push_back(h);
  }
}

void VisGenerator::analyze(const framework::Event& event) {
  // Check if event is in include only or exclude lists
  if (!onlyIncludeEvents_.empty() &&
      std::find(onlyIncludeEvents_.begin(), onlyIncludeEvents_.end(),
                event.getEventNumber()) == onlyIncludeEvents_.end())
    return;
  if (!excludeEvents_.empty() &&
      std::find(excludeEvents_.begin(), excludeEvents_.end(),
                event.getEventNumber()) != excludeEvents_.end())
    return;
  // checks
  if (!originIdAvailable_)
    visHitOrigin_ = false;  // cannot vis hit origin if no origin ID available
  if (includeGroundTruth_ && nbrOfElectrons_ == -1)
    return;  // for ground truth, need nbr of electrons

  std::optional<ldmx::EcalVetoResult> ecalVetoResult;
  if (includeEcalVeto_ || onlyInterestingEcalVetoEvents_) {
    if (!event.exists(ecalVetoName_, ecalVetoPass_)) return;
    ecalVetoResult =
        event.getObject<ldmx::EcalVetoResult>(ecalVetoName_, ecalVetoPass_);
    if (onlyInterestingEcalVetoEvents_ &&
        !isInterestingEcalVetoEvent(
            *ecalVetoResult, ecalVetoDiscCut_, ecalVetoNearThresholdWindow_,
            ecalVetoOutsideContainmentThreshold_,
            ecalVetoBackEnergyThreshold_, ecalVetoDeepLayerThreshold_)) {
      return;
    }
  }

  // ----- EVENT HEADER -----
  const std::string eKey =
      "EVENT_KEY_" + std::to_string(event.getEventNumber());
  j[eKey]["event number"] = event.getEventNumber();
  j[eKey]["run number"] = runNbr_;
  if (!sampleLabel_.empty()) j[eKey]["sample_label"] = sampleLabel_;
  if (!sampleModel_.empty()) j[eKey]["sample_model"] = sampleModel_;
  if (!sampleSelection_.empty())
    j[eKey]["sample_selection"] = sampleSelection_;
  if (!sampleDescription_.empty())
    j[eKey]["sample_description"] = sampleDescription_;

  // ----- HITS -----
  j[eKey]["Hits"] = json::object();

  // CLUSTER-RECHIT CONNECTION
  if (includeEcalClusters_ || includeEcalRecHits_)
    ecalClusterRecHit(event, eKey);
  if (includeHcalSimHits_ || includeHcalRecHits_) hcalHitCollections(event, eKey);
  if (includeEcalVeto_ && ecalVetoResult.has_value()) {
    ecalVeto(event, eKey, *ecalVetoResult);
  }
  if (includeHcalVeto_) hcalVeto(event, eKey);

  if (visLayers_) extractLayers(event, eKey);

  // ----- TRACKS -----
  j[eKey]["Tracks"] = json::object();

  // GROUND TRUTH (SIMULATED) PATHS
  if (includeGroundTruth_) groundTruthTracks(event, eKey);
  if (includeVisualizationTrajectories_)
    visualizationTrajectories(event, eKey);
  if (includeSimParticles_) simParticles(event, eKey);
  return;
}

void VisGenerator::onNewRun(const ldmx::RunHeader& runHeader) {
  runNbr_ = runHeader.getRunNumber();
}

void VisGenerator::onProcessEnd() {
  // Write to file
  std::ofstream file(filename_);
  file << std::setw(2) << j << std::endl;
  file.close();
  if (visHitOrigin_) {
    std::ofstream truthfile(truthFilename_);
    truthfile << std::setw(2) << truth << std::endl;
    truthfile.close();
  }

  if (visLayers_) {
    std::ofstream layerfile(layerFilename_);
    layerfile << std::setw(2) << layer << std::endl;
    layerfile.close();
  }
  return;
};

}  // namespace dqm

DECLARE_ANALYZER(dqm::VisGenerator);
