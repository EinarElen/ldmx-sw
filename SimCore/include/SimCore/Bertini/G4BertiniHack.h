/**
 * @file G4BertiniHack.h
 * @brief Preprocessor hacks to access private Geant4 Bertini cascade internals
 *
 * WARNING: This file uses preprocessor hacks to make private members accessible
 * for derivation. This is fragile and may break with Geant4 updates.
 *
 * The LDMX simulation uses a modified Geant4 10.2.3 from ~/ldmx/geant4-ldmx.
 * This hack is specifically designed for that version.
 *
 * Usage:
 *   #include "SimCore/Bertini/G4BertiniHack.h"
 *   // Now you can derive from G4CascadeInterface and access internal members
 *   // from within member functions of the derived class.
 */

#ifndef SIMCORE_BERTINI_G4BERTINIHACK_H
#define SIMCORE_BERTINI_G4BERTINIHACK_H

// CRITICAL: Include ALL standard library headers that Geant4 might use
// BEFORE applying the hack. Otherwise the hack affects std:: internals.
#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <deque>
#include <fstream>
#include <iomanip>
#include <ios>
#include <iostream>
#include <limits>
#include <list>
#include <map>
#include <memory>
#include <set>
#include <sstream>
#include <stack>
#include <string>
#include <utility>
#include <vector>

// Also include CLHEP headers before the hack since they're used by Geant4
#include "CLHEP/Units/PhysicalConstants.h"
#include "CLHEP/Units/SystemOfUnits.h"
#include "CLHEP/Vector/LorentzVector.h"
#include "CLHEP/Vector/ThreeVector.h"

// Include Geant4 base headers that don't need hacking
#include "G4LorentzVector.hh"
#include "G4ThreeVector.hh"
#include "globals.hh"

// ============================================================================
// BEGIN HACK: make private AND protected members accessible as public
// ============================================================================
// We need public (not protected) because protected members are only accessible
// from derived classes of that SPECIFIC class. When we have:
//   G4CascadeInterface::collider (G4InuclCollider*)
// and want to access:
//   collider->theIntraNucleiCascader
// we need theIntraNucleiCascader to be public, since G4CascadeInterface
// doesn't inherit from G4InuclCollider.
//
// We also need to hack 'protected' because some members like
// G4CascadeHistory::HistoryEntry are declared protected, not private.
#define private public
#define protected public

// Include the Geant4 Bertini cascade headers we need to hack
// Order matters: include base classes before derived classes
#include "G4CascadParticle.hh"
#include "G4CascadeHistory.hh"
#include "G4CollisionOutput.hh"
#include "G4ElementaryParticleCollider.hh"
#include "G4IntraNucleiCascader.hh"
#include "G4InuclCollider.hh"
#include "G4InuclElementaryParticle.hh"
#include "G4InuclNuclei.hh"
#include "G4NucleiModel.hh"

// Include the main interface last
#include "G4CascadeInterface.hh"

// ============================================================================
// END HACK: restore private and protected keywords
// ============================================================================
#undef private
#undef protected

#endif  // SIMCORE_BERTINI_G4BERTINIHACK_H
