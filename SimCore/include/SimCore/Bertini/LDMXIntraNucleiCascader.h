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
#include "SimCore/Bertini/CascadeHistory.h"
#include "SimCore/Bertini/G4BertiniHack.h"

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
  void setRecordHistory(bool record) { record_history_ = record; }

  /**
   * Check if history recording is enabled
   */
  bool isRecordingHistory() const { return record_history_; }

  /**
   * Get the captured history from the last cascade
   * Returns nullptr if no history was captured or recording is disabled
   */
  const ldmx::CascadeHistory* getLastCascadeHistory() const {
    return last_history_.empty() ? nullptr : &last_history_;
  }

  /**
   * Move the captured history out of the cascader
   * This allows efficient transfer without copying
   */
  ldmx::CascadeHistory extractHistory() { return std::move(last_history_); }

  /**
   * Set the track ID of the incident particle for history tagging
   */
  void setIncidentTrackId(int trackId) { incident_track_id_ = trackId; }

  /**
   * Replace the elementary particle collider with a custom one
   * @param collider The new collider (this class takes ownership)
   *
   * NOTE: The base class destructor will delete theElementaryParticleCollider,
   * so we delete the original before replacing and let the base handle cleanup.
   */
  void setElementaryParticleCollider(G4ElementaryParticleCollider* collider);

  /**
   * Get the current elementary particle collider
   * Returns the internal collider pointer (accessible via hack header)
   */
  G4ElementaryParticleCollider* getElementaryParticleCollider() {
    return theElementaryParticleCollider;
  }

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
  bool record_history_{true};

  /** Track ID of incident particle */
  int incident_track_id_{-1};

  /** Captured history from last cascade */
  ldmx::CascadeHistory last_history_;

  /** Whether we own the collider (true if replaced via setter) */
  bool ownsCollider_{false};
};

}  // namespace bertini
}  // namespace simcore

#endif  // SIMCORE_BERTINI_LDMXINTRANUCLEICASCADER_H
