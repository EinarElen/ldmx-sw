/**
 * @file LDMXElementaryParticleCollider.cxx
 * @brief Implementation of the wrapper collider
 */

#include "SimCore/Bertini/LDMXElementaryParticleCollider.h"

#include "G4InuclElementaryParticle.hh"
#include "G4InuclParticleNames.hh"
#include "G4LorentzConvertor.hh"

namespace simcore {
namespace bertini {

LDMXElementaryParticleCollider::LDMXElementaryParticleCollider()
    : G4ElementaryParticleCollider(),
      collisionCount_(0),
      successfulCollisions_(0),
      loggingEnabled_(true) {
  ldmx_log(info) << "LDMXElementaryParticleCollider created";
}

LDMXElementaryParticleCollider::~LDMXElementaryParticleCollider() {
  ldmx_log(info) << "LDMXElementaryParticleCollider destroyed. Statistics:";
  ldmx_log(info) << "  Total collisions: " << collisionCount_;
  ldmx_log(info) << "  Successful: " << successfulCollisions_;
  // No wrapped collider to delete - we call base class directly
}

// NOTE: We do NOT override setNucleusState() because it's not virtual.
// The base class version will be called directly, setting our inherited
// nucleusA/nucleusZ members, which is correct behavior.

void LDMXElementaryParticleCollider::collide(G4InuclParticle* bullet,
                                              G4InuclParticle* target,
                                              G4CollisionOutput& output) {
  ++collisionCount_;

  // Simple confirmation that collide() is being called (first few only)
  if (collisionCount_ <= 3) {
    ldmx_log(info) << "LDMXElementaryParticleCollider::collide() called, count="
                   << collisionCount_;
  }

  // Record collision info BEFORE calling base class
  CollisionInfo info;
  auto* p1 = dynamic_cast<G4InuclElementaryParticle*>(bullet);
  auto* p2 = dynamic_cast<G4InuclElementaryParticle*>(target);

  if (p1 && p2) {
    // Get PDG codes
    info.bulletPdg = getPdgCode(p1->type());
    info.targetPdg = getPdgCode(p2->type());

    // Calculate CM energy
    G4LorentzConvertor conv;
    conv.setBullet(p1);
    conv.setTarget(p2);
    conv.toTheCenterOfMass();
    info.sqrtS = conv.getTotalSCMEnergy();
    info.kinEnergyLab = conv.getKinEnergyInTheTRS();

    // Nucleus state (inherited from base class, set by setNucleusState)
    info.nucleusA = nucleusA;
    info.nucleusZ = nucleusZ;

    // Bullet 4-momentum for matching (Geant4 uses GeV)
    G4LorentzVector mom = p1->getMomentum();
    info.bulletPx = mom.px();
    info.bulletPy = mom.py();
    info.bulletPz = mom.pz();
    info.bulletE = mom.e();
  }

  // Log input if enabled
  if (loggingEnabled_) {
    logCollisionInput(bullet, target);
  }

  // Delegate to BASE CLASS (not a separate wrapped object)
  // This uses our inherited nucleusA/nucleusZ members set by setNucleusState()
  G4ElementaryParticleCollider::collide(bullet, target, output);

  // Track success and record in collision info
  bool succeeded = (output.numberOfOutgoingParticles() > 0);
  info.succeeded = succeeded;
  if (succeeded) {
    ++successfulCollisions_;
  }

  // Store the collision info
  collisionInfo_.push_back(info);

  // Log output if enabled
  if (loggingEnabled_) {
    logCollisionOutput(output);
  }
}

void LDMXElementaryParticleCollider::logCollisionInput(G4InuclParticle* bullet,
                                                        G4InuclParticle* target) {
  auto* p1 = dynamic_cast<G4InuclElementaryParticle*>(bullet);
  auto* p2 = dynamic_cast<G4InuclElementaryParticle*>(target);

  if (!p1 || !p2) {
    ldmx_log(debug) << "Collision #" << collisionCount_
                    << ": non-elementary particles";
    return;
  }

  // Calculate CM energy
  G4LorentzConvertor conv;
  conv.setBullet(p1);
  conv.setTarget(p2);
  conv.toTheCenterOfMass();
  double etot_scm = conv.getTotalSCMEnergy();
  double ekin = conv.getKinEnergyInTheTRS();

  // Access inherited nucleusA/nucleusZ from base class (set by setNucleusState)
  ldmx_log(info) << "Collision #" << collisionCount_ << ": "
                 << getParticleName(p1->type()) << " + " << getParticleName(p2->type())
                 << " @ sqrt(s)=" << etot_scm << " GeV, A=" << nucleusA;
}

void LDMXElementaryParticleCollider::logCollisionOutput(
    const G4CollisionOutput& output) {
  int nOut = output.numberOfOutgoingParticles();
  int nNuclei = output.numberOfOutgoingNuclei();

  if (nOut == 0 && nNuclei == 0) {
    ldmx_log(debug) << "  Result: FAILED (no output)";
    return;
  }

  ldmx_log(debug) << "  Result: " << nOut << " particles, " << nNuclei
                  << " nuclei";

  // Log individual particles at trace level
  const auto& particles = output.getOutgoingParticles();
  for (size_t i = 0; i < particles.size(); ++i) {
    const auto& p = particles[i];
    ldmx_log(trace) << "    [" << i << "] " << getParticleName(p.type())
                    << " E=" << p.getEnergy() << " GeV";
  }
}

void LDMXElementaryParticleCollider::resetStatistics() {
  collisionCount_ = 0;
  successfulCollisions_ = 0;
}

int LDMXElementaryParticleCollider::getPdgCode(int inuclType) const {
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
    default:
      return 0;
  }
}

std::string LDMXElementaryParticleCollider::getParticleName(
    int inuclType) const {
  using namespace G4InuclParticleNames;
  switch (inuclType) {
    case proton:
      return "p";
    case neutron:
      return "n";
    case pionPlus:
      return "pi+";
    case pionMinus:
      return "pi-";
    case pionZero:
      return "pi0";
    case photon:
      return "gamma";
    case kaonPlus:
      return "K+";
    case kaonMinus:
      return "K-";
    case kaonZero:
      return "K0";
    case kaonZeroBar:
      return "K0bar";
    case lambda:
      return "Lambda";
    case sigmaPlus:
      return "Sigma+";
    case sigmaZero:
      return "Sigma0";
    case sigmaMinus:
      return "Sigma-";
    case xiZero:
      return "Xi0";
    case xiMinus:
      return "Xi-";
    case omegaMinus:
      return "Omega-";
    case diproton:
      return "pp";
    case unboundPN:
      return "pn";
    case dineutron:
      return "nn";
    default:
      return "unknown(" + std::to_string(inuclType) + ")";
  }
}

}  // namespace bertini
}  // namespace simcore
