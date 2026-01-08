/**
 * @file LDMXIntraNucleiCascader.h
 * @brief Custom cascader that exposes cascade history for LDMX
 *
 * This class uses the G4BertiniHack to access private members of
 * G4IntraNucleiCascader, allowing us to extract the cascade history
 * after each photonuclear interaction.
 */

#ifndef SIMCORE_BERTINI_LDMXINTRANUCLEICASCADER_H
#define SIMCORE_BERTINI_LDMXINTRANUCLEICASCADER_H

// IMPORTANT: Include the hack header FIRST to expose private members
#include "SimCore/Bertini/G4BertiniHack.h"

#include "SimCore/Bertini/CascadeHistory.h"

namespace simcore {
namespace bertini {

/**
 * @class LDMXIntraNucleiCascader
 * @brief Extended cascader that captures cascade history for LDMX
 *
 * This class inherits from G4IntraNucleiCascader and uses the preprocessor
 * hack to access the internal G4CascadeHistory. After each cascade completes,
 * the history can be extracted and converted to LDMX format.
 *
 * Key features:
 * - Access to theCascadeHistory for reading cascade structure
 * - Conversion to ldmx::CascadeHistory format
 * - History recording can be enabled/disabled
 */
class LDMXIntraNucleiCascader : public G4IntraNucleiCascader {
 public:
  LDMXIntraNucleiCascader();
  virtual ~LDMXIntraNucleiCascader();

  /**
   * Override collide to capture history after cascade completes
   */
  void collide(G4InuclParticle* bullet, G4InuclParticle* target,
               G4CollisionOutput& globalOutput) override;

  /**
   * Enable or disable history recording
   * When disabled, no history is captured (slight performance improvement)
   */
  void setRecordHistory(bool record) { recordHistory_ = record; }

  /**
   * Check if history recording is enabled
   */
  bool isRecordingHistory() const { return recordHistory_; }

  /**
   * Get the captured history from the last cascade
   * Returns nullptr if no history was captured or recording is disabled
   */
  const ldmx::CascadeHistory* getLastCascadeHistory() const {
    return lastHistory_.empty() ? nullptr : &lastHistory_;
  }

  /**
   * Move the captured history out of the cascader
   * This allows efficient transfer without copying
   */
  ldmx::CascadeHistory extractHistory() { return std::move(lastHistory_); }

  /**
   * Set the track ID of the incident particle for history tagging
   */
  void setIncidentTrackId(int trackId) { incidentTrackId_ = trackId; }

 private:
  /**
   * Convert G4CascadeHistory to ldmx::CascadeHistory
   * Called after base class collide() completes
   */
  void captureHistory();

  /**
   * Convert a single G4CascadParticle to ldmx::CascadeStep
   */
  ldmx::CascadeStep convertStep(const G4CascadParticle& cpart, int parentId,
                                const std::vector<int>& daughterIds,
                                bool interacted, bool escaped) const;

  /**
   * Get the PDG code from a G4InuclElementaryParticle type
   */
  int getPdgCode(int inuclType) const;

  /** Whether to record cascade history */
  bool recordHistory_{true};

  /** Track ID of incident particle */
  int incidentTrackId_{-1};

  /** Captured history from last cascade */
  ldmx::CascadeHistory lastHistory_;
};

}  // namespace bertini
}  // namespace simcore

#endif  // SIMCORE_BERTINI_LDMXINTRANUCLEICASCADER_H
