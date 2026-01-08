/**
 * @file LDMXElementaryParticleCollider.h
 * @brief Wrapper collider that logs collisions and delegates to Bertini
 *
 * This class derives from G4ElementaryParticleCollider to intercept collision calls,
 * log diagnostic information, and then delegate to the BASE CLASS for actual physics.
 *
 * IMPORTANT: setNucleusState() is NOT virtual in the base class, so we cannot intercept
 * those calls. The base class method sets our inherited nucleusA/nucleusZ members,
 * which the base class collide() then uses. This is fine for our purposes.
 */

#ifndef SIMCORE_BERTINI_LDMXELEMENTARYPARTICLECOLLIDER_H
#define SIMCORE_BERTINI_LDMXELEMENTARYPARTICLECOLLIDER_H

// IMPORTANT: Include the hack header FIRST
#include "SimCore/Bertini/G4BertiniHack.h"

#include <vector>

#include "Framework/Logger.h"

namespace simcore {
namespace bertini {

/**
 * @struct CollisionInfo
 * @brief Records kinematic information from a single hadron-nucleon collision
 *
 * This struct captures collision data that is available inside the elementary
 * particle collider but would otherwise be lost or need to be inferred.
 */
struct CollisionInfo {
  int bulletPdg{0};         ///< PDG code of bullet particle
  int targetPdg{0};         ///< PDG code of target nucleon (direct, not inferred)
  double sqrtS{0};          ///< Center-of-mass energy [GeV]
  double kinEnergyLab{0};   ///< Lab-frame kinetic energy of bullet [GeV]
  int nucleusA{0};          ///< Nucleus mass number at collision time
  int nucleusZ{0};          ///< Nucleus charge at collision time
  bool succeeded{true};     ///< Whether collision produced output
  // For matching to cascade history entries
  double bulletPx{0};       ///< Bullet momentum x [GeV]
  double bulletPy{0};       ///< Bullet momentum y [GeV]
  double bulletPz{0};       ///< Bullet momentum z [GeV]
  double bulletE{0};        ///< Bullet energy [GeV]
  // Biasing information
  double biasWeight{1.0};   ///< Bias weight for this collision (1.0 = unbiased)
};

/**
 * @class LDMXElementaryParticleCollider
 * @brief Wrapper collider that intercepts and logs hadron-nucleon collisions
 *
 * This class:
 * 1. Overrides collide() (which IS virtual) to intercept collision calls
 * 2. Logs collision information (particle types, energies, multiplicities)
 * 3. Delegates to G4ElementaryParticleCollider::collide() for actual physics
 * 4. Logs the collision results
 *
 * NOTE: setNucleusState() is NOT virtual in the base class, so we cannot intercept
 * those calls. The base class sets our inherited nucleusA/nucleusZ members directly.
 */
class LDMXElementaryParticleCollider : public G4ElementaryParticleCollider {
 public:
  LDMXElementaryParticleCollider();
  virtual ~LDMXElementaryParticleCollider();

  /**
   * Override collide to log and delegate to base class
   * This IS called via virtual dispatch because collide() is virtual in base.
   */
  void collide(G4InuclParticle* bullet, G4InuclParticle* target,
               G4CollisionOutput& output) override;

  /**
   * Enable or disable verbose logging
   */
  void setLogging(bool enable) { loggingEnabled_ = enable; }

  /**
   * Check if logging is enabled
   */
  bool isLogging() const { return loggingEnabled_; }

  /**
   * Get collision statistics
   */
  int getCollisionCount() const { return collisionCount_; }
  int getSuccessfulCollisions() const { return successfulCollisions_; }

  /**
   * Reset statistics
   */
  void resetStatistics();

  /**
   * Clear stored collision info (call before each cascade)
   */
  void clearCollisionInfo() { collisionInfo_.clear(); }

  /**
   * Get stored collision info from current cascade
   */
  const std::vector<CollisionInfo>& getCollisionInfo() const {
    return collisionInfo_;
  }

  /**
   * Get number of recorded collisions
   */
  size_t getNumRecordedCollisions() const { return collisionInfo_.size(); }

 protected:
  /** Collision info storage for current cascade (protected for derived classes) */
  std::vector<CollisionInfo> collisionInfo_;

  /**
   * Get PDG code from Bertini particle type
   */
  int getPdgCode(int inuclType) const;

  /**
   * Get particle name for logging
   */
  std::string getParticleName(int inuclType) const;

  /** Statistics (protected for derived class access) */
  int collisionCount_{0};
  int successfulCollisions_{0};

  /** Logging control */
  bool loggingEnabled_{true};

 private:
  /**
   * Log collision input information
   */
  void logCollisionInput(G4InuclParticle* bullet, G4InuclParticle* target);

  /**
   * Log collision output information
   */
  void logCollisionOutput(const G4CollisionOutput& output);

  // NOTE: No wrapped collider needed - we call base class directly
  // NOTE: No nucleusA_/nucleusZ_ needed - we use inherited members from base

  enableLogging("LDMXElementaryParticleCollider")
};

}  // namespace bertini
}  // namespace simcore

#endif  // SIMCORE_BERTINI_LDMXELEMENTARYPARTICLECOLLIDER_H
