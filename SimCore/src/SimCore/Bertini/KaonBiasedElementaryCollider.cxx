/**
 * @file KaonBiasedElementaryCollider.cxx
 * @brief Implementation of kaon-biased elementary particle collider
 *
 * This implementation reimplements the G4ElementaryParticleCollider::collide()
 * logic with biased channel selection. The biasing is applied at the
 * generateOutgoingPartTypes() level, not by calling collide() multiple times.
 */

#include "SimCore/Bertini/KaonBiasedElementaryCollider.h"

#include "G4CascadeParameters.hh"
#include "G4GDecay3.hh"
#include "G4InuclParticleNames.hh"
#include "G4InuclSpecialFunctions.hh"
#include "G4MultiBodyMomentumDist.hh"
#include "G4TwoBodyAngularDist.hh"
#include "Randomize.hh"

namespace simcore {
namespace bertini {

using namespace G4InuclParticleNames;
using namespace G4InuclSpecialFunctions;

KaonBiasedElementaryCollider::KaonBiasedElementaryCollider()
    : LDMXElementaryParticleCollider(),
      biasFactor_(1.0),
      minEnergy_(1.5),
      maxEnergy_(10.0),
      maxAttempts_(100),
      biasEnabled_(false),
      cumulativeBiasWeight_(1.0),
      regenerationAttempts_(0),
      biasedCollisionCount_(0),
      strangeCollisionCount_(0) {
  ldmx_log(info) << "KaonBiasedElementaryCollider created";
}

KaonBiasedElementaryCollider::~KaonBiasedElementaryCollider() {
  ldmx_log(info) << "KaonBiasedElementaryCollider destroyed. Statistics:";
  ldmx_log(info) << "  Biased collision count: " << biasedCollisionCount_;
  ldmx_log(info) << "  Strange particle collisions: " << strangeCollisionCount_;
  ldmx_log(info) << "  Channel regeneration attempts: " << regenerationAttempts_;
}

void KaonBiasedElementaryCollider::collide(G4InuclParticle* bullet,
                                            G4InuclParticle* target,
                                            G4CollisionOutput& output) {
  // Record collision info (from LDMXElementaryParticleCollider)
  ++collisionCount_;

  // Input validation - same as base class
  if (!useEPCollider(bullet, target)) {
    ldmx_log(error) << "ElementaryParticleCollider can only collide particle "
                       "with particle";
    return;
  }

  // Set up interaction case - this is inherited from G4ElementaryParticleCollider
  interCase.set(bullet, target);

  G4InuclElementaryParticle* particle1 =
      dynamic_cast<G4InuclElementaryParticle*>(bullet);
  G4InuclElementaryParticle* particle2 =
      dynamic_cast<G4InuclElementaryParticle*>(target);

  if (!particle1 || !particle2) {
    ldmx_log(error) << "ElementaryParticleCollider can only collide hadrons";
    return;
  }

  // Skip neutrinos
  if (particle1->isNeutrino() || particle2->isNeutrino()) return;

  // Check for available interaction
  if (!G4CascadeChannelTables::GetTable(interCase.hadrons()) &&
      !particle1->quasi_deutron() && !particle2->quasi_deutron()) {
    ldmx_log(error) << "Cannot collide "
                    << particle1->getDefinition()->GetParticleName() << " with "
                    << particle2->getDefinition()->GetParticleName();
    return;
  }

  // Set up Lorentz conversion to CM frame
  G4LorentzConvertor convertToSCM;
  if (particle2->nucleon() || particle2->quasi_deutron()) {
    convertToSCM.setBullet(particle1);
    convertToSCM.setTarget(particle2);
  } else {
    convertToSCM.setBullet(particle2);
    convertToSCM.setTarget(particle1);
  }

  convertToSCM.setVerbose(verboseLevel);
  convertToSCM.toTheCenterOfMass();

  G4double etot_scm = convertToSCM.getTotalSCMEnergy();
  G4double ekin = convertToSCM.getKinEnergyInTheTRS();

  // Store collision info
  CollisionInfo info;
  info.bulletPdg = getPdgCode(particle1->type());
  info.targetPdg = getPdgCode(particle2->type());
  info.sqrtS = etot_scm;
  info.kinEnergyLab = ekin;
  info.nucleusA = nucleusA;
  info.nucleusZ = nucleusZ;
  auto bulletMom = particle1->getMomentum();
  info.bulletPx = bulletMom.px();
  info.bulletPy = bulletMom.py();
  info.bulletPz = bulletMom.pz();
  info.bulletE = bulletMom.e();
  info.biasWeight = 1.0;

  // Bias weight for this collision (will be set in generateBiasedSCMfinalState)
  double thisCollisionWeight = 1.0;

  // Generate collision final state based on interaction type
  if (particle1->nucleon() || particle2->nucleon()) {
    // Check for low-energy pion absorption
    if (pionNucleonAbsorption(ekin)) {
      // Use base class pion absorption (no biasing for this special case)
      generateSCMpionNAbsorption(etot_scm, particle1, particle2);
      thisCollisionWeight = 1.0;
    } else {
      // Main case: particle-nucleon collision
      // Use biased final state generation if in range
      if (biasEnabled_ && isInBiasRange(etot_scm)) {
        generateBiasedSCMfinalState(ekin, etot_scm, particle1, particle2,
                                    thisCollisionWeight);
      } else {
        // Not in biasing range - use standard generation
        generateSCMfinalState(ekin, etot_scm, particle1, particle2);
        thisCollisionWeight = 1.0;
      }
    }
  }

  // Pion/photon collision with quasi-deuteron
  if (particle1->quasi_deutron() || particle2->quasi_deutron()) {
    if (!G4NucleiModel::useQuasiDeuteron(particle1->type(), particle2->type()) &&
        !G4NucleiModel::useQuasiDeuteron(particle2->type(),
                                         particle1->type())) {
      ldmx_log(error) << "Can only collide pi,mu,gamma with dibaryons";
      return;
    }

    if (particle1->isMuon() || particle2->isMuon()) {
      generateSCMmuonAbsorption(etot_scm, particle1, particle2);
    } else {
      generateSCMpionAbsorption(etot_scm, particle1, particle2);
    }
    // No biasing for quasi-deuteron interactions
    thisCollisionWeight = 1.0;
  }

  // Check if final state was generated successfully
  if (particles.empty()) {
    if (verboseLevel) {
      ldmx_log(debug) << "Failed to collide "
                      << particle1->getDefinition()->GetParticleName()
                      << " with "
                      << particle2->getDefinition()->GetParticleName();
    }
    info.succeeded = false;
    info.biasWeight = 1.0;
    collisionInfo_.push_back(info);
    return;
  }

  // Convert final state back to lab frame
  G4LorentzVector mom;
  for (auto& p : particles) {
    mom = convertToSCM.backToTheLab(p.getMomentum());
    p.setMomentum(mom);
  }

  // Sort by energy and add to output
  std::sort(particles.begin(), particles.end(), G4ParticleLargerEkin());
  output.addOutgoingParticles(particles);

  ++successfulCollisions_;

  // Update bias weight
  info.succeeded = true;
  info.biasWeight = thisCollisionWeight;
  cumulativeBiasWeight_ *= thisCollisionWeight;
  collisionInfo_.push_back(info);
}

void KaonBiasedElementaryCollider::generateBiasedSCMfinalState(
    G4double ekin, G4double etot_scm, G4InuclElementaryParticle* particle1,
    G4InuclElementaryParticle* particle2, double& biasWeight) {
  ldmx_log(debug) << "generateBiasedSCMfinalState: sqrt(s)=" << etot_scm
                  << " ekin=" << ekin;

  // Initialize the final state generator (inherited from base)
  fsGenerator.SetVerboseLevel(verboseLevel);

  const G4int itry_max = 10;        // Max kinematic retries
  const G4int bias_max = maxAttempts_;  // Max biasing retries

  G4int type1 = particle1->type();
  G4int type2 = particle2->type();
  G4int is = type1 * type2;

  ++biasedCollisionCount_;
  biasWeight = 1.0;

  G4int multiplicity = 0;
  G4bool generate = true;

  G4int itry = 0;
  G4int biasAttempts = 0;
  bool biasAccepted = false;

  while (generate && itry < itry_max) {
    particles.clear();
    particle_kinds.clear();

    // BIASED CHANNEL SELECTION LOOP
    // This loop regenerates multiplicity and channel until we get kaons
    // or accept via rejection sampling
    biasAccepted = false;
    biasAttempts = 0;

    while (!biasAccepted && biasAttempts < bias_max) {
      // Generate multiplicity (inherited from G4ElementaryParticleCollider)
      multiplicity = generateMultiplicity(is, ekin);

      // Generate outgoing particle types (channel selection)
      generateOutgoingPartTypes(is, multiplicity, ekin);

      if (particle_kinds.empty()) {
        // Channel generation failed - retry
        ++biasAttempts;
        continue;
      }

      // Check if this channel contains strange particles
      if (particleKindsContainStrange()) {
        // Strange particles - always accept with weight 1.0
        biasAccepted = true;
        biasWeight = 1.0;
        ++strangeCollisionCount_;
        ldmx_log(debug) << "Kaon biasing: accepted strange channel (mult="
                        << multiplicity << ")";
      } else {
        // No strange particles - apply rejection sampling
        // Accept with probability 1/biasFactor
        double acceptProb = 1.0 / biasFactor_;
        if (generateRandom() < acceptProb) {
          // Accept with weight = biasFactor
          biasAccepted = true;
          biasWeight = biasFactor_;
          ldmx_log(debug) << "Kaon biasing: accepted non-strange channel with "
                             "weight="
                          << biasFactor_;
        } else {
          // Reject - regenerate channel
          ++biasAttempts;
          ++regenerationAttempts_;
          ldmx_log(trace) << "Kaon biasing: rejected non-strange channel "
                          << "(attempt " << biasAttempts << ")";
        }
      }
    }

    // If we hit max bias attempts, accept whatever we have
    if (!biasAccepted) {
      ldmx_log(warn) << "Kaon biasing: reached max attempts (" << bias_max
                     << "), accepting with weight=" << biasFactor_;
      biasWeight = biasFactor_;
      biasAccepted = true;
    }

    // Now generate kinematics for the accepted channel
    if (particle_kinds.empty()) {
      ldmx_log(debug) << "generateBiasedSCMfinalState: no valid channel found";
      ++itry;
      continue;
    }

    // Fill masses from particle types (inherited from G4ElementaryParticleCollider)
    fillOutgoingMasses();

    // Generate momenta using the final state algorithm
    fsGenerator.Configure(particle1, particle2, particle_kinds);
    generate = !fsGenerator.Generate(etot_scm, masses, scm_momentums);

    ++itry;
  }

  if (itry >= itry_max) {
    ldmx_log(debug) << "generateBiasedSCMfinalState: failed " << itry
                    << " attempts to generate kinematics";
    biasWeight = 1.0;  // Reset weight on failure
    return;
  }

  // Fill particles buffer with generated momenta
  particles.resize(multiplicity);
  for (G4int i = 0; i < multiplicity; i++) {
    particles[i].fill(scm_momentums[i], particle_kinds[i],
                      G4InuclParticle::EPCollider);
  }

  ldmx_log(debug) << "generateBiasedSCMfinalState: success, biasWeight="
                  << biasWeight;
}

bool KaonBiasedElementaryCollider::particleKindsContainStrange() const {
  for (G4int kind : particle_kinds) {
    // Check for kaons
    if (kind == kaonPlus || kind == kaonMinus || kind == kaonZero ||
        kind == kaonZeroBar) {
      return true;
    }
    // Check for hyperons (strange baryons)
    if (kind == lambda || kind == sigmaPlus || kind == sigmaZero ||
        kind == sigmaMinus || kind == xiZero || kind == xiMinus ||
        kind == omegaMinus) {
      return true;
    }
  }
  return false;
}

bool KaonBiasedElementaryCollider::isInBiasRange(double sqrtS) const {
  return sqrtS >= minEnergy_ && sqrtS <= maxEnergy_;
}

double KaonBiasedElementaryCollider::generateRandom() const {
  return G4UniformRand();
}

void KaonBiasedElementaryCollider::resetBiasStatistics() {
  regenerationAttempts_ = 0;
  biasedCollisionCount_ = 0;
  strangeCollisionCount_ = 0;
}

}  // namespace bertini
}  // namespace simcore
