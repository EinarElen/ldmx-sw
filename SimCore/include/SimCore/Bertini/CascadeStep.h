/**
 * @file CascadeStep.h
 * @brief Data class representing a single step in the Bertini intranuclear cascade
 */

#ifndef SIMCORE_BERTINI_CASCADESTEP_H
#define SIMCORE_BERTINI_CASCADESTEP_H

#include <vector>

#include "TObject.h"

namespace ldmx {

/**
 * @enum CascadeStage
 * @brief Classification of cascade particle stages
 *
 * These stages help characterize where in the cascade process a particle
 * originated. The classification is inferred from generation, energy, and
 * whether the particle escaped or interacted.
 */
enum class CascadeStage : int {
  UNKNOWN = 0,       ///< Unclassified
  INCIDENT = 1,      ///< The incident particle (generation 0)
  PRIMARY = 2,       ///< Direct products of initial photon-nucleon interaction
  CASCADE = 3,       ///< Products of subsequent intranuclear scattering
  PREEQUILIBRIUM = 4,///< Fast particles escaping before equilibration
  ABSORBED = 5,      ///< Particles absorbed by the nucleus (no daughters, no escape)
  SPECTATOR = 6,     ///< Knocked-out nucleons from quasi-deuteron breakup
  DEEXCITATION = 7   ///< Products from nuclear de-excitation (evaporation, gamma)
};

/**
 * @class CascadeStep
 * @brief Represents a single particle step in the Bertini intranuclear cascade
 *
 * Each CascadeStep captures the state of a particle as it propagates through
 * the nucleus during the cascade. The step records:
 * - Particle identity (PDG code, history ID)
 * - Kinematics (4-momentum, position)
 * - Cascade state (generation, zone, path length, stage)
 * - Genealogy (parent ID, daughter IDs)
 * - Target nucleon type (inferred from charge/baryon conservation)
 *
 * History IDs are unique within a single cascade (photonuclear interaction)
 * and are used to track parent-daughter relationships.
 *
 * De-excitation products (evaporation, gamma emission) from the residual
 * nucleus are captured separately after the cascade phase via comparison
 * of G4HadFinalState with cascade escapees. These are marked with
 * stage=DEEXCITATION and generation=-1.
 */
class CascadeStep {
 public:
  CascadeStep() = default;
  virtual ~CascadeStep() = default;

  /** Reset to default state */
  void clear();

  // --- Setters ---

  /** Set the history ID (unique within this cascade) */
  void setHistoryId(int id) { historyId_ = id; }

  /** Set the parent history ID (-1 if this is the incident particle) */
  void setParentId(int id) { parentId_ = id; }

  /** Set the PDG particle ID */
  void setPdgId(int id) { pdgId_ = id; }

  /** Set the 4-momentum components [MeV] */
  void setMomentum(double px, double py, double pz, double e) {
    px_ = px;
    py_ = py;
    pz_ = pz;
    energy_ = e;
  }

  /** Set the position in the nucleus [fm] */
  void setPosition(double x, double y, double z) {
    x_ = x;
    y_ = y;
    z_ = z;
  }

  /** Set the cascade generation (0 = incident, 1 = first generation, etc.) */
  void setGeneration(int gen) { generation_ = gen; }

  /** Set the nuclear zone index */
  void setZone(int zone) { zone_ = zone; }

  /** Set the cumulative path length through nucleus [fm] */
  void setPath(double path) { path_ = path; }

  /** Set the daughter history IDs */
  void setDaughterIds(const std::vector<int>& ids) { daughterIds_ = ids; }

  /** Add a daughter history ID */
  void addDaughterId(int id) { daughterIds_.push_back(id); }

  /** Set the target nucleon type (PDG code: 2212=proton, 2112=neutron, 0=none) */
  void setTargetPdgId(int id) { targetPdgId_ = id; }

  /** Set whether this particle interacted (produced daughters) */
  void setInteracted(bool interacted) { interacted_ = interacted; }

  /** Set whether this particle escaped the nucleus */
  void setEscaped(bool escaped) { escaped_ = escaped; }

  /** Set the cascade stage classification */
  void setStage(CascadeStage stage) { stage_ = stage; }

  /** Set the cascade stage from integer value */
  void setStage(int stage) { stage_ = static_cast<CascadeStage>(stage); }

  // --- Getters ---

  int getHistoryId() const { return historyId_; }
  int getParentId() const { return parentId_; }
  int getPdgId() const { return pdgId_; }

  double getPx() const { return px_; }
  double getPy() const { return py_; }
  double getPz() const { return pz_; }
  double getEnergy() const { return energy_; }

  double getX() const { return x_; }
  double getY() const { return y_; }
  double getZ() const { return z_; }

  int getGeneration() const { return generation_; }
  int getZone() const { return zone_; }
  double getPath() const { return path_; }

  const std::vector<int>& getDaughterIds() const { return daughterIds_; }
  int getNumDaughters() const { return static_cast<int>(daughterIds_.size()); }

  int getTargetPdgId() const { return targetPdgId_; }
  bool didInteract() const { return interacted_; }
  bool didEscape() const { return escaped_; }
  CascadeStage getStage() const { return stage_; }
  int getStageInt() const { return static_cast<int>(stage_); }

  // Derived quantities
  double getKineticEnergy() const;
  double getMass() const;

 private:
  /** History ID within this cascade (unique per cascade) */
  int historyId_{-1};

  /** Parent's history ID (-1 for incident particle) */
  int parentId_{-1};

  /** PDG particle ID */
  int pdgId_{0};

  /** 4-momentum components [MeV] */
  double px_{0};
  double py_{0};
  double pz_{0};
  double energy_{0};

  /** Position in nucleus [fm] */
  double x_{0};
  double y_{0};
  double z_{0};

  /** Cascade generation (0=incident, 1=first generation, ...) */
  int generation_{0};

  /** Nuclear zone index */
  int zone_{0};

  /** Cumulative path length through nucleus [fm] */
  double path_{0};

  /** History IDs of daughter particles (empty if no interaction) */
  std::vector<int> daughterIds_;

  /** PDG code of target nucleon (2212=p, 2112=n, 0=none) */
  int targetPdgId_{0};

  /** Whether this particle interacted to produce daughters */
  bool interacted_{false};

  /** Whether this particle escaped the nucleus */
  bool escaped_{false};

  /** Cascade stage classification */
  CascadeStage stage_{CascadeStage::UNKNOWN};

  ClassDef(CascadeStep, 2);
};

}  // namespace ldmx

#endif  // SIMCORE_BERTINI_CASCADESTEP_H
