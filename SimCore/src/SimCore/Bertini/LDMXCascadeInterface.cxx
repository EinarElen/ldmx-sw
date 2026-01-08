/**
 * @file LDMXCascadeInterface.cxx
 * @brief Implementation of LDMXCascadeInterface
 */

#include "SimCore/Bertini/LDMXCascadeInterface.h"

#include <cmath>

#include <G4HadFinalState.hh>
#include <G4HadSecondary.hh>

#include "G4Event.hh"
#include "G4EventManager.hh"
#include "G4InuclParticleNames.hh"
#include "SimCore/Bertini/CascadeHistoryStore.h"
#include "SimCore/Bertini/KaonBiasedElementaryCollider.h"
#include "SimCore/Bertini/LDMXElementaryParticleCollider.h"
#include "SimCore/Bertini/LDMXIntraNucleiCascader.h"
#include "SimCore/G4User/UserEventInformation.h"

namespace simcore {
namespace bertini {

namespace {

/**
 * Special PDG-like codes for Bertini quasi-deuteron states.
 * These are virtual particles used internally by Bertini to represent
 * correlated nucleon pairs in the nucleus that absorb the photon.
 * Format: 99XXX where XXX matches the Bertini internal code.
 */
constexpr int PDG_DIPROTON = 99111;   ///< pp quasi-deuteron (Bertini code 111)
constexpr int PDG_UNBOUNDPN = 99112;  ///< pn quasi-deuteron (Bertini code 112)
constexpr int PDG_DINEUTRON = 99122;  ///< nn quasi-deuteron (Bertini code 122)

/**
 * Get PDG code from Bertini internal type code
 * Uses manual mapping since G4InuclElementaryParticle::makeDefinition is
 * protected
 */
int getPdgCode(int inuclType) {
  using namespace G4InuclParticleNames;
  switch (inuclType) {
    case proton:
      return 2212;
    case neutron:
      return 2112;
    case pionPlus:
      return 211;
    case pionMinus:
      return -211;
    case pionZero:
      return 111;
    case photon:
      return 22;
    case kaonPlus:
      return 321;
    case kaonMinus:
      return -321;
    case kaonZero:
      return 311;
    case kaonZeroBar:
      return -311;
    case lambda:
      return 3122;
    case sigmaPlus:
      return 3222;
    case sigmaZero:
      return 3212;
    case sigmaMinus:
      return 3112;
    case xiZero:
      return 3322;
    case xiMinus:
      return 3312;
    case omegaMinus:
      return 3334;
    case electron:
      return 11;
    case positron:
      return -11;
    case muonMinus:
      return 13;
    case muonPlus:
      return -13;
    case deuteron:
      return 1000010020;
    case triton:
      return 1000010030;
    case He3:
      return 1000020030;
    case alpha:
      return 1000020040;
    // Quasi-deuteron states (virtual nucleon pairs for photon absorption)
    case diproton:
      return PDG_DIPROTON;
    case unboundPN:
      return PDG_UNBOUNDPN;
    case dineutron:
      return PDG_DINEUTRON;
    default:
      return 0;
  }
}

/**
 * Check if a PDG code represents a quasi-deuteron
 */
bool isQuasiDeuteron(int pdg) {
  return pdg == PDG_DIPROTON || pdg == PDG_UNBOUNDPN || pdg == PDG_DINEUTRON;
}

/**
 * Get the electric charge for a PDG code
 * Used for inferring target nucleon from conservation laws
 */
int getCharge(int pdg) {
  // Baryons
  if (pdg == 2212) return +1;  // proton
  if (pdg == 2112) return 0;   // neutron
  if (pdg == 3122) return 0;   // Lambda
  if (pdg == 3222) return +1;  // Sigma+
  if (pdg == 3212) return 0;   // Sigma0
  if (pdg == 3112) return -1;  // Sigma-
  if (pdg == 3322) return 0;   // Xi0
  if (pdg == 3312) return -1;  // Xi-
  if (pdg == 3334) return -1;  // Omega-

  // Mesons
  if (pdg == 211) return +1;   // pi+
  if (pdg == -211) return -1;  // pi-
  if (pdg == 111) return 0;    // pi0
  if (pdg == 321) return +1;   // K+
  if (pdg == -321) return -1;  // K-
  if (pdg == 311) return 0;    // K0
  if (pdg == -311) return 0;   // K0bar
  if (pdg == 310) return 0;    // K0S
  if (pdg == 130) return 0;    // K0L

  // Leptons/photons
  if (pdg == 22) return 0;    // photon
  if (pdg == 11) return -1;   // electron
  if (pdg == -11) return +1;  // positron
  if (pdg == 13) return -1;   // muon-
  if (pdg == -13) return +1;  // muon+

  // Light nuclei
  if (pdg == 1000010020) return +1;  // deuteron
  if (pdg == 1000010030) return +1;  // triton
  if (pdg == 1000020030) return +2;  // He3
  if (pdg == 1000020040) return +2;  // alpha

  // Quasi-deuterons
  if (pdg == PDG_DIPROTON) return +2;   // pp
  if (pdg == PDG_UNBOUNDPN) return +1;  // pn
  if (pdg == PDG_DINEUTRON) return 0;   // nn

  return 0;  // unknown
}

/**
 * Get baryon number for a PDG code
 * Used for inferring target nucleon from conservation laws
 */
int getBaryonNumber(int pdg) {
  // Baryons
  if (pdg == 2212 || pdg == 2112) return +1;  // p, n
  if (pdg == 3122 || pdg == 3222 || pdg == 3212 || pdg == 3112)
    return +1;                                               // Lambda, Sigmas
  if (pdg == 3322 || pdg == 3312 || pdg == 3334) return +1;  // Xis, Omega

  // Light nuclei
  if (pdg == 1000010020) return +2;  // deuteron
  if (pdg == 1000010030) return +3;  // triton
  if (pdg == 1000020030) return +3;  // He3
  if (pdg == 1000020040) return +4;  // alpha

  // Quasi-deuterons
  if (pdg == PDG_DIPROTON || pdg == PDG_UNBOUNDPN || pdg == PDG_DINEUTRON)
    return +2;

  return 0;  // mesons, leptons, photons
}

/**
 * Infer target nucleon PDG from charge and baryon number conservation
 *
 * For a reaction: bullet + target -> products
 * deltaCharge = Q_products - Q_bullet
 * deltaBaryon = B_products - B_bullet
 *
 * Single nucleon: deltaBaryon = 1
 *   - deltaCharge = 1 -> proton
 *   - deltaCharge = 0 -> neutron
 *
 * Quasi-deuteron: deltaBaryon = 2
 *   - deltaCharge = 2 -> pp (diproton)
 *   - deltaCharge = 1 -> pn (unbound pn)
 *   - deltaCharge = 0 -> nn (dineutron)
 */
int inferTargetPdg(int deltaCharge, int deltaBaryon) {
  if (deltaBaryon == 1) {
    // Single nucleon target
    if (deltaCharge == 1) return 2212;  // proton
    if (deltaCharge == 0) return 2112;  // neutron
  } else if (deltaBaryon == 2) {
    // Quasi-deuteron target
    if (deltaCharge == 2) return PDG_DIPROTON;   // pp
    if (deltaCharge == 1) return PDG_UNBOUNDPN;  // pn
    if (deltaCharge == 0) return PDG_DINEUTRON;  // nn
  }
  return 0;  // unknown
}

}  // anonymous namespace

LDMXCascadeInterface::LDMXCascadeInterface(const G4String& name)
    : G4CascadeInterface(name), recordHistory_{true}, incidentTrackId_{-1} {}

LDMXCascadeInterface::~LDMXCascadeInterface() = default;

G4HadFinalState* LDMXCascadeInterface::ApplyYourself(
    const G4HadProjectile& projectile, G4Nucleus& targetNucleus) {
  // Get incident photon energy (Geant4 uses MeV internally)
  double photon_energy = projectile.GetTotalEnergy();

  ldmx_log(debug) << "LDMXCascadeInterface::ApplyYourself called";
  ldmx_log(debug) << "  Track ID: " << incidentTrackId_;
  ldmx_log(debug) << "  Photon energy: " << photon_energy << " MeV";
  ldmx_log(debug) << "  Energy threshold: " << energyThreshold_ << " MeV";
  ldmx_log(debug) << "  Recording history: " << (recordHistory_ ? "YES" : "NO");

  // Clear previous history
  lastHistory_.clear();

  // Check if we should record history for this event
  // Only record if enabled AND photon energy is above threshold
  bool should_record = recordHistory_ && (photon_energy >= energyThreshold_);

  if (should_record) {
    ldmx_log(debug) << "  Will record history (above threshold)";
    // Ensure cascade history object exists before running the cascade
    // Normally G4 only creates this if G4CASCADE_SHOW_HISTORY is set,
    // but we force-create it here via our hack access
    ensureCascadeHistoryExists();
  } else if (recordHistory_) {
    ldmx_log(debug) << "  Skipping history (below threshold)";
  }

  // Note: Track ID must be set externally via setIncidentTrackId() before
  // calling this method. G4HadProjectile doesn't provide track access.
  // The PhotoNuclearModel or process should set this before invoking the model.

  // Install wrapper collider if requested (deferred from enableWrapperCollider)
  // Must create the G4InuclCollider first if it doesn't exist
  if ((useWrapperCollider_ || useKaonBiasing_) && !wrapperColliderInstalled_) {
    // Force collider creation by calling base class with dummy data
    // G4CascadeInterface creates collider lazily in ApplyYourself
    if (!collider) {
      ldmx_log(info) << "Creating G4InuclCollider for wrapper installation";
      collider = new G4InuclCollider;
    }

    if (useKaonBiasing_) {
      // Install kaon-biased collider
      // Note: The collider uses internal CM energy range (defaults: 1.5-10 GeV)
      // for kinematic reasons. The photon energy thresholds are checked
      // per-cascade in ApplyYourself() to enable/disable biasing.
      ldmx_log(info) << "Installing kaon-biased collider with factor "
                     << kaonBiasFactor_;
      auto* kaonCollider = new KaonBiasedElementaryCollider();
      kaonCollider->setBiasFactor(kaonBiasFactor_);
      kaonCollider->setMaxAttempts(kaonBiasMaxAttempts_);
      // Don't enable yet - will be enabled per-cascade based on photon energy
      kaonCollider->setBiasEnabled(false);
      setElementaryParticleCollider(kaonCollider);
      kaonBiasColliderInstalled_ = true;
    } else {
      // Install standard wrapper collider
      ldmx_log(info) << "Installing wrapper collider";
      auto* wrapperCollider = new LDMXElementaryParticleCollider();
      setElementaryParticleCollider(wrapperCollider);
    }
    wrapperColliderInstalled_ = true;
  }

  // Clear collision info before cascade (if wrapper collider is installed)
  LDMXElementaryParticleCollider* wrapperCollider = getWrapperCollider();
  if (wrapperCollider) {
    wrapperCollider->clearCollisionInfo();
  }

  // Clear cumulative bias weight and conditionally enable/disable kaon biasing
  // based on photon energy
  KaonBiasedElementaryCollider* kaonCollider = getKaonBiasedCollider();
  if (kaonCollider) {
    kaonCollider->clearCumulativeBiasWeight();

    // Enable/disable biasing based on photon energy range
    bool inBiasRange = (photonEnergy >= kaonBiasMinPhotonEnergy_ &&
                        photonEnergy <= kaonBiasMaxPhotonEnergy_);
    kaonCollider->setBiasEnabled(inBiasRange);

    if (inBiasRange) {
      ldmx_log(debug) << "  Kaon biasing ENABLED for this cascade (E="
                      << photonEnergy << " MeV)";
    } else {
      ldmx_log(debug) << "  Kaon biasing DISABLED for this cascade (E="
                      << photonEnergy << " MeV outside range ["
                      << kaonBiasMinPhotonEnergy_ << ", "
                      << kaonBiasMaxPhotonEnergy_ << "])";
    }
  }

  // Call base class to perform the actual cascade
  G4HadFinalState* result =
      G4CascadeInterface::ApplyYourself(projectile, targetNucleus);

  ldmx_log(debug) << "  Base class ApplyYourself returned";

  // Capture the history if recording is enabled and above threshold
  if (should_record) {
    captureHistory();

    // Store the incident photon energy in the history
    lastHistory_.setIncidentEnergy(photon_energy);

    ldmx_log(debug) << "  Captured cascade history with "
                    << lastHistory_.getSteps().size() << " steps";

    // Now capture de-excitation products from G4HadFinalState
    // De-excitation (evaporation, gamma emission) happens AFTER the cascade
    // and is handled by G4ExcitationHandler. These products appear in the
    // final state but are NOT in the cascade history.
    captureDeexcitationProducts(result);

    ldmx_log(debug) << "  Total steps after de-excitation: "
                    << lastHistory_.getSteps().size();

    // Enrich steps with collision info if wrapper collider is active
    enrichWithCollisionInfo();

    // Propagate bias weight to event if kaon biasing is enabled
    propagateBiasWeightToEvent();

    // Store in the global history store for later retrieval
    if (!lastHistory_.empty()) {
      CascadeHistoryStore::getInstance().addHistory(incidentTrackId_,
                                                    lastHistory_);
      ldmx_log(debug) << "  Added history to store for track "
                      << incidentTrackId_;
    } else {
      ldmx_log(debug) << "  History empty, not storing";
    }
  }

  return result;
}

void LDMXCascadeInterface::ensureCascadeHistoryExists() {
  // Force-create the cascade history object if it doesn't exist
  // Geant4 normally only creates this if G4CASCADE_SHOW_HISTORY envvar is set

  if (!collider) {
    ldmx_log(debug) << "  ensureCascadeHistoryExists: no collider yet";
    return;
  }

  G4IntraNucleiCascader* cascader = collider->theIntraNucleiCascader;
  if (!cascader) {
    ldmx_log(debug) << "  ensureCascadeHistoryExists: no cascader yet";
    return;
  }

  if (!cascader->theCascadeHistory) {
    ldmx_log(debug)
        << "  ensureCascadeHistoryExists: creating G4CascadeHistory";
    cascader->theCascadeHistory = new G4CascadeHistory;
  } else {
    ldmx_log(debug) << "  ensureCascadeHistoryExists: history already exists";
  }
}

void LDMXCascadeInterface::captureHistory() {
  // Navigate the internal structure to reach the cascade history:
  //   this->collider->theIntraNucleiCascader->theCascadeHistory
  //
  // With the hack header, all these private members become protected
  // and accessible from this derived class member function.

  if (!collider) {
    return;  // No collider means no cascade happened
  }

  // Access the intra-nuclei cascader through the collider
  // G4InuclCollider::theIntraNucleiCascader is private -> protected via hack
  G4IntraNucleiCascader* cascader = collider->theIntraNucleiCascader;

  if (!cascader) {
    return;
  }

  // Access the cascade history
  // G4IntraNucleiCascader::theCascadeHistory is private -> protected via hack
  G4CascadeHistory* g4_history = cascader->theCascadeHistory;

  if (!g4_history) {
    return;
  }

  // Set metadata on our history
  lastHistory_.setIncidentTrackId(incidentTrackId_);

  // Get target nucleus info from the cascader
  // G4IntraNucleiCascader::tnuclei is private -> protected via hack
  if (cascader->tnuclei) {
    lastHistory_.setTargetNucleus(cascader->tnuclei->getA(),
                                  cascader->tnuclei->getZ());
  }

  // Access the history entries vector
  // G4CascadeHistory::theHistory is private -> protected via hack
  const std::vector<G4CascadeHistory::HistoryEntry>& entries =
      g4_history->theHistory;

  if (entries.empty()) {
    return;
  }

  // Build parent ID map: for each entry, find which entry has it as a daughter
  std::vector<int> parent_ids(entries.size(), -1);

  for (size_t i = 0; i < entries.size(); ++i) {
    const auto& entry = entries[i];
    for (int d = 0; d < entry.n && d < 10; ++d) {
      int daughter_id = entry.dId[d];
      if (daughter_id >= 0 && static_cast<size_t>(daughter_id) < entries.size()) {
        parent_ids[daughter_id] = static_cast<int>(i);
      }
    }
  }

  // First pass: Convert each entry to an LDMX CascadeStep
  // Store in local vector so we can do target inference in second pass
  std::vector<ldmx::CascadeStep> steps;
  steps.reserve(entries.size());

  for (size_t i = 0; i < entries.size(); ++i) {
    const auto& entry = entries[i];
    int parent_id = parent_ids[i];

    ldmx::CascadeStep step;

    const G4CascadParticle& cpart = entry.cpart;
    const G4InuclElementaryParticle& particle = cpart.getParticle();

    // Set IDs
    step.setHistoryId(cpart.getHistoryId());
    step.setParentId(parent_id);

    // Convert Bertini type code to PDG
    step.setPdgId(getPdgCode(particle.type()));

    // Get 4-momentum [Geant4 uses GeV internally, we store in MeV]
    G4LorentzVector mom = cpart.getMomentum();
    step.setMomentum(mom.px() * 1000.0,  // GeV -> MeV
                     mom.py() * 1000.0, mom.pz() * 1000.0, mom.e() * 1000.0);

    // Get position in nucleus [fm - Geant4 Bertini uses fm internally]
    const G4ThreeVector& pos = cpart.getPosition();
    step.setPosition(pos.x(), pos.y(), pos.z());

    // Cascade tracking info
    step.setGeneration(cpart.getGeneration());
    step.setZone(cpart.getCurrentZone());
    step.setPath(cpart.getCurrentPath());

    // Collect daughter IDs
    std::vector<int> daughter_ids;
    for (int d = 0; d < entry.n && d < 10; ++d) {
      daughter_ids.push_back(entry.dId[d]);
    }
    step.setDaughterIds(daughter_ids);

    // Determine if particle interacted (has daughters)
    bool interacted = (entry.n > 0);
    step.setInteracted(interacted);

    // A particle that didn't interact and reached generation > 0 likely escaped
    // This is a simplification - true escape status would need more tracking
    bool escaped = !interacted && cpart.getGeneration() >= 0;
    step.setEscaped(escaped);

    // Target nucleon will be inferred in second pass
    step.setTargetPdgId(0);

    // Classify the cascade stage based on available information
    // Stage classification helps distinguish different phases of the cascade
    ldmx::CascadeStage stage = ldmx::CascadeStage::UNKNOWN;
    int generation = cpart.getGeneration();

    if (generation == 0) {
      // Generation 0 is the incident particle
      stage = ldmx::CascadeStage::INCIDENT;
    } else if (generation == 1) {
      // Generation 1 are direct products of initial photon-nucleon interaction
      stage = ldmx::CascadeStage::PRIMARY;
    } else if (!interacted && !escaped) {
      // No interaction and no escape means absorbed by nucleus
      stage = ldmx::CascadeStage::ABSORBED;
    } else if (escaped && generation <= 2) {
      // Fast particles escaping early in cascade = pre-equilibrium emission
      stage = ldmx::CascadeStage::PREEQUILIBRIUM;
    } else {
      // Standard cascade products from intranuclear scattering
      stage = ldmx::CascadeStage::CASCADE;
    }
    step.setStage(stage);

    steps.push_back(std::move(step));
  }

  // Second pass: Infer target nucleon from charge/baryon conservation
  // For each step that interacted: target = (sum of daughters) - (bullet)
  for (auto& step : steps) {
    if (!step.didInteract()) {
      continue;  // No interaction, no target to infer
    }

    // Get bullet particle's charge and baryon number
    int bullet_charge = getCharge(step.getPdgId());
    int bullet_baryon = getBaryonNumber(step.getPdgId());

    // Sum up charge and baryon number of all daughters
    int daughter_charge = 0;
    int daughter_baryon = 0;

    for (int daughter_id : step.getDaughterIds()) {
      // Find the daughter step by history ID
      for (const auto& s : steps) {
        if (s.getHistoryId() == daughter_id) {
          daughter_charge += getCharge(s.getPdgId());
          daughter_baryon += getBaryonNumber(s.getPdgId());
          break;
        }
      }
    }

    // Infer target from conservation: target = daughters - bullet
    int delta_charge = daughter_charge - bullet_charge;
    int delta_baryon = daughter_baryon - bullet_baryon;

    int target_pdg = inferTargetPdg(delta_charge, delta_baryon);
    step.setTargetPdgId(target_pdg);

    ldmx_log(debug) << "  Inferred target for step " << step.getHistoryId()
                    << " (PDG=" << step.getPdgId()
                    << "): " << "deltaQ=" << delta_charge
                    << ", deltaB=" << delta_baryon
                    << " -> target PDG=" << target_pdg;
  }

  // Add all steps to history
  lastHistory_.reserve(steps.size());
  for (auto& step : steps) {
    lastHistory_.addStep(std::move(step));
  }

  // Calculate excitation energy and residual nucleus properties
  // Excitation energy = energy deposited in nucleus that doesn't escape
  // E_excitation = E_incident - sum(KE of escaped particles)
  double total_escaped_energy = 0.0;
  int escaped_protons = 0;
  int escaped_neutrons = 0;

  for (const auto& step : lastHistory_.getSteps()) {
    if (step.didEscape()) {
      total_escaped_energy += step.getKineticEnergy();
      int pdg = step.getPdgId();
      if (pdg == 2212)
        escaped_protons++;
      else if (pdg == 2112)
        escaped_neutrons++;
    }
  }

  // Calculate excitation energy
  // This is an approximation - true excitation energy includes binding energy
  // effects and would be more precisely calculated from residual nucleus mass
  double excitation_energy =
      lastHistory_.getIncidentEnergy() - total_escaped_energy;
  if (excitation_energy < 0) excitation_energy = 0;  // Can't be negative
  lastHistory_.setExcitationEnergy(excitation_energy);

  // Calculate residual nucleus (A, Z)
  int target_a = lastHistory_.getTargetA();
  int target_z = lastHistory_.getTargetZ();
  int residual_a = target_a - escaped_protons - escaped_neutrons;
  int residual_z = target_z - escaped_protons;
  if (residual_a < 0) residual_a = 0;
  if (residual_z < 0) residual_z = 0;
  lastHistory_.setResidualNucleus(residual_a, residual_z);
}

void LDMXCascadeInterface::captureDeexcitationProducts(
    G4HadFinalState* finalState) {
  if (!finalState) {
    return;
  }

  // Get the number of secondaries in the final state
  int n_secondaries = finalState->GetNumberOfSecondaries();
  if (n_secondaries == 0) {
    return;
  }

  ldmx_log(debug) << "  captureDeexcitationProducts: " << n_secondaries
                  << " secondaries in final state";

  // Build a set of cascade escaped particles for matching
  // Key: (PDG, approximate energy) to identify particles
  // Note: We use approximate energy matching because the cascade and
  // final state energies may differ slightly due to nuclear recoil
  struct EscapedParticle {
    int pdg_;
    double energy_;  // MeV
    bool matched_;
  };
  std::vector<EscapedParticle> cascade_escaped;

  for (const auto& step : lastHistory_.getSteps()) {
    if (step.didEscape()) {
      cascade_escaped.push_back({step.getPdgId(), step.getEnergy(), false});
    }
  }

  ldmx_log(debug) << "  Cascade escaped particles: " << cascade_escaped.size();

  // Get the next available history ID for de-excitation products
  int next_history_id = 0;
  for (const auto& step : lastHistory_.getSteps()) {
    if (step.getHistoryId() >= next_history_id) {
      next_history_id = step.getHistoryId() + 1;
    }
  }

  // Track de-excitation product counts by type
  int n_deexcitation_gammas = 0;
  int n_deexcitation_neutrons = 0;
  int n_deexcitation_protons = 0;
  int n_deexcitation_alphas = 0;
  int n_deexcitation_other = 0;

  // Loop over final state secondaries
  for (int i = 0; i < n_secondaries; ++i) {
    G4HadSecondary* secondary = finalState->GetSecondary(i);
    if (!secondary) continue;

    const G4DynamicParticle* dyn_particle = secondary->GetParticle();
    if (!dyn_particle) continue;

    int pdg = dyn_particle->GetPDGcode();
    double energy = dyn_particle->GetTotalEnergy();  // MeV

    // Try to match with cascade escaped particles
    bool is_deexcitation = true;
    const double energy_tolerance = 1.0;  // 1 MeV tolerance

    for (auto& escaped : cascade_escaped) {
      if (!escaped.matched_ && escaped.pdg_ == pdg &&
          std::abs(escaped.energy_ - energy) < energy_tolerance) {
        // Found a match - this is a cascade product, not de-excitation
        escaped.matched_ = true;
        is_deexcitation = false;
        break;
      }
    }

    if (is_deexcitation) {
      // This is a de-excitation product - add to history
      ldmx::CascadeStep step;

      step.setHistoryId(next_history_id++);
      step.setParentId(-2);  // Special marker for de-excitation origin
      step.setPdgId(pdg);

      // Get momentum (Geant4 uses MeV)
      G4ThreeVector mom = dyn_particle->GetMomentum();
      step.setMomentum(mom.x(), mom.y(), mom.z(), energy);

      // De-excitation products don't have a position in the cascade history
      // Set to origin (they come from the residual nucleus)
      step.setPosition(0, 0, 0);

      // De-excitation happens after cascade, so use special values
      step.setGeneration(-1);  // Special marker for de-excitation
      step.setZone(0);
      step.setPath(0);

      // All de-excitation products escape (they're the final state)
      step.setInteracted(false);
      step.setEscaped(true);
      step.setStage(ldmx::CascadeStage::DEEXCITATION);

      lastHistory_.addStep(std::move(step));

      // Count by type
      if (pdg == 22) {
        n_deexcitation_gammas++;
      } else if (pdg == 2112) {
        n_deexcitation_neutrons++;
      } else if (pdg == 2212) {
        n_deexcitation_protons++;
      } else if (pdg == 1000020040) {
        n_deexcitation_alphas++;
      } else {
        n_deexcitation_other++;
      }
    }
  }

  ldmx_log(debug) << "  De-excitation products: " << "gammas="
                  << n_deexcitation_gammas
                  << ", neutrons=" << n_deexcitation_neutrons
                  << ", protons=" << n_deexcitation_protons
                  << ", alphas=" << n_deexcitation_alphas
                  << ", other=" << n_deexcitation_other;
}

void LDMXCascadeInterface::setElementaryParticleCollider(
    G4ElementaryParticleCollider* newCollider) {
  // Access the internal cascader via hack
  // collider is G4InuclCollider* (from G4CascadeInterface)
  // collider->theIntraNucleiCascader is G4IntraNucleiCascader*
  if (!collider) {
    ldmx_log(warn) << "Cannot set collider: G4InuclCollider not yet created";
    return;
  }

  // Access the cascader through the hack
  G4IntraNucleiCascader* cascader = collider->theIntraNucleiCascader;
  if (!cascader) {
    ldmx_log(warn) << "Cannot set collider: G4IntraNucleiCascader not yet created";
    return;
  }

  // Try to cast to our LDMX cascader which has the setter
  auto* ldmxCascader = dynamic_cast<LDMXIntraNucleiCascader*>(cascader);
  if (ldmxCascader) {
    ldmxCascader->setElementaryParticleCollider(newCollider);
    ldmx_log(info) << "Elementary particle collider replaced via LDMXIntraNucleiCascader";
  } else {
    // If it's the base G4IntraNucleiCascader, we can still replace via hack
    // Delete the old collider and set the new one
    if (cascader->theElementaryParticleCollider) {
      delete cascader->theElementaryParticleCollider;
    }
    cascader->theElementaryParticleCollider = newCollider;
    ldmx_log(info) << "Elementary particle collider replaced via hack";
  }
}

void LDMXCascadeInterface::enableWrapperCollider() {
  // Just set the flag - actual installation is deferred to ApplyYourself()
  // because G4InuclCollider is created lazily on first use
  useWrapperCollider_ = true;
  ldmx_log(info) << "Wrapper collider enabled (will install on first cascade)";
}

LDMXIntraNucleiCascader* LDMXCascadeInterface::getLDMXCascader() {
  if (!collider) {
    return nullptr;
  }

  G4IntraNucleiCascader* cascader = collider->theIntraNucleiCascader;
  return dynamic_cast<LDMXIntraNucleiCascader*>(cascader);
}

LDMXElementaryParticleCollider* LDMXCascadeInterface::getWrapperCollider() {
  if (!collider) {
    return nullptr;
  }

  G4IntraNucleiCascader* cascader = collider->theIntraNucleiCascader;
  if (!cascader) {
    return nullptr;
  }

  // The elementary particle collider is accessible via hack
  return dynamic_cast<LDMXElementaryParticleCollider*>(
      cascader->theElementaryParticleCollider);
}

void LDMXCascadeInterface::enrichWithCollisionInfo() {
  // Get wrapper collider with collision info
  LDMXElementaryParticleCollider* wrapperCollider = getWrapperCollider();
  if (!wrapperCollider) {
    return;  // No wrapper collider, nothing to do
  }

  const auto& collisionInfos = wrapperCollider->getCollisionInfo();
  if (collisionInfos.empty()) {
    return;  // No collision info recorded
  }

  ldmx_log(debug) << "Enriching " << lastHistory_.getSteps().size()
                  << " steps with " << collisionInfos.size() << " collision infos";

  // Match collision info to steps by bullet PDG and momentum
  // Cascade history momenta are in MeV, collision info is in GeV
  const double momTolerance = 0.001;  // 1 MeV tolerance (in GeV)

  // Track which collision infos have been matched
  std::vector<bool> matched(collisionInfos.size(), false);

  // Get mutable access to steps
  auto& steps = lastHistory_.getSteps();

  for (auto& step : steps) {
    // Only enrich steps that interacted (had a collision)
    if (!step.didInteract()) {
      continue;
    }

    // Convert step momentum to GeV for comparison
    double stepPx = step.getPx() / 1000.0;  // MeV -> GeV
    double stepPy = step.getPy() / 1000.0;
    double stepPz = step.getPz() / 1000.0;
    double stepE = step.getEnergy() / 1000.0;
    int stepPdg = step.getPdgId();

    // Find best matching collision info
    int bestMatch = -1;
    double bestDist = 1e9;

    for (size_t i = 0; i < collisionInfos.size(); ++i) {
      if (matched[i]) continue;  // Already used

      const auto& info = collisionInfos[i];

      // Check PDG match
      if (info.bulletPdg != stepPdg) continue;

      // Calculate momentum distance
      double dx = info.bulletPx - stepPx;
      double dy = info.bulletPy - stepPy;
      double dz = info.bulletPz - stepPz;
      double de = info.bulletE - stepE;
      double dist = std::sqrt(dx * dx + dy * dy + dz * dz + de * de);

      if (dist < bestDist && dist < momTolerance) {
        bestDist = dist;
        bestMatch = static_cast<int>(i);
      }
    }

    // If we found a match, enrich the step
    if (bestMatch >= 0) {
      const auto& info = collisionInfos[bestMatch];
      step.setSqrtS(info.sqrtS);
      step.setTargetPdgDirect(info.targetPdg);
      step.setNucleusAtCollision(info.nucleusA, info.nucleusZ);
      step.setKinEnergyLab(info.kinEnergyLab);
      step.setCollisionSucceeded(info.succeeded);
      step.setBiasWeight(info.biasWeight);  // Set bias weight from collision
      matched[bestMatch] = true;

      ldmx_log(trace) << "  Matched step " << step.getHistoryId()
                      << " (PDG=" << stepPdg << ") to collision with sqrtS="
                      << info.sqrtS << " GeV, target=" << info.targetPdg
                      << ", biasWeight=" << info.biasWeight;
    }
  }

  // Count matches
  int numMatched = 0;
  for (bool m : matched) {
    if (m) numMatched++;
  }
  ldmx_log(debug) << "  Matched " << numMatched << " of " << collisionInfos.size()
                  << " collision infos to steps";
}

KaonBiasedElementaryCollider* LDMXCascadeInterface::getKaonBiasedCollider() {
  if (!collider) {
    return nullptr;
  }

  G4IntraNucleiCascader* cascader = collider->theIntraNucleiCascader;
  if (!cascader) {
    return nullptr;
  }

  // The elementary particle collider is accessible via hack
  return dynamic_cast<KaonBiasedElementaryCollider*>(
      cascader->theElementaryParticleCollider);
}

void LDMXCascadeInterface::enableKaonBiasing(double biasFactor) {
  useKaonBiasing_ = true;
  kaonBiasFactor_ = biasFactor;
  ldmx_log(info) << "Kaon biasing enabled with factor " << biasFactor
                 << " (will install on first cascade)";
}

void LDMXCascadeInterface::propagateBiasWeightToEvent() {
  // Get the kaon-biased collider to retrieve cumulative bias weight
  KaonBiasedElementaryCollider* kaonCollider = getKaonBiasedCollider();
  if (!kaonCollider) {
    return;  // No kaon biasing active
  }

  double biasWeight = kaonCollider->getCumulativeBiasWeight();
  if (std::abs(biasWeight - 1.0) < 1e-9) {
    return;  // No bias was applied (weight is 1.0)
  }

  // Get UserEventInformation and multiply in the bias weight
  G4Event* event = G4EventManager::GetEventManager()->GetNonconstCurrentEvent();
  if (!event) {
    ldmx_log(warn) << "Cannot propagate bias weight: no current event";
    return;
  }

  auto* eventInfo =
      static_cast<UserEventInformation*>(event->GetUserInformation());
  if (!eventInfo) {
    ldmx_log(warn) << "Cannot propagate bias weight: no UserEventInformation";
    return;
  }

  // Multiply bias weight into event weight
  eventInfo->incWeight(biasWeight);
  ldmx_log(debug) << "Propagated kaon bias weight " << biasWeight
                  << " to event (new weight: " << eventInfo->getWeight() << ")";
}

}  // namespace bertini
}  // namespace simcore
