/**
 * @file CascadeStep.h
 * @brief Data class representing a single step in the Bertini intranuclear
 * cascade
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
  UNKNOWN = 0,   ///< Unclassified
  INCIDENT = 1,  ///< The incident particle (generation 0)
  PRIMARY = 2,   ///< Direct products of initial photon-nucleon interaction
  CASCADE = 3,   ///< Products of subsequent intranuclear scattering
  PREEQUILIBRIUM = 4,  ///< Fast particles escaping before equilibration
  ABSORBED =
      5,  ///< Particles absorbed by the nucleus (no daughters, no escape)
  SPECTATOR = 6,  ///< Knocked-out nucleons from quasi-deuteron breakup
  DEEXCITATION =
      7  ///< Products from nuclear de-excitation (evaporation, gamma)
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
  void setHistoryId(int id) { history_id_ = id; }

  /** Set the parent history ID (-1 if this is the incident particle) */
  void setParentId(int id) { parent_id_ = id; }

  /** Set the PDG particle ID */
  void setPdgId(int id) { pdg_id_ = id; }

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
  void setDaughterIds(const std::vector<int>& ids) { daughter_ids_ = ids; }

  /** Add a daughter history ID */
  void addDaughterId(int id) { daughter_ids_.push_back(id); }

  /** Set the target nucleon type (PDG code: 2212=proton, 2112=neutron, 0=none)
   */
  void setTargetPdgId(int id) { target_pdg_id_ = id; }

  /** Set whether this particle interacted (produced daughters) */
  void setInteracted(bool interacted) { interacted_ = interacted; }

  /** Set whether this particle escaped the nucleus */
  void setEscaped(bool escaped) { escaped_ = escaped; }

  /** Set the cascade stage classification */
  void setStage(CascadeStage stage) { stage_ = stage; }

  /** Set the cascade stage from integer value */
  void setStage(int stage) { stage_ = static_cast<CascadeStage>(stage); }

  // --- Collision info from elementary particle collider ---
  // These provide direct access to collision kinematics that would otherwise
  // need to be inferred or are not available from the cascade history alone.

  /** Set center-of-mass energy of this collision [GeV] */
  void setSqrtS(double sqrtS) { sqrtS_ = sqrtS; }

  /** Set direct target PDG from collider (not inferred) */
  void setTargetPdgDirect(int pdg) { targetPdgDirect_ = pdg; }

  /** Set nucleus state at time of this collision */
  void setNucleusAtCollision(int a, int z) {
    nucleusA_ = a;
    nucleusZ_ = z;
  }

  /** Set lab-frame kinetic energy of bullet [GeV] */
  void setKinEnergyLab(double ekin) { kinEnergyLab_ = ekin; }

  /** Mark whether collision produced output (false = absorbed/blocked) */
  void setCollisionSucceeded(bool success) { collisionSucceeded_ = success; }

  /** Set the bias weight for this collision (1.0 = unbiased) */
  void setBiasWeight(double weight) { biasWeight_ = weight; }

  // --- Getters ---

  int getHistoryId() const { return history_id_; }
  int getParentId() const { return parent_id_; }
  int getPdgId() const { return pdg_id_; }

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

  const std::vector<int>& getDaughterIds() const { return daughter_ids_; }
  int getNumDaughters() const { return static_cast<int>(daughter_ids_.size()); }

  int getTargetPdgId() const { return target_pdg_id_; }
  bool didInteract() const { return interacted_; }
  bool didEscape() const { return escaped_; }
  CascadeStage getStage() const { return stage_; }
  int getStageInt() const { return static_cast<int>(stage_); }

  // Collision info from elementary particle collider
  double getSqrtS() const { return sqrtS_; }
  int getTargetPdgDirect() const { return targetPdgDirect_; }
  int getNucleusA() const { return nucleusA_; }
  int getNucleusZ() const { return nucleusZ_; }
  double getKinEnergyLab() const { return kinEnergyLab_; }
  bool didCollisionSucceed() const { return collisionSucceeded_; }
  double getBiasWeight() const { return biasWeight_; }

  // Derived quantities
  double getKineticEnergy() const;
  double getMass() const;

 private:
  /** History ID within this cascade (unique per cascade) */
  int history_id_{-1};

  /** Parent's history ID (-1 for incident particle) */
  int parent_id_{-1};

  /** PDG particle ID */
  int pdg_id_{0};

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
  std::vector<int> daughter_ids_;

  /** PDG code of target nucleon (2212=p, 2112=n, 0=none) */
  int target_pdg_id_{0};

  /** Whether this particle interacted to produce daughters */
  bool interacted_{false};

  /** Whether this particle escaped the nucleus */
  bool escaped_{false};

  /** Cascade stage classification */
  CascadeStage stage_{CascadeStage::UNKNOWN};

  // --- Collision info from elementary particle collider ---
  // These are populated when the wrapper collider is enabled

  /** Center-of-mass energy of this collision [GeV] */
  double sqrtS_{0};

  /** Direct target PDG from collider (not inferred from conservation) */
  int targetPdgDirect_{0};

  /** Nucleus mass number at time of collision */
  int nucleusA_{0};

  /** Nucleus charge at time of collision */
  int nucleusZ_{0};

  /** Lab-frame kinetic energy of bullet [GeV] */
  double kinEnergyLab_{0};

  /** Whether the collision produced output (false = absorbed/Pauli blocked) */
  bool collisionSucceeded_{true};

  /** Bias weight for this collision (1.0 = unbiased, <1.0 = up-biased) */
  double biasWeight_{1.0};

  ClassDef(CascadeStep, 4);  // Version 4: added bias weight
};

}  // namespace ldmx

#endif  // SIMCORE_BERTINI_CASCADESTEP_H
