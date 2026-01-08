/**
 * @file LDMXCascadeInterface.h
 * @brief Custom Bertini cascade interface that captures cascade history
 *
 * This class provides access to the internal Bertini cascade history
 * for recording photonuclear interaction details in LDMX event files.
 */

#ifndef SIMCORE_BERTINI_LDMXCASCADEINTERFACE_H
#define SIMCORE_BERTINI_LDMXCASCADEINTERFACE_H

// IMPORTANT: Include the hack header FIRST to expose private members
#include "SimCore/Bertini/G4BertiniHack.h"

#include "Framework/Logger.h"
#include "SimCore/Bertini/CascadeHistory.h"

class G4HadProjectile;
class G4Nucleus;
class G4HadFinalState;

namespace simcore {
namespace bertini {

/**
 * @class LDMXCascadeInterface
 * @brief Extended Bertini interface that captures cascade history for LDMX
 *
 * This class inherits from G4CascadeInterface and uses the preprocessor
 * hack to access internal data members. After each ApplyYourself() call,
 * the cascade history can be extracted in LDMX format.
 *
 * Usage:
 *   1. Call ApplyYourself() as normal (base class handles cascade)
 *   2. Call extractHistory() to get the LDMX-format cascade history
 *   3. Store history keyed by initiating track ID
 */
class LDMXCascadeInterface : public G4CascadeInterface {
 public:
  LDMXCascadeInterface(const G4String& name = "LDMXBertiniCascade");
  virtual ~LDMXCascadeInterface();

  /**
   * Override ApplyYourself to capture history after cascade completes
   */
  G4HadFinalState* ApplyYourself(const G4HadProjectile& projectile,
                                 G4Nucleus& targetNucleus) override;

  /**
   * Enable or disable history recording
   */
  void setRecordHistory(bool record) { recordHistory_ = record; }

  /**
   * Check if history recording is enabled
   */
  bool isRecordingHistory() const { return recordHistory_; }

  /**
   * Set the minimum photon energy threshold for recording history [MeV]
   * Only cascades initiated by photons above this energy will be recorded.
   * Default is 5000 MeV (5 GeV), matching the typical ECal PN bias threshold.
   */
  void setEnergyThreshold(double threshold) { energyThreshold_ = threshold; }

  /**
   * Get the current energy threshold [MeV]
   */
  double getEnergyThreshold() const { return energyThreshold_; }

  /**
   * Get the captured history from the last ApplyYourself call
   * Returns nullptr if no history was captured
   */
  const ldmx::CascadeHistory* getLastCascadeHistory() const {
    return lastHistory_.empty() ? nullptr : &lastHistory_;
  }

  /**
   * Move the captured history out
   * This allows efficient transfer without copying
   */
  ldmx::CascadeHistory extractHistory() { return std::move(lastHistory_); }

  /**
   * Check if the last cascade produced history
   */
  bool hasHistory() const { return !lastHistory_.empty(); }

  /**
   * Set the track ID of the incident particle for history tagging
   */
  void setIncidentTrackId(int trackId) { incidentTrackId_ = trackId; }

 private:
  /**
   * Ensure the G4CascadeHistory object exists in the cascader
   * Geant4 only creates this if G4CASCADE_SHOW_HISTORY envvar is set,
   * so we force-create it here to enable history capture.
   */
  void ensureCascadeHistoryExists();

  /**
   * Extract history from the internal G4CascadeHistory
   * Navigates: this->collider->theIntraNucleiCascader->theCascadeHistory
   */
  void captureHistory();

  /**
   * Capture de-excitation products from G4HadFinalState
   *
   * De-excitation (evaporation, gamma emission, fission) happens AFTER the
   * intranuclear cascade and is handled by G4ExcitationHandler. These products
   * appear in the final state but are NOT recorded in G4CascadeHistory.
   *
   * This method compares the G4HadFinalState secondaries with the cascade
   * escaped particles and identifies de-excitation products as those particles
   * in the final state that don't match any cascade escapee.
   *
   * @param finalState The G4HadFinalState from ApplyYourself
   */
  void captureDeexcitationProducts(G4HadFinalState* finalState);

  /** Whether to record cascade history */
  bool recordHistory_{true};

  /** Minimum photon energy threshold for recording [MeV] */
  double energyThreshold_{5000.0};  // 5 GeV default (matches ECal PN bias)

  /** Track ID of incident particle */
  int incidentTrackId_{-1};

  /** Captured history from last cascade */
  ldmx::CascadeHistory lastHistory_;

  enableLogging("LDMXCascadeInterface")
};

}  // namespace bertini
}  // namespace simcore

#endif  // SIMCORE_BERTINI_LDMXCASCADEINTERFACE_H
