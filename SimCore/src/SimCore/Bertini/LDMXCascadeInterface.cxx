/**
 * @file LDMXCascadeInterface.cxx
 * @brief Implementation of LDMXCascadeInterface
 */

#include "SimCore/Bertini/LDMXCascadeInterface.h"

#include <G4HadFinalState.hh>
#include <G4HadSecondary.hh>
#include "G4InuclParticleNames.hh"

#include "SimCore/Bertini/CascadeHistoryStore.h"

namespace simcore {
namespace bertini {

namespace {

/**
 * Special PDG-like codes for Bertini quasi-deuteron states.
 * These are virtual particles used internally by Bertini to represent
 * correlated nucleon pairs in the nucleus that absorb the photon.
 * Format: 99XXX where XXX matches the Bertini internal code.
 */
constexpr int PDG_DIPROTON = 99111;    ///< pp quasi-deuteron (Bertini code 111)
constexpr int PDG_UNBOUNDPN = 99112;   ///< pn quasi-deuteron (Bertini code 112)
constexpr int PDG_DINEUTRON = 99122;   ///< nn quasi-deuteron (Bertini code 122)

/**
 * Get PDG code from Bertini internal type code
 * Uses manual mapping since G4InuclElementaryParticle::makeDefinition is protected
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
  if (pdg == 2212) return +1;   // proton
  if (pdg == 2112) return 0;    // neutron
  if (pdg == 3122) return 0;    // Lambda
  if (pdg == 3222) return +1;   // Sigma+
  if (pdg == 3212) return 0;    // Sigma0
  if (pdg == 3112) return -1;   // Sigma-
  if (pdg == 3322) return 0;    // Xi0
  if (pdg == 3312) return -1;   // Xi-
  if (pdg == 3334) return -1;   // Omega-

  // Mesons
  if (pdg == 211) return +1;    // pi+
  if (pdg == -211) return -1;   // pi-
  if (pdg == 111) return 0;     // pi0
  if (pdg == 321) return +1;    // K+
  if (pdg == -321) return -1;   // K-
  if (pdg == 311) return 0;     // K0
  if (pdg == -311) return 0;    // K0bar
  if (pdg == 310) return 0;     // K0S
  if (pdg == 130) return 0;     // K0L

  // Leptons/photons
  if (pdg == 22) return 0;      // photon
  if (pdg == 11) return -1;     // electron
  if (pdg == -11) return +1;    // positron
  if (pdg == 13) return -1;     // muon-
  if (pdg == -13) return +1;    // muon+

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
  if (pdg == 3122 || pdg == 3222 || pdg == 3212 || pdg == 3112) return +1;  // Lambda, Sigmas
  if (pdg == 3322 || pdg == 3312 || pdg == 3334) return +1;  // Xis, Omega

  // Light nuclei
  if (pdg == 1000010020) return +2;  // deuteron
  if (pdg == 1000010030) return +3;  // triton
  if (pdg == 1000020030) return +3;  // He3
  if (pdg == 1000020040) return +4;  // alpha

  // Quasi-deuterons
  if (pdg == PDG_DIPROTON || pdg == PDG_UNBOUNDPN || pdg == PDG_DINEUTRON) return +2;

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
    if (deltaCharge == 1) return 2212;   // proton
    if (deltaCharge == 0) return 2112;   // neutron
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
  double photonEnergy = projectile.GetTotalEnergy();

  ldmx_log(debug) << "LDMXCascadeInterface::ApplyYourself called";
  ldmx_log(debug) << "  Track ID: " << incidentTrackId_;
  ldmx_log(debug) << "  Photon energy: " << photonEnergy << " MeV";
  ldmx_log(debug) << "  Energy threshold: " << energyThreshold_ << " MeV";
  ldmx_log(debug) << "  Recording history: " << (recordHistory_ ? "YES" : "NO");

  // Clear previous history
  lastHistory_.clear();

  // Check if we should record history for this event
  // Only record if enabled AND photon energy is above threshold
  bool shouldRecord = recordHistory_ && (photonEnergy >= energyThreshold_);

  if (shouldRecord) {
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

  // Call base class to perform the actual cascade
  G4HadFinalState* result =
      G4CascadeInterface::ApplyYourself(projectile, targetNucleus);

  ldmx_log(debug) << "  Base class ApplyYourself returned";

  // Capture the history if recording is enabled and above threshold
  if (shouldRecord) {
    captureHistory();

    // Store the incident photon energy in the history
    lastHistory_.setIncidentEnergy(photonEnergy);

    ldmx_log(debug) << "  Captured cascade history with "
                    << lastHistory_.getSteps().size() << " steps";

    // Now capture de-excitation products from G4HadFinalState
    // De-excitation (evaporation, gamma emission) happens AFTER the cascade
    // and is handled by G4ExcitationHandler. These products appear in the
    // final state but are NOT in the cascade history.
    captureDeexcitationProducts(result);

    ldmx_log(debug) << "  Total steps after de-excitation: "
                    << lastHistory_.getSteps().size();

    // Store in the global history store for later retrieval
    if (!lastHistory_.empty()) {
      CascadeHistoryStore::getInstance().addHistory(incidentTrackId_,
                                                    lastHistory_);
      ldmx_log(debug) << "  Added history to store for track " << incidentTrackId_;
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
    ldmx_log(debug) << "  ensureCascadeHistoryExists: creating G4CascadeHistory";
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
  G4CascadeHistory* g4History = cascader->theCascadeHistory;

  if (!g4History) {
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
      g4History->theHistory;

  if (entries.empty()) {
    return;
  }

  // Build parent ID map: for each entry, find which entry has it as a daughter
  std::vector<int> parentIds(entries.size(), -1);

  for (size_t i = 0; i < entries.size(); ++i) {
    const auto& entry = entries[i];
    for (int d = 0; d < entry.n && d < 10; ++d) {
      int daughterId = entry.dId[d];
      if (daughterId >= 0 &&
          static_cast<size_t>(daughterId) < entries.size()) {
        parentIds[daughterId] = static_cast<int>(i);
      }
    }
  }

  // First pass: Convert each entry to an LDMX CascadeStep
  // Store in local vector so we can do target inference in second pass
  std::vector<ldmx::CascadeStep> steps;
  steps.reserve(entries.size());

  for (size_t i = 0; i < entries.size(); ++i) {
    const auto& entry = entries[i];
    int parentId = parentIds[i];

    ldmx::CascadeStep step;

    const G4CascadParticle& cpart = entry.cpart;
    const G4InuclElementaryParticle& particle = cpart.getParticle();

    // Set IDs
    step.setHistoryId(cpart.getHistoryId());
    step.setParentId(parentId);

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
    std::vector<int> daughterIds;
    for (int d = 0; d < entry.n && d < 10; ++d) {
      daughterIds.push_back(entry.dId[d]);
    }
    step.setDaughterIds(daughterIds);

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
    int bulletCharge = getCharge(step.getPdgId());
    int bulletBaryon = getBaryonNumber(step.getPdgId());

    // Sum up charge and baryon number of all daughters
    int daughterCharge = 0;
    int daughterBaryon = 0;

    for (int daughterId : step.getDaughterIds()) {
      // Find the daughter step by history ID
      for (const auto& s : steps) {
        if (s.getHistoryId() == daughterId) {
          daughterCharge += getCharge(s.getPdgId());
          daughterBaryon += getBaryonNumber(s.getPdgId());
          break;
        }
      }
    }

    // Infer target from conservation: target = daughters - bullet
    int deltaCharge = daughterCharge - bulletCharge;
    int deltaBaryon = daughterBaryon - bulletBaryon;

    int targetPdg = inferTargetPdg(deltaCharge, deltaBaryon);
    step.setTargetPdgId(targetPdg);

    ldmx_log(debug) << "  Inferred target for step " << step.getHistoryId()
                    << " (PDG=" << step.getPdgId() << "): "
                    << "deltaQ=" << deltaCharge << ", deltaB=" << deltaBaryon
                    << " -> target PDG=" << targetPdg;
  }

  // Add all steps to history
  lastHistory_.reserve(steps.size());
  for (auto& step : steps) {
    lastHistory_.addStep(std::move(step));
  }

  // Calculate excitation energy and residual nucleus properties
  // Excitation energy = energy deposited in nucleus that doesn't escape
  // E_excitation = E_incident - sum(KE of escaped particles)
  double totalEscapedEnergy = 0.0;
  int escapedProtons = 0;
  int escapedNeutrons = 0;

  for (const auto& step : lastHistory_.getSteps()) {
    if (step.didEscape()) {
      totalEscapedEnergy += step.getKineticEnergy();
      int pdg = step.getPdgId();
      if (pdg == 2212) escapedProtons++;
      else if (pdg == 2112) escapedNeutrons++;
    }
  }

  // Calculate excitation energy
  // This is an approximation - true excitation energy includes binding energy
  // effects and would be more precisely calculated from residual nucleus mass
  double excitationEnergy = lastHistory_.getIncidentEnergy() - totalEscapedEnergy;
  if (excitationEnergy < 0) excitationEnergy = 0;  // Can't be negative
  lastHistory_.setExcitationEnergy(excitationEnergy);

  // Calculate residual nucleus (A, Z)
  int targetA = lastHistory_.getTargetA();
  int targetZ = lastHistory_.getTargetZ();
  int residualA = targetA - escapedProtons - escapedNeutrons;
  int residualZ = targetZ - escapedProtons;
  if (residualA < 0) residualA = 0;
  if (residualZ < 0) residualZ = 0;
  lastHistory_.setResidualNucleus(residualA, residualZ);
}

void LDMXCascadeInterface::captureDeexcitationProducts(
    G4HadFinalState* finalState) {
  if (!finalState) {
    return;
  }

  // Get the number of secondaries in the final state
  int nSecondaries = finalState->GetNumberOfSecondaries();
  if (nSecondaries == 0) {
    return;
  }

  ldmx_log(debug) << "  captureDeexcitationProducts: " << nSecondaries
                  << " secondaries in final state";

  // Build a set of cascade escaped particles for matching
  // Key: (PDG, approximate energy) to identify particles
  // Note: We use approximate energy matching because the cascade and
  // final state energies may differ slightly due to nuclear recoil
  struct EscapedParticle {
    int pdg;
    double energy;  // MeV
    bool matched;
  };
  std::vector<EscapedParticle> cascadeEscaped;

  for (const auto& step : lastHistory_.getSteps()) {
    if (step.didEscape()) {
      cascadeEscaped.push_back({step.getPdgId(), step.getEnergy(), false});
    }
  }

  ldmx_log(debug) << "  Cascade escaped particles: " << cascadeEscaped.size();

  // Get the next available history ID for de-excitation products
  int nextHistoryId = 0;
  for (const auto& step : lastHistory_.getSteps()) {
    if (step.getHistoryId() >= nextHistoryId) {
      nextHistoryId = step.getHistoryId() + 1;
    }
  }

  // Track de-excitation product counts by type
  int nDeexcitationGammas = 0;
  int nDeexcitationNeutrons = 0;
  int nDeexcitationProtons = 0;
  int nDeexcitationAlphas = 0;
  int nDeexcitationOther = 0;

  // Loop over final state secondaries
  for (int i = 0; i < nSecondaries; ++i) {
    G4HadSecondary* secondary = finalState->GetSecondary(i);
    if (!secondary) continue;

    const G4DynamicParticle* dynParticle = secondary->GetParticle();
    if (!dynParticle) continue;

    int pdg = dynParticle->GetPDGcode();
    double energy = dynParticle->GetTotalEnergy();  // MeV

    // Try to match with cascade escaped particles
    bool isDeexcitation = true;
    const double energyTolerance = 1.0;  // 1 MeV tolerance

    for (auto& escaped : cascadeEscaped) {
      if (!escaped.matched && escaped.pdg == pdg &&
          std::abs(escaped.energy - energy) < energyTolerance) {
        // Found a match - this is a cascade product, not de-excitation
        escaped.matched = true;
        isDeexcitation = false;
        break;
      }
    }

    if (isDeexcitation) {
      // This is a de-excitation product - add to history
      ldmx::CascadeStep step;

      step.setHistoryId(nextHistoryId++);
      step.setParentId(-2);  // Special marker for de-excitation origin
      step.setPdgId(pdg);

      // Get momentum (Geant4 uses MeV)
      G4ThreeVector mom = dynParticle->GetMomentum();
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
        nDeexcitationGammas++;
      } else if (pdg == 2112) {
        nDeexcitationNeutrons++;
      } else if (pdg == 2212) {
        nDeexcitationProtons++;
      } else if (pdg == 1000020040) {
        nDeexcitationAlphas++;
      } else {
        nDeexcitationOther++;
      }
    }
  }

  ldmx_log(debug) << "  De-excitation products: "
                  << "gammas=" << nDeexcitationGammas
                  << ", neutrons=" << nDeexcitationNeutrons
                  << ", protons=" << nDeexcitationProtons
                  << ", alphas=" << nDeexcitationAlphas
                  << ", other=" << nDeexcitationOther;
}

}  // namespace bertini
}  // namespace simcore
