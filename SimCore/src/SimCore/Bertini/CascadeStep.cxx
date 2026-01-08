/**
 * @file CascadeStep.cxx
 * @brief Implementation of CascadeStep class
 */

#include "SimCore/Bertini/CascadeStep.h"

#include <cmath>

namespace ldmx {

void CascadeStep::clear() {
  historyId_ = -1;
  parentId_ = -1;
  pdgId_ = 0;
  px_ = 0;
  py_ = 0;
  pz_ = 0;
  energy_ = 0;
  x_ = 0;
  y_ = 0;
  z_ = 0;
  generation_ = 0;
  zone_ = 0;
  path_ = 0;
  daughterIds_.clear();
  targetPdgId_ = 0;
  interacted_ = false;
  escaped_ = false;
  stage_ = CascadeStage::UNKNOWN;
  // Collision info from wrapper collider
  sqrtS_ = 0;
  targetPdgDirect_ = 0;
  nucleusA_ = 0;
  nucleusZ_ = 0;
  kinEnergyLab_ = 0;
  collisionSucceeded_ = true;
  biasWeight_ = 1.0;
}

double CascadeStep::getKineticEnergy() const {
  double mass = getMass();
  return energy_ - mass;
}

double CascadeStep::getMass() const {
  double p2 = px_ * px_ + py_ * py_ + pz_ * pz_;
  double m2 = energy_ * energy_ - p2;
  return m2 > 0 ? std::sqrt(m2) : 0;
}

}  // namespace ldmx
