/**
 * @file CascadeHistory.h
 * @brief Container for the complete history of a Bertini intranuclear cascade
 */

#ifndef SIMCORE_BERTINI_CASCADEHISTORY_H
#define SIMCORE_BERTINI_CASCADEHISTORY_H

#include <vector>

#include "SimCore/Bertini/CascadeStep.h"
#include "TObject.h"

namespace ldmx {

/**
 * @class CascadeHistory
 * @brief Container storing the complete step-by-step history of a Bertini
 * cascade
 *
 * This class stores all CascadeStep objects that occurred during a single
 * photonuclear interaction (one G4CascadeInterface::ApplyYourself call).
 *
 * The history is keyed by the track ID of the initiating photon, allowing
 * correlation with SimParticle data.
 *
 * Parent-daughter relationships are encoded through history IDs in each step.
 * The incident particle has parentId = -1.
 */
class CascadeHistory {
 public:
  CascadeHistory() = default;
  virtual ~CascadeHistory() = default;

  /** Reset to empty state */
  void clear();

  // --- Modification ---

  /** Set the track ID of the photon that initiated this cascade */
  void setIncidentTrackId(int trackId) { incident_track_id_ = trackId; }

  /** Set the target nucleus (A, Z) */
  void setTargetNucleus(int a, int z) {
    target_a_ = a;
    target_z_ = z;
  }

  /** Set the incident photon energy [MeV] */
  void setIncidentEnergy(double energy) { incident_energy_ = energy; }

  /** Set the excitation energy of the residual nucleus [MeV] */
  void setExcitationEnergy(double energy) { excitation_energy_ = energy; }

  /** Set the residual nucleus after cascade (A, Z) */
  void setResidualNucleus(int a, int z) {
    residual_a_ = a;
    residual_z_ = z;
  }

  /** Add a step to the history */
  void addStep(const CascadeStep& step) { steps_.push_back(step); }

  /** Add a step by moving */
  void addStep(CascadeStep&& step) { steps_.push_back(std::move(step)); }

  /** Reserve space for steps */
  void reserve(size_t n) { steps_.reserve(n); }

  // --- Access ---

  /** Get the track ID of the initiating photon */
  int getIncidentTrackId() const { return incident_track_id_; }

  /** Get target nucleus mass number */
  int getTargetA() const { return target_a_; }

  /** Get target nucleus charge */
  int getTargetZ() const { return target_z_; }

  /** Get the incident photon energy [MeV] */
  double getIncidentEnergy() const { return incident_energy_; }

  /** Get the excitation energy of the residual nucleus [MeV] */
  double getExcitationEnergy() const { return excitation_energy_; }

  /** Get residual nucleus mass number after cascade */
  int getResidualA() const { return residual_a_; }

  /** Get residual nucleus charge after cascade */
  int getResidualZ() const { return residual_z_; }

  /** Get the number of steps in the cascade */
  size_t getNumSteps() const { return steps_.size(); }

  /** Check if history is empty */
  bool empty() const { return steps_.empty(); }

  /** Get all steps (const) */
  const std::vector<CascadeStep>& getSteps() const { return steps_; }

  /** Get all steps (mutable, for enrichment) */
  std::vector<CascadeStep>& getSteps() { return steps_; }

  /** Get a specific step by index */
  const CascadeStep& getStep(size_t i) const { return steps_.at(i); }

  /** Get a step by its history ID (returns nullptr if not found) */
  const CascadeStep* getStepByHistoryId(int historyId) const;

  // --- Analysis helpers ---

  /** Get the incident particle step (first step, generation 0) */
  const CascadeStep* getIncidentStep() const;

  /** Get all steps at a given generation */
  std::vector<const CascadeStep*> getStepsAtGeneration(int generation) const;

  /** Get all steps that interacted (produced daughters) */
  std::vector<const CascadeStep*> getInteractingSteps() const;

  /** Get all steps that escaped the nucleus */
  std::vector<const CascadeStep*> getEscapedSteps() const;

  /** Get the maximum cascade generation reached */
  int getMaxGeneration() const;

  /** Get the total number of interactions in the cascade */
  int getNumInteractions() const;

  /** Print a summary of the cascade */
  void print() const;

 private:
  /** Track ID of the photon that initiated this cascade */
  int incident_track_id_{-1};

  /** Target nucleus mass number */
  int target_a_{0};

  /** Target nucleus charge */
  int target_z_{0};

  /** Incident photon energy [MeV] */
  double incident_energy_{0.0};

  /** Excitation energy of residual nucleus [MeV] */
  double excitation_energy_{0.0};

  /** Residual nucleus mass number after cascade */
  int residual_a_{0};

  /** Residual nucleus charge after cascade */
  int residual_z_{0};

  /** Ordered list of all cascade steps */
  std::vector<CascadeStep> steps_;

  ClassDef(CascadeHistory, 3);
};

}  // namespace ldmx

#endif  // SIMCORE_BERTINI_CASCADEHISTORY_H
