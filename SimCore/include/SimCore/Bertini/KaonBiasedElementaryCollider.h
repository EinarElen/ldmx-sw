/**
 * @file KaonBiasedElementaryCollider.h
 * @brief Elementary particle collider with kaon production biasing
 *
 * This class implements rejection sampling to enhance kaon production in
 * Bertini cascade collisions. The biasing is applied at the CHANNEL SELECTION
 * level, not at the full collision level.
 *
 * When Geant4's Bertini cascade selects a final-state channel that doesn't
 * contain kaons, it may be rejected and a new channel selected with some
 * probability. This is different from regenerating the entire collision.
 *
 * The biasing is applied only in the CM energy range where kaon production
 * is significant (configurable, typically 1.5-10 GeV).
 */

#ifndef SIMCORE_BERTINI_KAONBIASEDELEMENTARYPARTICLECOLLIDER_H
#define SIMCORE_BERTINI_KAONBIASEDELEMENTARYPARTICLECOLLIDER_H

#include "SimCore/Bertini/LDMXElementaryParticleCollider.h"

// Need additional headers for the full collision implementation
#include "G4CascadeChannelTables.hh"
#include "G4CascadeFinalStateAlgorithm.hh"
#include "G4InteractionCase.hh"
#include "G4LorentzConvertor.hh"
#include "G4NucleiModel.hh"
#include "G4ParticleLargerEkin.hh"

namespace simcore {
namespace bertini {

/**
 * @class KaonBiasedElementaryCollider
 * @brief Collider with rejection sampling on channel selection to enhance kaons
 *
 * Algorithm (inside generateSCMfinalState equivalent):
 * 1. Generate multiplicity using true Bertini physics
 * 2. Generate final-state channel (particle types)
 * 3. Check if channel contains strange particles (kaons, hyperons)
 * 4. If strange particles present: accept, weight = 1.0
 * 5. If no strange particles:
 *    - With probability (1 - 1/biasFactor): reject and go to step 1
 *    - With probability 1/biasFactor: accept, record weight = biasFactor
 * 6. Generate kinematics for the accepted channel
 *
 * This approach only regenerates the channel selection, not the full collision,
 * which avoids corrupting the cascade history machinery.
 */
class KaonBiasedElementaryCollider : public LDMXElementaryParticleCollider {
 public:
  KaonBiasedElementaryCollider();
  virtual ~KaonBiasedElementaryCollider();

  /**
   * Override collide to implement channel-level kaon biasing.
   * This reimplements the G4ElementaryParticleCollider collision logic
   * with biased channel selection.
   */
  void collide(G4InuclParticle* bullet, G4InuclParticle* target,
               G4CollisionOutput& output) override;

  // --- Configuration ---

  /**
   * Set the kaon bias factor.
   * @param factor Enhancement factor for kaon production (>1 enhances kaons)
   */
  void setBiasFactor(double factor) { biasFactor_ = factor; }

  /**
   * Get the kaon bias factor.
   */
  double getBiasFactor() const { return biasFactor_; }

  /**
   * Set the minimum CM energy for biasing [GeV].
   * Below this energy, no biasing is applied (kaons kinematically suppressed).
   */
  void setMinEnergy(double emin) { minEnergy_ = emin; }

  /**
   * Set the maximum CM energy for biasing [GeV].
   * Above this energy, biasing may be unnecessary or counterproductive.
   */
  void setMaxEnergy(double emax) { maxEnergy_ = emax; }

  /**
   * Set the maximum number of channel regeneration attempts.
   * If exceeded, accept the last result with appropriate weight.
   */
  void setMaxAttempts(int max) { maxAttempts_ = max; }

  /**
   * Enable or disable biasing (allows turning off without removing collider).
   */
  void setBiasEnabled(bool enabled) { biasEnabled_ = enabled; }

  /**
   * Check if biasing is enabled.
   */
  bool isBiasEnabled() const { return biasEnabled_; }

  // --- Statistics ---

  /**
   * Get the total number of channel regeneration attempts due to rejection.
   */
  int getRegenerationAttempts() const { return regenerationAttempts_; }

  /**
   * Get the number of collisions where biasing was applied.
   */
  int getBiasedCollisionCount() const { return biasedCollisionCount_; }

  /**
   * Get the number of collisions that produced strange particles.
   */
  int getStrangeCollisionCount() const { return strangeCollisionCount_; }

  /**
   * Reset biasing statistics.
   */
  void resetBiasStatistics();

  /**
   * Get the cumulative bias weight for the current cascade.
   * This should be multiplied into the event weight.
   */
  double getCumulativeBiasWeight() const { return cumulativeBiasWeight_; }

  /**
   * Clear the cumulative bias weight (call before each cascade).
   */
  void clearCumulativeBiasWeight() { cumulativeBiasWeight_ = 1.0; }

 private:
  /**
   * Biased version of generateSCMfinalState that applies rejection sampling
   * on channel selection to enhance kaon production.
   */
  void generateBiasedSCMfinalState(G4double ekin, G4double etot_scm,
                                   G4InuclElementaryParticle* particle1,
                                   G4InuclElementaryParticle* particle2,
                                   double& biasWeight);

  /**
   * Check if the particle_kinds buffer contains strange particles.
   */
  bool particleKindsContainStrange() const;

  /**
   * Check if energy is in the biasing range.
   * @param sqrtS Center-of-mass energy [GeV]
   */
  bool isInBiasRange(double sqrtS) const;

  /**
   * Generate random number for rejection sampling.
   */
  double generateRandom() const;

  /** Kaon bias enhancement factor */
  double biasFactor_{1.0};

  /** Minimum CM energy for biasing [GeV] */
  double minEnergy_{1.5};

  /** Maximum CM energy for biasing [GeV] */
  double maxEnergy_{10.0};

  /** Maximum channel regeneration attempts */
  int maxAttempts_{100};

  /** Whether biasing is enabled */
  bool biasEnabled_{false};

  /** Cumulative bias weight for current cascade */
  double cumulativeBiasWeight_{1.0};

  // Statistics
  int regenerationAttempts_{0};
  int biasedCollisionCount_{0};
  int strangeCollisionCount_{0};

  enableLogging("KaonBiasedElementaryCollider")
};

}  // namespace bertini
}  // namespace simcore

#endif  // SIMCORE_BERTINI_KAONBIASEDELEMENTARYPARTICLECOLLIDER_H
