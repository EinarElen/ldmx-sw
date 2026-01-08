#include "DQM/CascadeHistoryDQM.h"

#include <cmath>

namespace dqm {

CascadeHistoryDQM::CascadeHistoryDQM(const std::string& name,
                                     framework::Process& process)
    : framework::Analyzer(name, process) {}

void CascadeHistoryDQM::configure(framework::config::Parameters& parameters) {
  cascade_coll_name_ = parameters.get<std::string>(
      "cascade_coll_name", "PhotonuclearCascadeHistories");
  cascade_pass_name_ = parameters.get<std::string>("cascade_pass_name", "");
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
  auto cascade_map = event.getMap<int, ldmx::CascadeHistory>(cascade_coll_name_,
                                                            cascade_pass_name_);

  if (cascade_map.empty()) {
    return;
  }

  // Fill histogram for number of PN interactions with cascade history
  histograms_.fill("n_cascades", cascade_map.size());

  // Analyze each cascade
  for (const auto& [trackId, history] : cascade_map) {
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
  int n_steps = static_cast<int>(steps.size());
  histograms_.fill("cascade_n_steps", n_steps);
  histograms_.fill("cascade_target_A", history.getTargetA());
  histograms_.fill("cascade_target_Z", history.getTargetZ());

  // Incident photon energy
  double incident_energy = history.getIncidentEnergy();
  if (incident_energy > 0) {
    histograms_.fill("incident_photon_energy", incident_energy);
  }

  // Track statistics per cascade
  int n_protons = 0, n_neutrons = 0, n_pions = 0, n_kaons = 0, n_other = 0;
  int n_interacted = 0, n_escaped = 0;
  int max_generation = 0;
  double total_energy = 0.0;
  double max_step_energy = 0.0;

  for (const auto& step : steps) {
    int pdg = step.getPdgId();
    int category = getParticleCategory(pdg);

    // Count particle types
    switch (category) {
      case 0:
        n_protons++;
        break;
      case 1:
        n_neutrons++;
        break;
      case 2:
      case 3:
      case 4:
        n_pions++;
        break;
      case 5:
        n_kaons++;
        break;
      default:
        n_other++;
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
    total_energy += energy;
    if (energy > max_step_energy) {
      max_step_energy = energy;
    }

    // Position within nucleus (in fm)
    double r = std::sqrt(step.getX() * step.getX() + step.getY() * step.getY() +
                         step.getZ() * step.getZ());
    histograms_.fill("step_radius", r);
    histograms_.fill("step_x", step.getX());
    histograms_.fill("step_y", step.getY());
    histograms_.fill("step_z", step.getZ());

    // Track max generation
    if (step.getGeneration() > max_generation) {
      max_generation = step.getGeneration();
    }

    // Interaction/escape status
    if (step.didInteract()) {
      n_interacted++;
      histograms_.fill("interacted_pdg_category", category);
      histograms_.fill("interacted_generation", step.getGeneration());
    }
    if (step.didEscape()) {
      n_escaped++;
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
  histograms_.fill("cascade_n_protons", n_protons);
  histograms_.fill("cascade_n_neutrons", n_neutrons);
  histograms_.fill("cascade_n_pions", n_pions);
  histograms_.fill("cascade_n_kaons", n_kaons);
  histograms_.fill("cascade_n_other", n_other);
  histograms_.fill("cascade_n_interacted", n_interacted);
  histograms_.fill("cascade_n_escaped", n_escaped);
  histograms_.fill("cascade_max_generation", max_generation);
  histograms_.fill("cascade_total_energy", total_energy);
  histograms_.fill("cascade_max_step_energy", max_step_energy);

  // Fractions
  if (n_steps > 0) {
    double interact_frac = static_cast<double>(n_interacted) / n_steps;
    double escape_frac = static_cast<double>(n_escaped) / n_steps;
    histograms_.fill("cascade_interact_fraction", interact_frac);
    histograms_.fill("cascade_escape_fraction", escape_frac);
  }

  // Nucleon fraction
  int n_nucleons = n_protons + n_neutrons;
  if (n_steps > 0) {
    double nucleon_frac = static_cast<double>(n_nucleons) / n_steps;
    histograms_.fill("cascade_nucleon_fraction", nucleon_frac);
  }
}

int CascadeHistoryDQM::getParticleCategory(int pdgId) const {
  int abs_pdg = std::abs(pdgId);
  if (pdgId == 2212) return 0;  // proton
  if (pdgId == 2112) return 1;  // neutron
  if (pdgId == 211) return 2;   // pi+
  if (pdgId == -211) return 3;  // pi-
  if (pdgId == 111) return 4;   // pi0
  if (abs_pdg == 321 || abs_pdg == 311 || abs_pdg == 310 || abs_pdg == 130)
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
  histograms_.fill("primary_target",
                   getTargetCategory(primary->getTargetPdgId()));

  // Collect first-generation daughters (direct products of primary reaction)
  std::vector<int> daughter_pdgs;
  std::vector<const ldmx::CascadeStep*> daughters;

  // Find the daughter steps
  for (const auto& step : steps) {
    if (step.getGeneration() == 1 &&
        step.getParentId() == primary->getHistoryId()) {
      daughters.push_back(&step);
      daughter_pdgs.push_back(step.getPdgId());
    }
  }

  // Fill primary reaction multiplicity
  int n_daughters = static_cast<int>(daughters.size());
  histograms_.fill("primary_n_daughters", n_daughters);

  // Count daughter types
  int n_protons = 0, n_neutrons = 0, n_pi_plus = 0, n_pi_minus = 0, n_pi_zero = 0;
  int n_kaons = 0, n_other = 0;
  double total_daughter_ke = 0.0;
  double max_daughter_ke = 0.0;

  for (const auto* d : daughters) {
    int pdg = d->getPdgId();
    double ke = d->getKineticEnergy();
    total_daughter_ke += ke;
    if (ke > max_daughter_ke) max_daughter_ke = ke;

    if (pdg == 2212)
      n_protons++;
    else if (pdg == 2112)
      n_neutrons++;
    else if (pdg == 211)
      n_pi_plus++;
    else if (pdg == -211)
      n_pi_minus++;
    else if (pdg == 111)
      n_pi_zero++;
    else if (std::abs(pdg) == 321 || std::abs(pdg) == 311 ||
             std::abs(pdg) == 310 || std::abs(pdg) == 130)
      n_kaons++;
    else
      n_other++;

    // Fill per-daughter histograms
    histograms_.fill("primary_daughter_pdg", getParticleCategory(pdg));
    histograms_.fill("primary_daughter_ke", ke);
  }

  // Fill daughter count histograms
  histograms_.fill("primary_n_protons", n_protons);
  histograms_.fill("primary_n_neutrons", n_neutrons);
  histograms_.fill("primary_n_piplus", n_pi_plus);
  histograms_.fill("primary_n_piminus", n_pi_minus);
  histograms_.fill("primary_n_pizero", n_pi_zero);
  histograms_.fill("primary_n_pions", n_pi_plus + n_pi_minus + n_pi_zero);
  histograms_.fill("primary_n_kaons", n_kaons);
  histograms_.fill("primary_n_other", n_other);

  // Energy transfer
  histograms_.fill("primary_total_daughter_ke", total_daughter_ke);
  histograms_.fill("primary_max_daughter_ke", max_daughter_ke);

  if (primary->getKineticEnergy() > 0) {
    double energy_transfer = total_daughter_ke / primary->getKineticEnergy();
    histograms_.fill("primary_energy_transfer_frac", energy_transfer);
  }

  // Classify the reaction type
  int reaction_type = classifyPrimaryReaction(daughter_pdgs);
  histograms_.fill("primary_reaction_type", reaction_type);

  // 2D: reaction type vs primary energy
  histograms_.fill("primary_reaction_vs_energy", reaction_type,
                   primary->getKineticEnergy());
}

int CascadeHistoryDQM::classifyPrimaryReaction(
    const std::vector<int>& daughterPdgs) const {
  // Count particle types in the final state
  int n_protons = 0, n_neutrons = 0, n_pions = 0, n_kaons = 0, n_other = 0;

  for (int pdg : daughterPdgs) {
    if (pdg == 2212)
      n_protons++;
    else if (pdg == 2112)
      n_neutrons++;
    else if (pdg == 211 || pdg == -211 || pdg == 111)
      n_pions++;
    else if (std::abs(pdg) == 321 || std::abs(pdg) == 311 ||
             std::abs(pdg) == 310 || std::abs(pdg) == 130)
      n_kaons++;
    else
      n_other++;
  }

  int n_nucleons = n_protons + n_neutrons;

  // Classify based on products
  // 0: elastic (just nucleon out)
  // 1: single pion production (N + pi)
  // 2: double pion production (N + 2pi)
  // 3: multi-pion production (N + 3+pi)
  // 4: kaon production
  // 5: multi-nucleon knockout (2+ nucleons, no mesons)
  // 6: complex (other combinations)

  if (n_kaons > 0) {
    return 4;  // kaon production
  }

  if (n_pions == 0 && n_other == 0) {
    if (n_nucleons == 1) {
      return 0;  // quasi-elastic
    } else if (n_nucleons >= 2) {
      return 5;  // multi-nucleon knockout
    }
  }

  if (n_pions == 1 && n_other == 0) {
    return 1;  // single pion production
  }

  if (n_pions == 2 && n_other == 0) {
    return 2;  // double pion production
  }

  if (n_pions >= 3 && n_other == 0) {
    return 3;  // multi-pion production
  }

  return 6;  // complex/other
}

int CascadeHistoryDQM::getTargetCategory(int targetPdg) const {
  // Returns: 0=unknown, 1=proton, 2=neutron, 3=pp QD, 4=pn QD, 5=nn QD
  if (targetPdg == 2212) return 1;   // proton
  if (targetPdg == 2112) return 2;   // neutron
  if (targetPdg == 99111) return 3;  // pp quasi-deuteron (diproton)
  if (targetPdg == 99112) return 4;  // pn quasi-deuteron (unbound pn)
  if (targetPdg == 99122) return 5;  // nn quasi-deuteron (dineutron)
  return 0;                          // unknown
}

bool CascadeHistoryDQM::isKaon(int pdgId) const {
  int abs_pdg = std::abs(pdgId);
  return (abs_pdg == 321 || abs_pdg == 311 || abs_pdg == 310 || abs_pdg == 130);
}

bool CascadeHistoryDQM::isNeutron(int pdgId) const { return (pdgId == 2112); }

int CascadeHistoryDQM::getKaonCategory(int pdgId) const {
  // Returns: 0=K+, 1=K-, 2=K0, 3=K0bar, 4=K0S, 5=K0L, -1=not a kaon
  switch (pdgId) {
    case 321:
      return 0;  // K+
    case -321:
      return 1;  // K-
    case 311:
      return 2;  // K0
    case -311:
      return 3;  // K0bar
    case 310:
      return 4;  // K0S
    case 130:
      return 5;  // K0L
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
  double incident_energy = history.getIncidentEnergy();

  // Counters for kaon types
  int n_kaon_plus = 0, n_kaon_minus = 0;
  int n_kaon_zero = 0, n_kaon_zero_bar = 0;
  int n_kaon_short = 0, n_kaon_long = 0;
  int n_kaons_total = 0;
  int n_kaons_escaped = 0;

  // Track production details for each kaon
  for (const auto& step : steps) {
    if (!isKaon(step.getPdgId())) {
      continue;
    }

    n_kaons_total++;
    int kaon_cat = getKaonCategory(step.getPdgId());

    // Count by type
    switch (step.getPdgId()) {
      case 321:
        n_kaon_plus++;
        break;
      case -321:
        n_kaon_minus++;
        break;
      case 311:
        n_kaon_zero++;
        break;
      case -311:
        n_kaon_zero_bar++;
        break;
      case 310:
        n_kaon_short++;
        break;
      case 130:
        n_kaon_long++;
        break;
    }

    // Fill kaon type histogram
    histograms_.fill("kaon_type", kaon_cat);

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
    if (incident_energy > 0) {
      double energy_frac = ke / incident_energy;
      histograms_.fill("kaon_energy_fraction", energy_frac);
      histograms_.fill("kaon_type_vs_energy_frac", kaon_cat, energy_frac);
    }

    // Did this kaon escape the nucleus?
    if (step.didEscape()) {
      n_kaons_escaped++;
      histograms_.fill("kaon_escaped_type", kaon_cat);
      histograms_.fill("kaon_escaped_ke", ke);
      histograms_.fill("kaon_escaped_generation", step.getGeneration());
    }

    // Analyze parent particle (what produced this kaon?)
    int parent_id = step.getParentId();
    if (parent_id >= 0) {
      const ldmx::CascadeStep* parent = findStepByHistoryId(steps, parent_id);
      if (parent) {
        int parent_cat = getParticleCategory(parent->getPdgId());
        histograms_.fill("kaon_parent_type", parent_cat);

        // 2D: kaon type vs parent type
        histograms_.fill("kaon_type_vs_parent", kaon_cat, parent_cat);

        // What was the target nucleon in the reaction that made this kaon?
        histograms_.fill("kaon_production_target",
                         getTargetCategory(parent->getTargetPdgId()));
      }
    }

    // 2D histograms
    histograms_.fill("kaon_ke_vs_generation", ke, step.getGeneration());
  }

  // Per-cascade kaon multiplicity histograms
  histograms_.fill("n_kaons_total", n_kaons_total);
  histograms_.fill("n_kaons_escaped", n_kaons_escaped);
  histograms_.fill("n_kaon_plus", n_kaon_plus);
  histograms_.fill("n_kaon_minus", n_kaon_minus);
  histograms_.fill("n_kaon_zero", n_kaon_zero + n_kaon_zero_bar);
  histograms_.fill("n_kaon_short", n_kaon_short);
  histograms_.fill("n_kaon_long", n_kaon_long);

  // Charged vs neutral kaons
  int n_charged_kaons = n_kaon_plus + n_kaon_minus;
  int n_neutral_kaons = n_kaon_zero + n_kaon_zero_bar + n_kaon_short + n_kaon_long;
  histograms_.fill("n_kaons_charged", n_charged_kaons);
  histograms_.fill("n_kaons_neutral", n_neutral_kaons);

  // Flag cascades that produced any kaons
  if (n_kaons_total > 0) {
    histograms_.fill("cascade_has_kaons", 1);
  } else {
    histograms_.fill("cascade_has_kaons", 0);
  }
}

void CascadeHistoryDQM::analyzeNeutronProduction(
    const ldmx::CascadeHistory& history) {
  const auto& steps = history.getSteps();
  double incident_energy = history.getIncidentEnergy();

  // Counters
  int n_neutrons_total = 0;
  int n_neutrons_escaped = 0;
  int n_leading_neutrons = 0;     // Energy fraction > threshold
  int n_high_energy_neutrons = 0;  // KE > absolute threshold

  // Track the maximum energy neutron
  double max_neutron_ke = 0;
  double max_neutron_energy_frac = 0;
  int max_neutron_generation = -1;

  for (const auto& step : steps) {
    if (!isNeutron(step.getPdgId())) {
      continue;
    }

    n_neutrons_total++;

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
    double energy_frac = 0;
    if (incident_energy > 0) {
      energy_frac = ke / incident_energy;
      histograms_.fill("neutron_energy_fraction", energy_frac);
      histograms_.fill("neutron_ke_vs_generation", ke, generation);
      histograms_.fill("neutron_energy_frac_vs_generation", energy_frac,
                       generation);
    }

    // Track maximum energy neutron
    if (ke > max_neutron_ke) {
      max_neutron_ke = ke;
      max_neutron_energy_frac = energy_frac;
      max_neutron_generation = generation;
    }

    // High-energy neutron (absolute threshold)
    if (ke > high_energy_neutron_threshold_) {
      n_high_energy_neutrons++;
      histograms_.fill("high_energy_neutron_ke", ke);
      histograms_.fill("high_energy_neutron_generation", generation);
      histograms_.fill("high_energy_neutron_energy_frac", energy_frac);

      // What produced this high-energy neutron?
      int parent_id = step.getParentId();
      if (parent_id >= 0) {
        const ldmx::CascadeStep* parent = findStepByHistoryId(steps, parent_id);
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
    if (energy_frac > leading_neutron_threshold_) {
      n_leading_neutrons++;
      histograms_.fill("leading_neutron_ke", ke);
      histograms_.fill("leading_neutron_generation", generation);
      histograms_.fill("leading_neutron_energy_frac", energy_frac);

      // What produced this leading neutron?
      int parent_id = step.getParentId();
      if (parent_id >= 0) {
        const ldmx::CascadeStep* parent = findStepByHistoryId(steps, parent_id);
        if (parent) {
          int parent_cat = getParticleCategory(parent->getPdgId());
          histograms_.fill("leading_neutron_parent", parent_cat);

          // Target nucleon type
          histograms_.fill("leading_neutron_target",
                           getTargetCategory(parent->getTargetPdgId()));
        }
      }

      if (step.didEscape()) {
        histograms_.fill("leading_neutron_escaped_ke", ke);
        histograms_.fill("leading_neutron_escaped_energy_frac", energy_frac);
      }
    }

    // Escaped neutrons
    if (step.didEscape()) {
      n_neutrons_escaped++;
      histograms_.fill("neutron_escaped_ke", ke);
      histograms_.fill("neutron_escaped_generation", generation);
      histograms_.fill("neutron_escaped_energy_frac", energy_frac);
    }
  }

  // Per-cascade neutron multiplicity
  histograms_.fill("n_neutrons_total", n_neutrons_total);
  histograms_.fill("n_neutrons_escaped", n_neutrons_escaped);
  histograms_.fill("n_leading_neutrons", n_leading_neutrons);
  histograms_.fill("n_high_energy_neutrons", n_high_energy_neutrons);

  // Maximum energy neutron in cascade (if any neutrons)
  if (n_neutrons_total > 0) {
    histograms_.fill("max_neutron_ke", max_neutron_ke);
    histograms_.fill("max_neutron_energy_frac", max_neutron_energy_frac);
    histograms_.fill("max_neutron_generation", max_neutron_generation);
  }

  // Cascade-level flags
  if (n_leading_neutrons > 0) {
    histograms_.fill("cascade_has_leading_neutron", 1);
  } else {
    histograms_.fill("cascade_has_leading_neutron", 0);
  }

  if (n_high_energy_neutrons > 0) {
    histograms_.fill("cascade_has_high_energy_neutron", 1);
  } else {
    histograms_.fill("cascade_has_high_energy_neutron", 0);
  }

  // Escape fraction for neutrons
  if (n_neutrons_total > 0) {
    double escape_frac = static_cast<double>(n_neutrons_escaped) / n_neutrons_total;
    histograms_.fill("neutron_escape_fraction", escape_frac);
  }
}

void CascadeHistoryDQM::analyzeEnergyBalance(
    const ldmx::CascadeHistory& history) {
  const auto& steps = history.getSteps();
  double incident_energy = history.getIncidentEnergy();

  // Stage labels: 0=unknown, 1=incident, 2=primary, 3=cascade,
  //               4=preequilibrium, 5=absorbed, 6=spectator

  // Count particles by stage
  int n_incident = 0, n_primary = 0, n_cascade = 0;
  int n_preequilibrium = 0, n_absorbed = 0, n_spectator = 0;

  // Energy sums by stage
  double energy_primary = 0, energy_cascade = 0;
  double energy_preequilibrium = 0, energy_absorbed = 0;

  // Track escaped energy by stage
  double escaped_energy_primary = 0, escaped_energy_cascade = 0;
  double escaped_energy_preequilibrium = 0;

  for (const auto& step : steps) {
    ldmx::CascadeStage stage = step.getStage();
    double ke = step.getKineticEnergy();
    bool escaped = step.didEscape();

    // Fill stage distribution
    histograms_.fill("step_stage", step.getStageInt());

    // Count and accumulate by stage
    switch (stage) {
      case ldmx::CascadeStage::INCIDENT:
        n_incident++;
        break;
      case ldmx::CascadeStage::PRIMARY:
        n_primary++;
        energy_primary += ke;
        histograms_.fill("primary_stage_ke", ke);
        if (escaped) {
          escaped_energy_primary += ke;
          histograms_.fill("primary_stage_escaped_ke", ke);
        }
        break;
      case ldmx::CascadeStage::CASCADE:
        n_cascade++;
        energy_cascade += ke;
        histograms_.fill("cascade_stage_ke", ke);
        if (escaped) {
          escaped_energy_cascade += ke;
          histograms_.fill("cascade_stage_escaped_ke", ke);
        }
        break;
      case ldmx::CascadeStage::PREEQUILIBRIUM:
        n_preequilibrium++;
        energy_preequilibrium += ke;
        histograms_.fill("preequilibrium_ke", ke);
        if (escaped) {
          escaped_energy_preequilibrium += ke;
          histograms_.fill("preequilibrium_escaped_ke", ke);
        }
        break;
      case ldmx::CascadeStage::ABSORBED:
        n_absorbed++;
        energy_absorbed += ke;
        histograms_.fill("absorbed_ke", ke);
        break;
      case ldmx::CascadeStage::SPECTATOR:
        n_spectator++;
        break;
      default:
        break;
    }
  }

  // Fill stage multiplicity histograms
  histograms_.fill("n_primary_products", n_primary);
  histograms_.fill("n_cascade_products", n_cascade);
  histograms_.fill("n_preequilibrium", n_preequilibrium);
  histograms_.fill("n_absorbed", n_absorbed);

  // Excitation energy analysis
  // This is the energy available for de-excitation of the residual nucleus
  double excitation_energy = history.getExcitationEnergy();
  histograms_.fill("excitation_energy", excitation_energy);

  if (incident_energy > 0) {
    double excitation_fraction = excitation_energy / incident_energy;
    histograms_.fill("excitation_fraction", excitation_fraction);

    // 2D: excitation vs incident energy
    histograms_.fill("excitation_vs_incident", excitation_energy,
                     incident_energy);
  }

  // Residual nucleus properties
  int residual_a = history.getResidualA();
  int residual_z = history.getResidualZ();
  histograms_.fill("residual_A", residual_a);
  histograms_.fill("residual_Z", residual_z);

  // Number of knocked-out nucleons
  int target_a = history.getTargetA();
  int target_z = history.getTargetZ();
  int knocked_out_nucleons = target_a - residual_a;
  int knocked_out_protons = target_z - residual_z;
  int knocked_out_neutrons = knocked_out_nucleons - knocked_out_protons;

  histograms_.fill("n_knocked_out_nucleons", knocked_out_nucleons);
  histograms_.fill("n_knocked_out_protons", knocked_out_protons);
  histograms_.fill("n_knocked_out_neutrons", knocked_out_neutrons);

  // Energy balance analysis
  double total_escaped_energy =
      escaped_energy_primary + escaped_energy_cascade + escaped_energy_preequilibrium;
  histograms_.fill("total_escaped_energy", total_escaped_energy);

  if (incident_energy > 0) {
    double escaped_fraction = total_escaped_energy / incident_energy;
    histograms_.fill("escaped_energy_fraction", escaped_fraction);

    // Stage-specific energy fractions
    histograms_.fill("primary_energy_fraction",
                     escaped_energy_primary / incident_energy);
    histograms_.fill("cascade_energy_fraction",
                     escaped_energy_cascade / incident_energy);
    histograms_.fill("preequilibrium_energy_fraction",
                     escaped_energy_preequilibrium / incident_energy);
  }

  // 2D correlations
  histograms_.fill("excitation_vs_escaped", excitation_energy,
                   total_escaped_energy);
  histograms_.fill("residual_A_vs_Z", residual_a, residual_z);
  histograms_.fill("excitation_vs_knocked_out", excitation_energy,
                   knocked_out_nucleons);

  // De-excitation analysis
  // De-excitation products are marked with stage=DEEXCITATION and generation=-1
  int n_deexcitation = 0;
  int n_deexcitation_gammas = 0;
  int n_deexcitation_neutrons = 0;
  int n_deexcitation_protons = 0;
  int n_deexcitation_alphas = 0;
  double deexcitation_energy = 0.0;

  for (const auto& step : steps) {
    if (step.getStage() == ldmx::CascadeStage::DEEXCITATION) {
      n_deexcitation++;
      double ke = step.getKineticEnergy();
      deexcitation_energy += ke;

      int pdg = step.getPdgId();
      histograms_.fill("deexcitation_ke", ke);
      histograms_.fill("deexcitation_pdg", getParticleCategory(pdg));

      // Count by type
      if (pdg == 22) {
        n_deexcitation_gammas++;
        histograms_.fill("deexcitation_gamma_energy", ke);
      } else if (pdg == 2112) {
        n_deexcitation_neutrons++;
        histograms_.fill("deexcitation_neutron_ke", ke);
      } else if (pdg == 2212) {
        n_deexcitation_protons++;
        histograms_.fill("deexcitation_proton_ke", ke);
      } else if (pdg == 1000020040) {
        n_deexcitation_alphas++;
        histograms_.fill("deexcitation_alpha_ke", ke);
      }
    }
  }

  // De-excitation multiplicity
  histograms_.fill("n_deexcitation", n_deexcitation);
  histograms_.fill("n_deexcitation_gammas", n_deexcitation_gammas);
  histograms_.fill("n_deexcitation_neutrons", n_deexcitation_neutrons);
  histograms_.fill("n_deexcitation_protons", n_deexcitation_protons);
  histograms_.fill("n_deexcitation_alphas", n_deexcitation_alphas);
  histograms_.fill("deexcitation_total_energy", deexcitation_energy);

  // Flag events with multiple low-energy de-excitation neutrons
  // These are important backgrounds for LDMX
  if (n_deexcitation_neutrons >= 3) {
    histograms_.fill("cascade_has_multi_deexcitation_neutrons", 1);
  } else {
    histograms_.fill("cascade_has_multi_deexcitation_neutrons", 0);
  }

  // 2D: de-excitation vs excitation energy
  histograms_.fill("deexcitation_vs_excitation", deexcitation_energy,
                   excitation_energy);
  histograms_.fill("n_deexcitation_vs_excitation", n_deexcitation,
                   excitation_energy);
}

void CascadeHistoryDQM::analyzeKinematics(const ldmx::CascadeHistory& history) {
  const auto& steps = history.getSteps();
  double incident_energy = history.getIncidentEnergy();

  // Collect escaped particles for leading/sub-leading analysis
  std::vector<std::pair<double, const ldmx::CascadeStep*>> escaped_by_ke;
  std::vector<std::pair<double, const ldmx::CascadeStep*>> escaped_by_pt;

  // Count escaped particle types for multiplicity correlations
  int n_escaped_protons = 0, n_escaped_neutrons = 0, n_escaped_pions = 0;
  int n_escaped_charged = 0, n_escaped_neutral = 0;
  double sum_pt = 0.0;

  for (const auto& step : steps) {
    // Get momentum components (stored in MeV/c)
    double px = step.getPx();
    double py = step.getPy();
    double pz = step.getPz();
    double energy = step.getEnergy();
    double ke = step.getKineticEnergy();

    // Transverse and longitudinal momentum
    double p_t = std::sqrt(px * px + py * py);
    double p_l = pz;  // Longitudinal momentum (along beam axis)
    double p_mag = std::sqrt(px * px + py * py + pz * pz);

    // Scattering angles
    // Theta: polar angle relative to z-axis (beam direction)
    double theta = 0.0;
    if (p_mag > 0) {
      theta = std::acos(pz / p_mag);  // radians
    }
    double theta_deg = theta * 180.0 / M_PI;

    // Phi: azimuthal angle in x-y plane
    double phi = std::atan2(py, px);  // radians, range [-pi, pi]
    double phi_deg = phi * 180.0 / M_PI;

    // Pseudorapidity: eta = -ln(tan(theta/2))
    double eta = 0.0;
    if (theta > 1e-6 && theta < M_PI - 1e-6) {
      eta = -std::log(std::tan(theta / 2.0));
    }

    // Rapidity: y = 0.5 * ln((E+pL)/(E-pL))
    double rapidity = 0.0;
    if (energy > std::abs(p_l) + 1e-6) {
      rapidity = 0.5 * std::log((energy + p_l) / (energy - p_l));
    }

    // Fill per-step kinematic histograms
    histograms_.fill("step_pt", p_t);
    histograms_.fill("step_pL", p_l);
    histograms_.fill("step_theta", theta_deg);
    histograms_.fill("step_phi", phi_deg);
    histograms_.fill("step_eta", eta);
    histograms_.fill("step_rapidity", rapidity);

    // pT/E ratio (useful for understanding momentum transfer)
    if (energy > 0) {
      histograms_.fill("step_pt_over_e", p_t / energy);
    }

    // Particle-type-specific kinematics
    int category = getParticleCategory(step.getPdgId());
    if (category == 0) {  // proton
      histograms_.fill("proton_theta", theta_deg);
      histograms_.fill("proton_pt", p_t);
    } else if (category == 1) {  // neutron
      histograms_.fill("neutron_theta", theta_deg);
      histograms_.fill("neutron_pt", p_t);
    } else if (category >= 2 && category <= 4) {  // pions
      histograms_.fill("pion_theta", theta_deg);
      histograms_.fill("pion_pt", p_t);
    }

    // 2D kinematic correlations for all steps
    histograms_.fill("pt_vs_eta", p_t, eta);
    histograms_.fill("pt_vs_rapidity", p_t, rapidity);
    histograms_.fill("theta_vs_ke", theta_deg, ke);

    if (incident_energy > 0) {
      double energy_frac = ke / incident_energy;
      histograms_.fill("pt_vs_energy_frac", p_t, energy_frac);
      histograms_.fill("theta_vs_energy_frac", theta_deg, energy_frac);

      // Feynman-x: longitudinal momentum fraction
      // x_F = 2*pL/sqrt(s) ~ pL/pL_max
      // For photonuclear, approximate x_F as pL/(incidentEnergy)
      double x_f = p_l / incident_energy;
      histograms_.fill("step_feynman_x", x_f);
      histograms_.fill("feynman_x_vs_pt", x_f, p_t);
    }

    // Track escaped particles for correlation analysis
    if (step.didEscape()) {
      escaped_by_ke.push_back({ke, &step});
      escaped_by_pt.push_back({p_t, &step});
      sum_pt += p_t;

      // Fill escaped particle kinematics
      histograms_.fill("escaped_theta", theta_deg);
      histograms_.fill("escaped_pt", p_t);
      histograms_.fill("escaped_eta", eta);
      histograms_.fill("escaped_rapidity", rapidity);

      // 2D for escaped
      histograms_.fill("escaped_pt_vs_theta", p_t, theta_deg);
      histograms_.fill("escaped_pt_vs_ke", p_t, ke);

      // Multiplicity counting
      int pdg = step.getPdgId();
      if (pdg == 2212) {
        n_escaped_protons++;
        n_escaped_charged++;
      } else if (pdg == 2112) {
        n_escaped_neutrons++;
        n_escaped_neutral++;
      } else if (std::abs(pdg) == 211) {
        n_escaped_pions++;
        n_escaped_charged++;
      } else if (pdg == 111) {
        n_escaped_pions++;
        n_escaped_neutral++;
      } else if (std::abs(pdg) == 321) {
        n_escaped_charged++;
      } else if (std::abs(pdg) == 311 || pdg == 310 || pdg == 130) {
        n_escaped_neutral++;
      }
    }
  }

  // Leading/sub-leading analysis (sorted by kinetic energy)
  std::sort(escaped_by_ke.begin(), escaped_by_ke.end(),
            [](const auto& a, const auto& b) { return a.first > b.first; });

  if (escaped_by_ke.size() >= 1) {
    double lead_ke = escaped_by_ke[0].first;
    const auto* lead_step = escaped_by_ke[0].second;
    histograms_.fill("leading_escaped_ke", lead_ke);
    histograms_.fill("leading_escaped_pdg",
                     getParticleCategory(lead_step->getPdgId()));

    double lead_px = lead_step->getPx();
    double lead_py = lead_step->getPy();
    double lead_pt = std::sqrt(lead_px * lead_px + lead_py * lead_py);
    histograms_.fill("leading_escaped_pt", lead_pt);

    if (incident_energy > 0) {
      histograms_.fill("leading_escaped_energy_frac", lead_ke / incident_energy);
    }

    if (escaped_by_ke.size() >= 2) {
      double sublead_ke = escaped_by_ke[1].first;
      const auto* sublead_step = escaped_by_ke[1].second;
      histograms_.fill("subleading_escaped_ke", sublead_ke);
      histograms_.fill("subleading_escaped_pdg",
                       getParticleCategory(sublead_step->getPdgId()));

      // Leading vs sub-leading correlations
      histograms_.fill("leading_vs_subleading_ke", lead_ke, sublead_ke);

      // Asymmetry: (E1 - E2) / (E1 + E2)
      double asymmetry = (lead_ke - sublead_ke) / (lead_ke + sublead_ke);
      histograms_.fill("leading_subleading_asymmetry", asymmetry);
    }
  }

  // Leading/sub-leading by pT
  std::sort(escaped_by_pt.begin(), escaped_by_pt.end(),
            [](const auto& a, const auto& b) { return a.first > b.first; });

  if (escaped_by_pt.size() >= 1) {
    histograms_.fill("leading_escaped_pt_value", escaped_by_pt[0].first);

    if (escaped_by_pt.size() >= 2) {
      histograms_.fill("subleading_escaped_pt_value", escaped_by_pt[1].first);
      histograms_.fill("leading_vs_subleading_pt", escaped_by_pt[0].first,
                       escaped_by_pt[1].first);
    }
  }

  // Multiplicity correlations
  int n_escaped = static_cast<int>(escaped_by_ke.size());
  if (n_escaped > 0) {
    histograms_.fill("n_escaped_charged", n_escaped_charged);
    histograms_.fill("n_escaped_neutral", n_escaped_neutral);
    histograms_.fill("escaped_charged_vs_neutral", n_escaped_charged,
                     n_escaped_neutral);
    histograms_.fill("escaped_proton_vs_neutron", n_escaped_protons,
                     n_escaped_neutrons);
    histograms_.fill("escaped_pion_vs_nucleon", n_escaped_pions,
                     n_escaped_protons + n_escaped_neutrons);

    // Average pT
    double avg_pt = sum_pt / n_escaped;
    histograms_.fill("escaped_avg_pt", avg_pt);
    histograms_.fill("escaped_sum_pt", sum_pt);

    // Multiplicity vs average pT
    histograms_.fill("n_escaped_vs_avg_pt", n_escaped, avg_pt);
  }
}

}  // namespace dqm

DECLARE_ANALYZER(dqm::CascadeHistoryDQM)
