#include "DQM/CascadeHistoryDQM.h"

#include <cmath>

namespace dqm {

CascadeHistoryDQM::CascadeHistoryDQM(const std::string& name,
                                     framework::Process& process)
    : framework::Analyzer(name, process) {}

void CascadeHistoryDQM::configure(framework::config::Parameters& parameters) {
  cascade_coll_name_ =
      parameters.get<std::string>("cascade_coll_name", "PhotonuclearCascadeHistories");
  cascade_pass_name_ =
      parameters.get<std::string>("cascade_pass_name", "");
  leading_neutron_threshold_ =
      parameters.get<double>("leading_neutron_threshold", 0.5);
  high_energy_neutron_threshold_ =
      parameters.get<double>("high_energy_neutron_threshold", 1000.0);
}

void CascadeHistoryDQM::analyze(const framework::Event& event) {
  // Check if cascade histories exist in this event
  if (!event.exists(cascade_coll_name_, cascade_pass_name_)) {
    // No cascade histories - this is fine, just means BertiniWithHistoryModel
    // wasn't used or no PN interactions occurred
    return;
  }

  // Get the cascade histories map (track ID -> CascadeHistory)
  auto cascadeMap = event.getMap<int, ldmx::CascadeHistory>(
      cascade_coll_name_, cascade_pass_name_);

  if (cascadeMap.empty()) {
    return;
  }

  // Fill histogram for number of PN interactions with cascade history
  histograms_.fill("n_cascades", cascadeMap.size());

  // Analyze each cascade
  for (const auto& [trackId, history] : cascadeMap) {
    analyzeCascade(history, trackId);
  }
}

void CascadeHistoryDQM::analyzeCascade(const ldmx::CascadeHistory& history,
                                        int trackId) {
  const auto& steps = history.getSteps();

  if (steps.empty()) {
    return;
  }

  // Analyze the primary reaction first
  analyzePrimaryReaction(history);

  // Analyze kaon production (important for LDMX backgrounds)
  analyzeKaonProduction(history);

  // Analyze neutron production, especially high-energy neutrons
  analyzeNeutronProduction(history);

  // Analyze scattering kinematics and correlations
  analyzeKinematics(history);

  // Analyze cascade stages and energy balance
  analyzeEnergyBalance(history);

  // Basic cascade properties
  int nSteps = static_cast<int>(steps.size());
  histograms_.fill("cascade_n_steps", nSteps);
  histograms_.fill("cascade_target_A", history.getTargetA());
  histograms_.fill("cascade_target_Z", history.getTargetZ());

  // Incident photon energy
  double incidentEnergy = history.getIncidentEnergy();
  if (incidentEnergy > 0) {
    histograms_.fill("incident_photon_energy", incidentEnergy);
  }

  // Track statistics per cascade
  int nProtons = 0, nNeutrons = 0, nPions = 0, nKaons = 0, nOther = 0;
  int nInteracted = 0, nEscaped = 0;
  int maxGeneration = 0;
  double totalEnergy = 0.0;
  double maxStepEnergy = 0.0;

  for (const auto& step : steps) {
    int pdg = step.getPdgId();
    int category = getParticleCategory(pdg);

    // Count particle types
    switch (category) {
      case 0:
        nProtons++;
        break;
      case 1:
        nNeutrons++;
        break;
      case 2:
      case 3:
      case 4:
        nPions++;
        break;
      case 5:
        nKaons++;
        break;
      default:
        nOther++;
        break;
    }

    // Fill per-step histograms
    histograms_.fill("step_pdg_category", category);
    histograms_.fill("step_generation", step.getGeneration());
    histograms_.fill("step_zone", step.getZone());

    // Energy (stored in MeV)
    double energy = step.getEnergy();
    double ke = step.getKineticEnergy();

    histograms_.fill("step_energy", energy);
    histograms_.fill("step_ke", ke);
    totalEnergy += energy;
    if (energy > maxStepEnergy) {
      maxStepEnergy = energy;
    }

    // Position within nucleus (in fm)
    double r = std::sqrt(step.getX() * step.getX() + step.getY() * step.getY() +
                         step.getZ() * step.getZ());
    histograms_.fill("step_radius", r);
    histograms_.fill("step_x", step.getX());
    histograms_.fill("step_y", step.getY());
    histograms_.fill("step_z", step.getZ());

    // Track max generation
    if (step.getGeneration() > maxGeneration) {
      maxGeneration = step.getGeneration();
    }

    // Interaction/escape status
    if (step.didInteract()) {
      nInteracted++;
      histograms_.fill("interacted_pdg_category", category);
      histograms_.fill("interacted_generation", step.getGeneration());
    }
    if (step.didEscape()) {
      nEscaped++;
      histograms_.fill("escaped_pdg_category", category);
      histograms_.fill("escaped_ke", ke);
    }

    // Number of daughters
    histograms_.fill("step_n_daughters", step.getDaughterIds().size());

    // 2D histograms
    histograms_.fill("generation_vs_radius", step.getGeneration(), r);
    histograms_.fill("ke_vs_generation", ke, step.getGeneration());
  }

  // Per-cascade summary histograms
  histograms_.fill("cascade_n_protons", nProtons);
  histograms_.fill("cascade_n_neutrons", nNeutrons);
  histograms_.fill("cascade_n_pions", nPions);
  histograms_.fill("cascade_n_kaons", nKaons);
  histograms_.fill("cascade_n_other", nOther);
  histograms_.fill("cascade_n_interacted", nInteracted);
  histograms_.fill("cascade_n_escaped", nEscaped);
  histograms_.fill("cascade_max_generation", maxGeneration);
  histograms_.fill("cascade_total_energy", totalEnergy);
  histograms_.fill("cascade_max_step_energy", maxStepEnergy);

  // Fractions
  if (nSteps > 0) {
    double interactFrac = static_cast<double>(nInteracted) / nSteps;
    double escapeFrac = static_cast<double>(nEscaped) / nSteps;
    histograms_.fill("cascade_interact_fraction", interactFrac);
    histograms_.fill("cascade_escape_fraction", escapeFrac);
  }

  // Nucleon fraction
  int nNucleons = nProtons + nNeutrons;
  if (nSteps > 0) {
    double nucleonFrac = static_cast<double>(nNucleons) / nSteps;
    histograms_.fill("cascade_nucleon_fraction", nucleonFrac);
  }
}

int CascadeHistoryDQM::getParticleCategory(int pdgId) const {
  int absPdg = std::abs(pdgId);
  if (pdgId == 2212)
    return 0;  // proton
  if (pdgId == 2112)
    return 1;  // neutron
  if (pdgId == 211)
    return 2;  // pi+
  if (pdgId == -211)
    return 3;  // pi-
  if (pdgId == 111)
    return 4;  // pi0
  if (absPdg == 321 || absPdg == 311 || absPdg == 310 || absPdg == 130)
    return 5;  // kaons
  return 6;    // other
}

void CascadeHistoryDQM::analyzePrimaryReaction(
    const ldmx::CascadeHistory& history) {
  const auto& steps = history.getSteps();

  // Find the primary (incident) particle - generation 0
  const ldmx::CascadeStep* primary = nullptr;
  for (const auto& step : steps) {
    if (step.getGeneration() == 0) {
      primary = &step;
      break;
    }
  }

  if (!primary) {
    return;
  }

  // Fill primary particle properties
  histograms_.fill("primary_pdg", getParticleCategory(primary->getPdgId()));
  histograms_.fill("primary_energy", primary->getEnergy());
  histograms_.fill("primary_ke", primary->getKineticEnergy());

  // Get the target nucleon type
  // Target can be a single nucleon (proton/neutron) or a quasi-deuteron
  // Quasi-deuterons are virtual correlated nucleon pairs: pp, pn, nn
  // They use special PDG-like codes: 99111 (pp), 99112 (pn), 99122 (nn)
  histograms_.fill("primary_target", getTargetCategory(primary->getTargetPdgId()));

  // Collect first-generation daughters (direct products of primary reaction)
  std::vector<int> daughterPdgs;
  std::vector<const ldmx::CascadeStep*> daughters;

  // Find the daughter steps
  for (const auto& step : steps) {
    if (step.getGeneration() == 1 && step.getParentId() == primary->getHistoryId()) {
      daughters.push_back(&step);
      daughterPdgs.push_back(step.getPdgId());
    }
  }

  // Fill primary reaction multiplicity
  int nDaughters = static_cast<int>(daughters.size());
  histograms_.fill("primary_n_daughters", nDaughters);

  // Count daughter types
  int nProtons = 0, nNeutrons = 0, nPiPlus = 0, nPiMinus = 0, nPiZero = 0;
  int nKaons = 0, nOther = 0;
  double totalDaughterKE = 0.0;
  double maxDaughterKE = 0.0;

  for (const auto* d : daughters) {
    int pdg = d->getPdgId();
    double ke = d->getKineticEnergy();
    totalDaughterKE += ke;
    if (ke > maxDaughterKE) maxDaughterKE = ke;

    if (pdg == 2212)
      nProtons++;
    else if (pdg == 2112)
      nNeutrons++;
    else if (pdg == 211)
      nPiPlus++;
    else if (pdg == -211)
      nPiMinus++;
    else if (pdg == 111)
      nPiZero++;
    else if (std::abs(pdg) == 321 || std::abs(pdg) == 311 ||
             std::abs(pdg) == 310 || std::abs(pdg) == 130)
      nKaons++;
    else
      nOther++;

    // Fill per-daughter histograms
    histograms_.fill("primary_daughter_pdg", getParticleCategory(pdg));
    histograms_.fill("primary_daughter_ke", ke);
  }

  // Fill daughter count histograms
  histograms_.fill("primary_n_protons", nProtons);
  histograms_.fill("primary_n_neutrons", nNeutrons);
  histograms_.fill("primary_n_piplus", nPiPlus);
  histograms_.fill("primary_n_piminus", nPiMinus);
  histograms_.fill("primary_n_pizero", nPiZero);
  histograms_.fill("primary_n_pions", nPiPlus + nPiMinus + nPiZero);
  histograms_.fill("primary_n_kaons", nKaons);
  histograms_.fill("primary_n_other", nOther);

  // Energy transfer
  histograms_.fill("primary_total_daughter_ke", totalDaughterKE);
  histograms_.fill("primary_max_daughter_ke", maxDaughterKE);

  if (primary->getKineticEnergy() > 0) {
    double energyTransfer = totalDaughterKE / primary->getKineticEnergy();
    histograms_.fill("primary_energy_transfer_frac", energyTransfer);
  }

  // Classify the reaction type
  int reactionType = classifyPrimaryReaction(daughterPdgs);
  histograms_.fill("primary_reaction_type", reactionType);

  // 2D: reaction type vs primary energy
  histograms_.fill("primary_reaction_vs_energy", reactionType,
                   primary->getKineticEnergy());
}

int CascadeHistoryDQM::classifyPrimaryReaction(
    const std::vector<int>& daughterPdgs) const {
  // Count particle types in the final state
  int nProtons = 0, nNeutrons = 0, nPions = 0, nKaons = 0, nOther = 0;

  for (int pdg : daughterPdgs) {
    if (pdg == 2212)
      nProtons++;
    else if (pdg == 2112)
      nNeutrons++;
    else if (pdg == 211 || pdg == -211 || pdg == 111)
      nPions++;
    else if (std::abs(pdg) == 321 || std::abs(pdg) == 311 ||
             std::abs(pdg) == 310 || std::abs(pdg) == 130)
      nKaons++;
    else
      nOther++;
  }

  int nNucleons = nProtons + nNeutrons;

  // Classify based on products
  // 0: elastic (just nucleon out)
  // 1: single pion production (N + pi)
  // 2: double pion production (N + 2pi)
  // 3: multi-pion production (N + 3+pi)
  // 4: kaon production
  // 5: multi-nucleon knockout (2+ nucleons, no mesons)
  // 6: complex (other combinations)

  if (nKaons > 0) {
    return 4;  // kaon production
  }

  if (nPions == 0 && nOther == 0) {
    if (nNucleons == 1) {
      return 0;  // quasi-elastic
    } else if (nNucleons >= 2) {
      return 5;  // multi-nucleon knockout
    }
  }

  if (nPions == 1 && nOther == 0) {
    return 1;  // single pion production
  }

  if (nPions == 2 && nOther == 0) {
    return 2;  // double pion production
  }

  if (nPions >= 3 && nOther == 0) {
    return 3;  // multi-pion production
  }

  return 6;  // complex/other
}

int CascadeHistoryDQM::getTargetCategory(int targetPdg) const {
  // Returns: 0=unknown, 1=proton, 2=neutron, 3=pp QD, 4=pn QD, 5=nn QD
  if (targetPdg == 2212)
    return 1;  // proton
  if (targetPdg == 2112)
    return 2;  // neutron
  if (targetPdg == 99111)
    return 3;  // pp quasi-deuteron (diproton)
  if (targetPdg == 99112)
    return 4;  // pn quasi-deuteron (unbound pn)
  if (targetPdg == 99122)
    return 5;  // nn quasi-deuteron (dineutron)
  return 0;    // unknown
}

bool CascadeHistoryDQM::isKaon(int pdgId) const {
  int absPdg = std::abs(pdgId);
  return (absPdg == 321 || absPdg == 311 || absPdg == 310 || absPdg == 130);
}

bool CascadeHistoryDQM::isNeutron(int pdgId) const {
  return (pdgId == 2112);
}

int CascadeHistoryDQM::getKaonCategory(int pdgId) const {
  // Returns: 0=K+, 1=K-, 2=K0, 3=K0bar, 4=K0S, 5=K0L, -1=not a kaon
  switch (pdgId) {
    case 321:
      return 0;   // K+
    case -321:
      return 1;   // K-
    case 311:
      return 2;   // K0
    case -311:
      return 3;   // K0bar
    case 310:
      return 4;   // K0S
    case 130:
      return 5;   // K0L
    default:
      return -1;  // Not a kaon
  }
}

const ldmx::CascadeStep* CascadeHistoryDQM::findStepByHistoryId(
    const std::vector<ldmx::CascadeStep>& steps, int historyId) const {
  for (const auto& step : steps) {
    if (step.getHistoryId() == historyId) {
      return &step;
    }
  }
  return nullptr;
}

void CascadeHistoryDQM::analyzeKaonProduction(
    const ldmx::CascadeHistory& history) {
  const auto& steps = history.getSteps();
  double incidentEnergy = history.getIncidentEnergy();

  // Counters for kaon types
  int nKaonPlus = 0, nKaonMinus = 0;
  int nKaonZero = 0, nKaonZeroBar = 0;
  int nKaonShort = 0, nKaonLong = 0;
  int nKaonsTotal = 0;
  int nKaonsEscaped = 0;

  // Track production details for each kaon
  for (const auto& step : steps) {
    if (!isKaon(step.getPdgId())) {
      continue;
    }

    nKaonsTotal++;
    int kaonCat = getKaonCategory(step.getPdgId());

    // Count by type
    switch (step.getPdgId()) {
      case 321:
        nKaonPlus++;
        break;
      case -321:
        nKaonMinus++;
        break;
      case 311:
        nKaonZero++;
        break;
      case -311:
        nKaonZeroBar++;
        break;
      case 310:
        nKaonShort++;
        break;
      case 130:
        nKaonLong++;
        break;
    }

    // Fill kaon type histogram
    histograms_.fill("kaon_type", kaonCat);

    // Production location in cascade
    histograms_.fill("kaon_generation", step.getGeneration());
    histograms_.fill("kaon_zone", step.getZone());

    // Position in nucleus
    double r = std::sqrt(step.getX() * step.getX() + step.getY() * step.getY() +
                         step.getZ() * step.getZ());
    histograms_.fill("kaon_radius", r);

    // Kinematics
    double ke = step.getKineticEnergy();
    histograms_.fill("kaon_ke", ke);
    histograms_.fill("kaon_energy", step.getEnergy());

    // Energy fraction relative to incident photon
    if (incidentEnergy > 0) {
      double energyFrac = ke / incidentEnergy;
      histograms_.fill("kaon_energy_fraction", energyFrac);
      histograms_.fill("kaon_type_vs_energy_frac", kaonCat, energyFrac);
    }

    // Did this kaon escape the nucleus?
    if (step.didEscape()) {
      nKaonsEscaped++;
      histograms_.fill("kaon_escaped_type", kaonCat);
      histograms_.fill("kaon_escaped_ke", ke);
      histograms_.fill("kaon_escaped_generation", step.getGeneration());
    }

    // Analyze parent particle (what produced this kaon?)
    int parentId = step.getParentId();
    if (parentId >= 0) {
      const ldmx::CascadeStep* parent = findStepByHistoryId(steps, parentId);
      if (parent) {
        int parentCat = getParticleCategory(parent->getPdgId());
        histograms_.fill("kaon_parent_type", parentCat);

        // 2D: kaon type vs parent type
        histograms_.fill("kaon_type_vs_parent", kaonCat, parentCat);

        // What was the target nucleon in the reaction that made this kaon?
        histograms_.fill("kaon_production_target",
                         getTargetCategory(parent->getTargetPdgId()));
      }
    }

    // 2D histograms
    histograms_.fill("kaon_ke_vs_generation", ke, step.getGeneration());
  }

  // Per-cascade kaon multiplicity histograms
  histograms_.fill("n_kaons_total", nKaonsTotal);
  histograms_.fill("n_kaons_escaped", nKaonsEscaped);
  histograms_.fill("n_kaon_plus", nKaonPlus);
  histograms_.fill("n_kaon_minus", nKaonMinus);
  histograms_.fill("n_kaon_zero", nKaonZero + nKaonZeroBar);
  histograms_.fill("n_kaon_short", nKaonShort);
  histograms_.fill("n_kaon_long", nKaonLong);

  // Charged vs neutral kaons
  int nChargedKaons = nKaonPlus + nKaonMinus;
  int nNeutralKaons = nKaonZero + nKaonZeroBar + nKaonShort + nKaonLong;
  histograms_.fill("n_kaons_charged", nChargedKaons);
  histograms_.fill("n_kaons_neutral", nNeutralKaons);

  // Flag cascades that produced any kaons
  if (nKaonsTotal > 0) {
    histograms_.fill("cascade_has_kaons", 1);
  } else {
    histograms_.fill("cascade_has_kaons", 0);
  }
}

void CascadeHistoryDQM::analyzeNeutronProduction(
    const ldmx::CascadeHistory& history) {
  const auto& steps = history.getSteps();
  double incidentEnergy = history.getIncidentEnergy();

  // Counters
  int nNeutronsTotal = 0;
  int nNeutronsEscaped = 0;
  int nLeadingNeutrons = 0;       // Energy fraction > threshold
  int nHighEnergyNeutrons = 0;    // KE > absolute threshold

  // Track the maximum energy neutron
  double maxNeutronKE = 0;
  double maxNeutronEnergyFrac = 0;
  int maxNeutronGeneration = -1;

  for (const auto& step : steps) {
    if (!isNeutron(step.getPdgId())) {
      continue;
    }

    nNeutronsTotal++;

    double ke = step.getKineticEnergy();
    int generation = step.getGeneration();

    // Basic neutron histograms
    histograms_.fill("neutron_ke", ke);
    histograms_.fill("neutron_generation", generation);
    histograms_.fill("neutron_zone", step.getZone());

    // Position
    double r = std::sqrt(step.getX() * step.getX() + step.getY() * step.getY() +
                         step.getZ() * step.getZ());
    histograms_.fill("neutron_radius", r);

    // Energy fraction
    double energyFrac = 0;
    if (incidentEnergy > 0) {
      energyFrac = ke / incidentEnergy;
      histograms_.fill("neutron_energy_fraction", energyFrac);
      histograms_.fill("neutron_ke_vs_generation", ke, generation);
      histograms_.fill("neutron_energy_frac_vs_generation", energyFrac,
                       generation);
    }

    // Track maximum energy neutron
    if (ke > maxNeutronKE) {
      maxNeutronKE = ke;
      maxNeutronEnergyFrac = energyFrac;
      maxNeutronGeneration = generation;
    }

    // High-energy neutron (absolute threshold)
    if (ke > high_energy_neutron_threshold_) {
      nHighEnergyNeutrons++;
      histograms_.fill("high_energy_neutron_ke", ke);
      histograms_.fill("high_energy_neutron_generation", generation);
      histograms_.fill("high_energy_neutron_energy_frac", energyFrac);

      // What produced this high-energy neutron?
      int parentId = step.getParentId();
      if (parentId >= 0) {
        const ldmx::CascadeStep* parent = findStepByHistoryId(steps, parentId);
        if (parent) {
          histograms_.fill("high_energy_neutron_parent",
                           getParticleCategory(parent->getPdgId()));
        }
      }

      if (step.didEscape()) {
        histograms_.fill("high_energy_neutron_escaped_ke", ke);
      }
    }

    // Leading neutron (relative threshold - fraction of incident energy)
    if (energyFrac > leading_neutron_threshold_) {
      nLeadingNeutrons++;
      histograms_.fill("leading_neutron_ke", ke);
      histograms_.fill("leading_neutron_generation", generation);
      histograms_.fill("leading_neutron_energy_frac", energyFrac);

      // What produced this leading neutron?
      int parentId = step.getParentId();
      if (parentId >= 0) {
        const ldmx::CascadeStep* parent = findStepByHistoryId(steps, parentId);
        if (parent) {
          int parentCat = getParticleCategory(parent->getPdgId());
          histograms_.fill("leading_neutron_parent", parentCat);

          // Target nucleon type
          histograms_.fill("leading_neutron_target",
                           getTargetCategory(parent->getTargetPdgId()));
        }
      }

      if (step.didEscape()) {
        histograms_.fill("leading_neutron_escaped_ke", ke);
        histograms_.fill("leading_neutron_escaped_energy_frac", energyFrac);
      }
    }

    // Escaped neutrons
    if (step.didEscape()) {
      nNeutronsEscaped++;
      histograms_.fill("neutron_escaped_ke", ke);
      histograms_.fill("neutron_escaped_generation", generation);
      histograms_.fill("neutron_escaped_energy_frac", energyFrac);
    }
  }

  // Per-cascade neutron multiplicity
  histograms_.fill("n_neutrons_total", nNeutronsTotal);
  histograms_.fill("n_neutrons_escaped", nNeutronsEscaped);
  histograms_.fill("n_leading_neutrons", nLeadingNeutrons);
  histograms_.fill("n_high_energy_neutrons", nHighEnergyNeutrons);

  // Maximum energy neutron in cascade (if any neutrons)
  if (nNeutronsTotal > 0) {
    histograms_.fill("max_neutron_ke", maxNeutronKE);
    histograms_.fill("max_neutron_energy_frac", maxNeutronEnergyFrac);
    histograms_.fill("max_neutron_generation", maxNeutronGeneration);
  }

  // Cascade-level flags
  if (nLeadingNeutrons > 0) {
    histograms_.fill("cascade_has_leading_neutron", 1);
  } else {
    histograms_.fill("cascade_has_leading_neutron", 0);
  }

  if (nHighEnergyNeutrons > 0) {
    histograms_.fill("cascade_has_high_energy_neutron", 1);
  } else {
    histograms_.fill("cascade_has_high_energy_neutron", 0);
  }

  // Escape fraction for neutrons
  if (nNeutronsTotal > 0) {
    double escapeFrac = static_cast<double>(nNeutronsEscaped) / nNeutronsTotal;
    histograms_.fill("neutron_escape_fraction", escapeFrac);
  }
}

void CascadeHistoryDQM::analyzeEnergyBalance(
    const ldmx::CascadeHistory& history) {
  const auto& steps = history.getSteps();
  double incidentEnergy = history.getIncidentEnergy();

  // Stage labels: 0=unknown, 1=incident, 2=primary, 3=cascade,
  //               4=preequilibrium, 5=absorbed, 6=spectator

  // Count particles by stage
  int nIncident = 0, nPrimary = 0, nCascade = 0;
  int nPreequilibrium = 0, nAbsorbed = 0, nSpectator = 0;

  // Energy sums by stage
  double energyPrimary = 0, energyCascade = 0;
  double energyPreequilibrium = 0, energyAbsorbed = 0;

  // Track escaped energy by stage
  double escapedEnergyPrimary = 0, escapedEnergyCascade = 0;
  double escapedEnergyPreequilibrium = 0;

  for (const auto& step : steps) {
    ldmx::CascadeStage stage = step.getStage();
    double ke = step.getKineticEnergy();
    bool escaped = step.didEscape();

    // Fill stage distribution
    histograms_.fill("step_stage", step.getStageInt());

    // Count and accumulate by stage
    switch (stage) {
      case ldmx::CascadeStage::INCIDENT:
        nIncident++;
        break;
      case ldmx::CascadeStage::PRIMARY:
        nPrimary++;
        energyPrimary += ke;
        histograms_.fill("primary_stage_ke", ke);
        if (escaped) {
          escapedEnergyPrimary += ke;
          histograms_.fill("primary_stage_escaped_ke", ke);
        }
        break;
      case ldmx::CascadeStage::CASCADE:
        nCascade++;
        energyCascade += ke;
        histograms_.fill("cascade_stage_ke", ke);
        if (escaped) {
          escapedEnergyCascade += ke;
          histograms_.fill("cascade_stage_escaped_ke", ke);
        }
        break;
      case ldmx::CascadeStage::PREEQUILIBRIUM:
        nPreequilibrium++;
        energyPreequilibrium += ke;
        histograms_.fill("preequilibrium_ke", ke);
        if (escaped) {
          escapedEnergyPreequilibrium += ke;
          histograms_.fill("preequilibrium_escaped_ke", ke);
        }
        break;
      case ldmx::CascadeStage::ABSORBED:
        nAbsorbed++;
        energyAbsorbed += ke;
        histograms_.fill("absorbed_ke", ke);
        break;
      case ldmx::CascadeStage::SPECTATOR:
        nSpectator++;
        break;
      default:
        break;
    }
  }

  // Fill stage multiplicity histograms
  histograms_.fill("n_primary_products", nPrimary);
  histograms_.fill("n_cascade_products", nCascade);
  histograms_.fill("n_preequilibrium", nPreequilibrium);
  histograms_.fill("n_absorbed", nAbsorbed);

  // Excitation energy analysis
  // This is the energy available for de-excitation of the residual nucleus
  double excitationEnergy = history.getExcitationEnergy();
  histograms_.fill("excitation_energy", excitationEnergy);

  if (incidentEnergy > 0) {
    double excitationFraction = excitationEnergy / incidentEnergy;
    histograms_.fill("excitation_fraction", excitationFraction);

    // 2D: excitation vs incident energy
    histograms_.fill("excitation_vs_incident", excitationEnergy, incidentEnergy);
  }

  // Residual nucleus properties
  int residualA = history.getResidualA();
  int residualZ = history.getResidualZ();
  histograms_.fill("residual_A", residualA);
  histograms_.fill("residual_Z", residualZ);

  // Number of knocked-out nucleons
  int targetA = history.getTargetA();
  int targetZ = history.getTargetZ();
  int knockedOutNucleons = targetA - residualA;
  int knockedOutProtons = targetZ - residualZ;
  int knockedOutNeutrons = knockedOutNucleons - knockedOutProtons;

  histograms_.fill("n_knocked_out_nucleons", knockedOutNucleons);
  histograms_.fill("n_knocked_out_protons", knockedOutProtons);
  histograms_.fill("n_knocked_out_neutrons", knockedOutNeutrons);

  // Energy balance analysis
  double totalEscapedEnergy = escapedEnergyPrimary + escapedEnergyCascade +
                              escapedEnergyPreequilibrium;
  histograms_.fill("total_escaped_energy", totalEscapedEnergy);

  if (incidentEnergy > 0) {
    double escapedFraction = totalEscapedEnergy / incidentEnergy;
    histograms_.fill("escaped_energy_fraction", escapedFraction);

    // Stage-specific energy fractions
    histograms_.fill("primary_energy_fraction", escapedEnergyPrimary / incidentEnergy);
    histograms_.fill("cascade_energy_fraction", escapedEnergyCascade / incidentEnergy);
    histograms_.fill("preequilibrium_energy_fraction",
                     escapedEnergyPreequilibrium / incidentEnergy);
  }

  // 2D correlations
  histograms_.fill("excitation_vs_escaped", excitationEnergy, totalEscapedEnergy);
  histograms_.fill("residual_A_vs_Z", residualA, residualZ);
  histograms_.fill("excitation_vs_knocked_out", excitationEnergy, knockedOutNucleons);

  // De-excitation analysis
  // De-excitation products are marked with stage=DEEXCITATION and generation=-1
  int nDeexcitation = 0;
  int nDeexcitationGammas = 0;
  int nDeexcitationNeutrons = 0;
  int nDeexcitationProtons = 0;
  int nDeexcitationAlphas = 0;
  double deexcitationEnergy = 0.0;

  for (const auto& step : steps) {
    if (step.getStage() == ldmx::CascadeStage::DEEXCITATION) {
      nDeexcitation++;
      double ke = step.getKineticEnergy();
      deexcitationEnergy += ke;

      int pdg = step.getPdgId();
      histograms_.fill("deexcitation_ke", ke);
      histograms_.fill("deexcitation_pdg", getParticleCategory(pdg));

      // Count by type
      if (pdg == 22) {
        nDeexcitationGammas++;
        histograms_.fill("deexcitation_gamma_energy", ke);
      } else if (pdg == 2112) {
        nDeexcitationNeutrons++;
        histograms_.fill("deexcitation_neutron_ke", ke);
      } else if (pdg == 2212) {
        nDeexcitationProtons++;
        histograms_.fill("deexcitation_proton_ke", ke);
      } else if (pdg == 1000020040) {
        nDeexcitationAlphas++;
        histograms_.fill("deexcitation_alpha_ke", ke);
      }
    }
  }

  // De-excitation multiplicity
  histograms_.fill("n_deexcitation", nDeexcitation);
  histograms_.fill("n_deexcitation_gammas", nDeexcitationGammas);
  histograms_.fill("n_deexcitation_neutrons", nDeexcitationNeutrons);
  histograms_.fill("n_deexcitation_protons", nDeexcitationProtons);
  histograms_.fill("n_deexcitation_alphas", nDeexcitationAlphas);
  histograms_.fill("deexcitation_total_energy", deexcitationEnergy);

  // Flag events with multiple low-energy de-excitation neutrons
  // These are important backgrounds for LDMX
  if (nDeexcitationNeutrons >= 3) {
    histograms_.fill("cascade_has_multi_deexcitation_neutrons", 1);
  } else {
    histograms_.fill("cascade_has_multi_deexcitation_neutrons", 0);
  }

  // 2D: de-excitation vs excitation energy
  histograms_.fill("deexcitation_vs_excitation", deexcitationEnergy, excitationEnergy);
  histograms_.fill("n_deexcitation_vs_excitation", nDeexcitation, excitationEnergy);
}

void CascadeHistoryDQM::analyzeKinematics(const ldmx::CascadeHistory& history) {
  const auto& steps = history.getSteps();
  double incidentEnergy = history.getIncidentEnergy();

  // Collect escaped particles for leading/sub-leading analysis
  std::vector<std::pair<double, const ldmx::CascadeStep*>> escapedByKE;
  std::vector<std::pair<double, const ldmx::CascadeStep*>> escapedByPT;

  // Count escaped particle types for multiplicity correlations
  int nEscapedProtons = 0, nEscapedNeutrons = 0, nEscapedPions = 0;
  int nEscapedCharged = 0, nEscapedNeutral = 0;
  double sumPT = 0.0;

  for (const auto& step : steps) {
    // Get momentum components (stored in MeV/c)
    double px = step.getPx();
    double py = step.getPy();
    double pz = step.getPz();
    double energy = step.getEnergy();
    double ke = step.getKineticEnergy();

    // Transverse and longitudinal momentum
    double pT = std::sqrt(px * px + py * py);
    double pL = pz;  // Longitudinal momentum (along beam axis)
    double pMag = std::sqrt(px * px + py * py + pz * pz);

    // Scattering angles
    // Theta: polar angle relative to z-axis (beam direction)
    double theta = 0.0;
    if (pMag > 0) {
      theta = std::acos(pz / pMag);  // radians
    }
    double thetaDeg = theta * 180.0 / M_PI;

    // Phi: azimuthal angle in x-y plane
    double phi = std::atan2(py, px);  // radians, range [-pi, pi]
    double phiDeg = phi * 180.0 / M_PI;

    // Pseudorapidity: eta = -ln(tan(theta/2))
    double eta = 0.0;
    if (theta > 1e-6 && theta < M_PI - 1e-6) {
      eta = -std::log(std::tan(theta / 2.0));
    }

    // Rapidity: y = 0.5 * ln((E+pL)/(E-pL))
    double rapidity = 0.0;
    if (energy > std::abs(pL) + 1e-6) {
      rapidity = 0.5 * std::log((energy + pL) / (energy - pL));
    }

    // Fill per-step kinematic histograms
    histograms_.fill("step_pt", pT);
    histograms_.fill("step_pL", pL);
    histograms_.fill("step_theta", thetaDeg);
    histograms_.fill("step_phi", phiDeg);
    histograms_.fill("step_eta", eta);
    histograms_.fill("step_rapidity", rapidity);

    // pT/E ratio (useful for understanding momentum transfer)
    if (energy > 0) {
      histograms_.fill("step_pt_over_e", pT / energy);
    }

    // Particle-type-specific kinematics
    int category = getParticleCategory(step.getPdgId());
    if (category == 0) {  // proton
      histograms_.fill("proton_theta", thetaDeg);
      histograms_.fill("proton_pt", pT);
    } else if (category == 1) {  // neutron
      histograms_.fill("neutron_theta", thetaDeg);
      histograms_.fill("neutron_pt", pT);
    } else if (category >= 2 && category <= 4) {  // pions
      histograms_.fill("pion_theta", thetaDeg);
      histograms_.fill("pion_pt", pT);
    }

    // 2D kinematic correlations for all steps
    histograms_.fill("pt_vs_eta", pT, eta);
    histograms_.fill("pt_vs_rapidity", pT, rapidity);
    histograms_.fill("theta_vs_ke", thetaDeg, ke);

    if (incidentEnergy > 0) {
      double energyFrac = ke / incidentEnergy;
      histograms_.fill("pt_vs_energy_frac", pT, energyFrac);
      histograms_.fill("theta_vs_energy_frac", thetaDeg, energyFrac);

      // Feynman-x: longitudinal momentum fraction
      // x_F = 2*pL/sqrt(s) ~ pL/pL_max
      // For photonuclear, approximate x_F as pL/(incidentEnergy)
      double xF = pL / incidentEnergy;
      histograms_.fill("step_feynman_x", xF);
      histograms_.fill("feynman_x_vs_pt", xF, pT);
    }

    // Track escaped particles for correlation analysis
    if (step.didEscape()) {
      escapedByKE.push_back({ke, &step});
      escapedByPT.push_back({pT, &step});
      sumPT += pT;

      // Fill escaped particle kinematics
      histograms_.fill("escaped_theta", thetaDeg);
      histograms_.fill("escaped_pt", pT);
      histograms_.fill("escaped_eta", eta);
      histograms_.fill("escaped_rapidity", rapidity);

      // 2D for escaped
      histograms_.fill("escaped_pt_vs_theta", pT, thetaDeg);
      histograms_.fill("escaped_pt_vs_ke", pT, ke);

      // Multiplicity counting
      int pdg = step.getPdgId();
      if (pdg == 2212) {
        nEscapedProtons++;
        nEscapedCharged++;
      } else if (pdg == 2112) {
        nEscapedNeutrons++;
        nEscapedNeutral++;
      } else if (std::abs(pdg) == 211) {
        nEscapedPions++;
        nEscapedCharged++;
      } else if (pdg == 111) {
        nEscapedPions++;
        nEscapedNeutral++;
      } else if (std::abs(pdg) == 321) {
        nEscapedCharged++;
      } else if (std::abs(pdg) == 311 || pdg == 310 || pdg == 130) {
        nEscapedNeutral++;
      }
    }
  }

  // Leading/sub-leading analysis (sorted by kinetic energy)
  std::sort(escapedByKE.begin(), escapedByKE.end(),
            [](const auto& a, const auto& b) { return a.first > b.first; });

  if (escapedByKE.size() >= 1) {
    double leadKE = escapedByKE[0].first;
    const auto* leadStep = escapedByKE[0].second;
    histograms_.fill("leading_escaped_ke", leadKE);
    histograms_.fill("leading_escaped_pdg", getParticleCategory(leadStep->getPdgId()));

    double leadPx = leadStep->getPx();
    double leadPy = leadStep->getPy();
    double leadPT = std::sqrt(leadPx * leadPx + leadPy * leadPy);
    histograms_.fill("leading_escaped_pt", leadPT);

    if (incidentEnergy > 0) {
      histograms_.fill("leading_escaped_energy_frac", leadKE / incidentEnergy);
    }

    if (escapedByKE.size() >= 2) {
      double subleadKE = escapedByKE[1].first;
      const auto* subleadStep = escapedByKE[1].second;
      histograms_.fill("subleading_escaped_ke", subleadKE);
      histograms_.fill("subleading_escaped_pdg",
                       getParticleCategory(subleadStep->getPdgId()));

      // Leading vs sub-leading correlations
      histograms_.fill("leading_vs_subleading_ke", leadKE, subleadKE);

      // Asymmetry: (E1 - E2) / (E1 + E2)
      double asymmetry = (leadKE - subleadKE) / (leadKE + subleadKE);
      histograms_.fill("leading_subleading_asymmetry", asymmetry);
    }
  }

  // Leading/sub-leading by pT
  std::sort(escapedByPT.begin(), escapedByPT.end(),
            [](const auto& a, const auto& b) { return a.first > b.first; });

  if (escapedByPT.size() >= 1) {
    histograms_.fill("leading_escaped_pt_value", escapedByPT[0].first);

    if (escapedByPT.size() >= 2) {
      histograms_.fill("subleading_escaped_pt_value", escapedByPT[1].first);
      histograms_.fill("leading_vs_subleading_pt", escapedByPT[0].first,
                       escapedByPT[1].first);
    }
  }

  // Multiplicity correlations
  int nEscaped = static_cast<int>(escapedByKE.size());
  if (nEscaped > 0) {
    histograms_.fill("n_escaped_charged", nEscapedCharged);
    histograms_.fill("n_escaped_neutral", nEscapedNeutral);
    histograms_.fill("escaped_charged_vs_neutral", nEscapedCharged, nEscapedNeutral);
    histograms_.fill("escaped_proton_vs_neutron", nEscapedProtons, nEscapedNeutrons);
    histograms_.fill("escaped_pion_vs_nucleon", nEscapedPions,
                     nEscapedProtons + nEscapedNeutrons);

    // Average pT
    double avgPT = sumPT / nEscaped;
    histograms_.fill("escaped_avg_pt", avgPT);
    histograms_.fill("escaped_sum_pt", sumPT);

    // Multiplicity vs average pT
    histograms_.fill("n_escaped_vs_avg_pt", nEscaped, avgPT);
  }
}

}  // namespace dqm

DECLARE_ANALYZER(dqm::CascadeHistoryDQM)
