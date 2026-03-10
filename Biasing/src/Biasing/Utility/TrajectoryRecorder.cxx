#include "Biasing/Utility/TrajectoryRecorder.h"

#include "G4Step.hh"
#include "G4StepPoint.hh"
#include "G4Track.hh"
#include "G4TrackStatus.hh"
#include "G4VPhysicalVolume.hh"

#include "SimCore/Event/SimTrajectory.h"
#include "SimCore/G4User/UserTrackInformation.h"

#include <sstream>

namespace {

std::string unwrapProcessName(const std::string& name) {
  if (name.find("biasWrapper") == std::string::npos) return name;

  const auto start = name.find('(');
  const auto end = name.rfind(')');
  if (start == std::string::npos || end == std::string::npos || end <= start) {
    return name;
  }

  return name.substr(start + 1, end - start - 1);
}

template <typename VolumeT>
std::string volumeName(const VolumeT* volume) {
  if (!volume) return "undefined";
  std::ostringstream name;
  name << volume->GetName();
  const auto out = name.str();
  return out.empty() ? "undefined" : out;
}

std::string pointVolumeName(const G4StepPoint* point, const G4Track* track) {
  if (point) {
    const auto& touchable_handle = point->GetTouchableHandle();
    if (touchable_handle) {
      if (auto* volume = touchable_handle->GetVolume()) {
        return volumeName(volume);
      }
    }
  }

  if (track) {
    if (track->GetVolume()) return volumeName(track->GetVolume());
    if (track->GetNextVolume()) return volumeName(track->GetNextVolume());
    if (track->GetLogicalVolumeAtVertex()) {
      return volumeName(track->GetLogicalVolumeAtVertex());
    }
  }

  (void)point;
  return "undefined";
}

bool isWorldVolume(const std::string& volume) { return volume == "World_PV"; }

ldmx::SimTrajectoryPoint makePoint(const G4ThreeVector& position, double time,
                                   const std::string& kind,
                                   const std::string& volume) {
  return ldmx::SimTrajectoryPoint(position.x(), position.y(), position.z(), time,
                                  kind, volume);
}

}  // namespace

namespace biasing::utility {

TrajectoryRecorder::TrajectoryRecorder(
    const std::string& name, framework::config::Parameters& parameters)
    : simcore::UserAction(name, parameters) {
  daughter_min_energy_ = parameters.get<double>("daughter_min_energy", 50.);
}

bool TrajectoryRecorder::isBeamElectron(const G4Track* track) const {
  return track && track->GetTrackID() == 1 && track->GetParentID() == 0 &&
         track->GetParticleDefinition()->GetPDGEncoding() == 11;
}

std::string TrajectoryRecorder::roleForTrack(const G4Track* track) const {
  if (!track) return "";
  if (isBeamElectron(track)) return "beam_electron";

  auto* event_info = getEventInfo();
  auto* track_info = simcore::UserTrackInformation::get(track);

  if (track_info->isPNGamma()) return "hard_brem_gamma";
  if (track_info->isBremCandidate() &&
      track->GetParticleDefinition()->GetPDGEncoding() == 22) {
    return "hard_brem_gamma";
  }

  if (event_info->hasTrajectory(track->GetTrackID())) {
    return event_info->getTrajectoryRole(track->GetTrackID());
  }

  if (track->GetParentID() <= 0) return "";

  const auto creator = processName(track);
  const auto parent_role = event_info->getTrajectoryRole(track->GetParentID());
  if (creator == "photonNuclear" && parent_role == "hard_brem_gamma") {
    return "pn_daughter";
  }

  return "";
}

std::string TrajectoryRecorder::processName(const G4Track* track) const {
  if (!track) return "Primary";
  auto* process = track->GetCreatorProcess();
  if (!process) return "Primary";
  return unwrapProcessName(process->GetProcessName());
}

void TrajectoryRecorder::ensureTrajectory(const G4Track* track,
                                          const std::string& role) const {
  if (!track || role.empty()) return;
  getEventInfo()->upsertTrajectory(track->GetTrackID(), track->GetParentID(),
                                   track->GetParticleDefinition()->GetPDGEncoding(),
                                   role);
}

void TrajectoryRecorder::appendStepPoints(const G4Step* step,
                                          const std::string& role) const {
  if (!step || role.empty()) return;

  auto* track = step->GetTrack();
  auto* event_info = getEventInfo();
  ensureTrajectory(track, role);
  event_info->setTrajectoryRole(track->GetTrackID(), role);

  const auto* pre = step->GetPreStepPoint();
  const auto* post = step->GetPostStepPoint();
  if (!pre || !post) return;
  const auto pre_volume = pointVolumeName(pre, track);
  const auto post_volume = pointVolumeName(post, track);

  if (event_info->trajectoryPointCount(track->GetTrackID()) == 0) {
    event_info->appendTrajectoryPoint(
        track->GetTrackID(),
        makePoint(pre->GetPosition(), pre->GetGlobalTime(), "vertex",
                  pre_volume));
  }

  std::string point_kind = "step";
  if (post->GetStepStatus() == fGeomBoundary || post->GetStepStatus() == fWorldBoundary) {
    point_kind = "boundary";
  }

  const auto* daughters = step->GetSecondaryInCurrentStep();
  const bool has_secondaries = daughters && !daughters->empty();
  if (has_secondaries) {
    point_kind = "interaction";
  }

  if (track->GetTrackStatus() == fStopAndKill ||
      track->GetTrackStatus() == fKillTrackAndSecondaries ||
      post->GetStepStatus() == fWorldBoundary) {
    point_kind = "endpoint";
  }

  // The final world-boundary step can jump all the way to the Geant world
  // limit, which is not useful for detector-focused event display paths.
  if (point_kind == "endpoint" && isWorldVolume(pre_volume) &&
      isWorldVolume(post_volume)) {
    return;
  }

  event_info->appendTrajectoryPoint(
      track->GetTrackID(),
      makePoint(post->GetPosition(), post->GetGlobalTime(), point_kind,
                post_volume));
}

void TrajectoryRecorder::capturePhotonuclearDaughters(const G4Step* step) const {
  if (!step) return;

  auto* parent = step->GetTrack();
  if (!parent) return;

  auto* parent_info = simcore::UserTrackInformation::get(parent);
  if (!parent_info->isPNGamma()) return;

  const auto* daughters = step->GetSecondaryInCurrentStep();
  if (!daughters || daughters->empty()) return;

  for (const auto* daughter : *daughters) {
    if (!daughter) continue;
    if (processName(daughter) != "photonNuclear") continue;
    if (daughter->GetTotalEnergy() < daughter_min_energy_) continue;

    auto* daughter_info = simcore::UserTrackInformation::get(daughter);
    daughter_info->setSaveFlag(true);

    ensureTrajectory(daughter, "pn_daughter");
    getEventInfo()->appendTrajectoryPoint(
        daughter->GetTrackID(),
        makePoint(daughter->GetPosition(), daughter->GetGlobalTime(), "vertex",
                  pointVolumeName(step->GetPostStepPoint(), parent)));
  }
}

void TrajectoryRecorder::stepping(const G4Step* step) {
  if (!step) return;

  auto* track = step->GetTrack();
  if (!track) return;

  const auto role = roleForTrack(track);
  if (role.empty()) return;

  appendStepPoints(step, role);
  if (role == "hard_brem_gamma") capturePhotonuclearDaughters(step);
}

}  // namespace biasing::utility

DECLARE_ACTION(biasing::utility::TrajectoryRecorder)
