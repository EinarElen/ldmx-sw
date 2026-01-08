#ifndef DQM_CASCADEHISTORYDQM_H
#define DQM_CASCADEHISTORYDQM_H

#include "Framework/Configure/Parameters.h"
#include "Framework/Event.h"
#include "Framework/EventProcessor.h"
#include "SimCore/Bertini/CascadeHistory.h"
#include "SimCore/Bertini/CascadeStep.h"

namespace dqm {

/**
 * @class CascadeHistoryDQM
 * @brief DQM analyzer for Bertini cascade history data
 *
 * This analyzer examines the internal Bertini cascade history that is captured
 * when using the BertiniWithHistoryModel. It produces histograms characterizing
 * the intranuclear cascade including:
 * - Number of cascade steps per event
 * - Particle type distributions
 * - Generation (cascade depth) distributions
 * - Position distributions within the nucleus
 * - Energy distributions
 * - Interaction vs escape rates
 *
 * Special focus areas:
 * - Kaon production: All kaon types (K+, K-, K0, K0bar, K0S, K0L), production
 *   mechanisms, kinematics, and parent particles
 * - High-energy neutrons: Neutrons carrying significant fraction of incident
 *   energy, especially "leading" neutrons that could be backgrounds
 *
 * This analyzer works alongside PhotoNuclearDQM - it provides complementary
 * information about the internal cascade dynamics while PhotoNuclearDQM
 * focuses on the final-state particles.
 */
class CascadeHistoryDQM : public framework::Analyzer {
 public:
  /// Constructor
  CascadeHistoryDQM(const std::string& name, framework::Process& process);

  /// Destructor
  virtual ~CascadeHistoryDQM() = default;

  /**
   * Configure this analyzer using the user specified parameters.
   *
   * @param parameters Set of parameters used to configure this analyzer.
   */
  void configure(framework::config::Parameters& parameters) override;

  /**
   * Process the event and create the histogram summaries.
   *
   * @param event The event to analyze.
   */
  void analyze(const framework::Event& event) override;

 private:
  /**
   * Fill histograms for a single cascade history
   */
  void analyzeCascade(const ldmx::CascadeHistory& history, int trackId);

  /**
   * Analyze the primary reaction (first interaction in the cascade)
   */
  void analyzePrimaryReaction(const ldmx::CascadeHistory& history);

  /**
   * Classify the primary reaction type based on final state particles
   * Returns reaction category index for histogram
   */
  int classifyPrimaryReaction(const std::vector<int>& daughterPdgs) const;

  /**
   * Get particle category for histogram binning
   * Returns: 0=proton, 1=neutron, 2=pi+, 3=pi-, 4=pi0, 5=kaon, 6=other
   */
  int getParticleCategory(int pdgId) const;

  /**
   * Get target nucleon category for histogram binning
   * Returns: 0=unknown, 1=proton, 2=neutron, 3=pp QD, 4=pn QD, 5=nn QD
   */
  int getTargetCategory(int targetPdg) const;

  /**
   * Analyze kaon production in the cascade
   *
   * Tracks all kaon species: K+ (321), K- (-321), K0 (311), K0bar (-311),
   * K0S (310), K0L (130). Records:
   * - Kaon type distribution
   * - Production generation and zone
   * - Kinetic energy and energy fraction
   * - Parent particle type
   * - Whether kaons escaped the nucleus
   * - Kaon multiplicity per cascade
   *
   * @param history The cascade history to analyze
   */
  void analyzeKaonProduction(const ldmx::CascadeHistory& history);

  /**
   * Analyze neutron production, especially high-energy neutrons
   *
   * LDMX is particularly sensitive to high-energy neutrons that carry
   * a significant fraction of the incident photon energy. This method
   * tracks:
   * - All neutron production in the cascade
   * - Neutron energy fraction (KE / incident energy)
   * - "Leading" neutrons with energy fraction > threshold
   * - Generation at which high-energy neutrons are produced
   * - Whether high-energy neutrons escape
   *
   * @param history The cascade history to analyze
   */
  void analyzeNeutronProduction(const ldmx::CascadeHistory& history);

  /**
   * Analyze cascade stages and excitation energy
   *
   * Fills histograms characterizing the cascade stages (incident, primary,
   * cascade, pre-equilibrium, absorbed, de-excitation) and the energy balance:
   * - Stage distribution and stage-specific kinematics
   * - Excitation energy deposited in the residual nucleus
   * - Residual nucleus properties (A, Z)
   * - Energy balance: escaped energy vs deposited energy
   * - De-excitation products (evaporation neutrons/protons, gammas, alphas)
   *
   * De-excitation products are captured via comparison of G4HadFinalState
   * with cascade escapees and are marked with stage=DEEXCITATION.
   *
   * @param history The cascade history to analyze
   */
  void analyzeEnergyBalance(const ldmx::CascadeHistory& history);

  /**
   * Analyze scattering kinematics and correlations
   *
   * Computes kinematic variables for cascade particles relative to the
   * incident photon direction (assumed along z-axis):
   * - Scattering angle (theta) and azimuthal angle (phi)
   * - Transverse momentum (pT) and longitudinal momentum (pL)
   * - Rapidity and pseudorapidity
   * - Energy fractions and Feynman-x
   *
   * Also fills 2D correlation histograms:
   * - pT vs energy fraction
   * - Angle vs energy
   * - Leading vs sub-leading particle energies
   * - Multiplicity correlations
   *
   * @param history The cascade history to analyze
   */
  void analyzeKinematics(const ldmx::CascadeHistory& history);

  /**
   * Get detailed kaon type category
   * Returns: 0=K+, 1=K-, 2=K0, 3=K0bar, 4=K0S, 5=K0L, -1=not a kaon
   */
  int getKaonCategory(int pdgId) const;

  /**
   * Check if a PDG code corresponds to any kaon
   */
  bool isKaon(int pdgId) const;

  /**
   * Check if a PDG code corresponds to a neutron
   */
  bool isNeutron(int pdgId) const;

  /**
   * Find a step by its history ID
   * @return Pointer to step, or nullptr if not found
   */
  const ldmx::CascadeStep* findStepByHistoryId(
      const std::vector<ldmx::CascadeStep>& steps, int historyId) const;

  /** Collection name for cascade histories */
  std::string cascade_coll_name_;

  /** Pass name for cascade histories */
  std::string cascade_pass_name_;

  /** Threshold for "leading" neutron energy fraction (default 0.5 = 50%) */
  double leading_neutron_threshold_{0.5};

  /** Threshold for "high energy" neutron in MeV (default 1000 MeV = 1 GeV) */
  double high_energy_neutron_threshold_{1000.0};
};

}  // namespace dqm

#endif  // DQM_CASCADEHISTORYDQM_H
