#ifndef BIASING_UTILITY_TRAJECTORYRECORDER_H
#define BIASING_UTILITY_TRAJECTORYRECORDER_H

#include "SimCore/G4User/UserAction.h"

namespace biasing::utility {

class TrajectoryRecorder : public simcore::UserAction {
 public:
  TrajectoryRecorder(const std::string& name,
                     framework::config::Parameters& parameters);

  ~TrajectoryRecorder() override = default;

  void stepping(const G4Step* step) override;

  std::vector<simcore::TYPE> getTypes() override {
    return {simcore::TYPE::STEPPING};
  }

 private:
  bool isBeamElectron(const G4Track* track) const;
  std::string roleForTrack(const G4Track* track) const;
  std::string processName(const G4Track* track) const;
  void ensureTrajectory(const G4Track* track, const std::string& role) const;
  void appendStepPoints(const G4Step* step, const std::string& role) const;
  void capturePhotonuclearDaughters(const G4Step* step) const;

 private:
  double daughter_min_energy_{50.};
};

}  // namespace biasing::utility

#endif
