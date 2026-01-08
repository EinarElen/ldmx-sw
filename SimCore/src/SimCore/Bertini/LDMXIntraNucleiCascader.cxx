/**
 * @file LDMXIntraNucleiCascader.cxx
 * @brief Implementation of LDMXIntraNucleiCascader
 */

#include "SimCore/Bertini/LDMXIntraNucleiCascader.h"

#include "G4InuclParticleNames.hh"

namespace simcore {
namespace bertini {

LDMXIntraNucleiCascader::LDMXIntraNucleiCascader()
    : G4IntraNucleiCascader(), recordHistory_{true}, incidentTrackId_{-1} {}

LDMXIntraNucleiCascader::~LDMXIntraNucleiCascader() = default;

void LDMXIntraNucleiCascader::collide(G4InuclParticle* bullet,
                                      G4InuclParticle* target,
                                      G4CollisionOutput& globalOutput) {
  // Clear previous history
  lastHistory_.clear();

  // Call base class to perform the actual cascade
  G4IntraNucleiCascader::collide(bullet, target, globalOutput);

  // Capture the history if recording is enabled
  if (recordHistory_ && theCascadeHistory) {
    captureHistory();
  }
}

void LDMXIntraNucleiCascader::captureHistory() {
  // Access the internal history through the hacked protected member
  // theCascadeHistory is G4CascadeHistory* (made accessible via hack)

  if (!theCascadeHistory) {
    return;
  }

  // Set metadata
  lastHistory_.setIncidentTrackId(incidentTrackId_);

  // Get target nucleus info from the model (also hacked accessible)
  if (tnuclei) {
    lastHistory_.setTargetNucleus(tnuclei->getA(), tnuclei->getZ());
  }

  // Access the history entries
  // G4CascadeHistory has:
  //   protected struct HistoryEntry { G4CascadParticle cpart; G4int n; G4int
  //   dId[10]; } protected std::vector<HistoryEntry> theHistory;
  //
  // But theHistory is private, so we need another approach.
  // Actually, looking at G4CascadeHistory.hh:
  //   - HistoryEntry is protected (line 64-72)
  //   - theHistory is private (line 95)
  //
  // With our hack, private becomes protected, so we can access it.

  // Get the size - G4CascadeHistory::size() is protected
  const int numEntries = theCascadeHistory->size();

  lastHistory_.reserve(numEntries);

  // We need to iterate through the history entries
  // The hack makes theHistory accessible as protected
  // G4CascadeHistory inherits nothing, so we can cast to access internals

  // Access theHistory vector directly via the hack
  // theHistory is now protected due to #define private protected
  const auto& historyEntries = theCascadeHistory->theHistory;

  // Build a map of parent IDs for each entry
  // The parent of entry i is the entry whose daughter list contains i
  std::vector<int> parentIds(numEntries, -1);

  for (int i = 0; i < numEntries; ++i) {
    const auto& entry = historyEntries[i];
    // For each daughter of this entry, set its parent to this entry's ID
    for (int d = 0; d < entry.n && d < 10; ++d) {
      int daughterId = entry.dId[d];
      if (daughterId >= 0 && daughterId < numEntries) {
        parentIds[daughterId] = i;
      }
    }
  }

  // Now convert each entry to a CascadeStep
  for (int i = 0; i < numEntries; ++i) {
    const auto& entry = historyEntries[i];
    const G4CascadParticle& cpart = entry.cpart;

    // Collect daughter IDs
    std::vector<int> daughterIds;
    for (int d = 0; d < entry.n && d < 10; ++d) {
      daughterIds.push_back(entry.dId[d]);
    }

    // Determine if particle interacted (has daughters)
    bool interacted = (entry.n > 0);

    // Determine if particle escaped
    // A particle escaped if it has no daughters and made it to the output
    // This is a simplification - the actual escape status would need to
    // be tracked more carefully through the cascade logic
    bool escaped = !interacted;  // Simplified: non-interacting = escaped

    ldmx::CascadeStep step =
        convertStep(cpart, parentIds[i], daughterIds, interacted, escaped);

    lastHistory_.addStep(std::move(step));
  }
}

ldmx::CascadeStep LDMXIntraNucleiCascader::convertStep(
    const G4CascadParticle& cpart, int parentId,
    const std::vector<int>& daughterIds, bool interacted, bool escaped) const {
  ldmx::CascadeStep step;

  const G4InuclElementaryParticle& particle = cpart.getParticle();

  // Set IDs
  step.setHistoryId(cpart.getHistoryId());
  step.setParentId(parentId);

  // Convert Bertini type code to PDG
  step.setPdgId(getPdgCode(particle.type()));

  // Get 4-momentum [Geant4 uses GeV internally, we store in MeV]
  G4LorentzVector mom = cpart.getMomentum();
  step.setMomentum(mom.px() * 1000.0,  // GeV -> MeV
                   mom.py() * 1000.0, mom.pz() * 1000.0, mom.e() * 1000.0);

  // Get position in nucleus [fm]
  const G4ThreeVector& pos = cpart.getPosition();
  step.setPosition(pos.x(), pos.y(), pos.z());

  // Cascade tracking info
  step.setGeneration(cpart.getGeneration());
  step.setZone(cpart.getCurrentZone());
  step.setPath(cpart.getCurrentPath());

  // Daughters
  step.setDaughterIds(daughterIds);

  // Flags
  step.setInteracted(interacted);
  step.setEscaped(escaped);

  // Target nucleon - we don't have direct access to this from the history
  // Would need to track it through the model if needed
  step.setTargetPdgId(0);

  return step;
}

int LDMXIntraNucleiCascader::getPdgCode(int inuclType) const {
  // Convert Bertini internal type codes to PDG codes
  // Based on G4InuclParticleNames.hh definitions:
  //   proton=1, neutron=2, pi+=3, pi-=5, pi0=7, photon=9, etc.
  // We use manual mapping since G4InuclElementaryParticle::makeDefinition
  // is protected and not accessible even from derived classes.
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
    case electron:
      return 11;
    case positron:
      return -11;
    case muonMinus:
      return 13;
    case muonPlus:
      return -13;
    case deuteron:
      return 1000010020;
    case triton:
      return 1000010030;
    case He3:
      return 1000020030;
    case alpha:
      return 1000020040;
    default:
      return 0;  // Unknown
  }
}

}  // namespace bertini
}  // namespace simcore
