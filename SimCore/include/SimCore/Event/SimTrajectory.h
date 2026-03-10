#ifndef SIMCORE_EVENT_SIMTRAJECTORY_H
#define SIMCORE_EVENT_SIMTRAJECTORY_H

#include "TObject.h"

#include <cmath>
#include <string>
#include <vector>

namespace ldmx {

class SimTrajectoryPoint {
 public:
  SimTrajectoryPoint() = default;
  virtual ~SimTrajectoryPoint() = default;

  SimTrajectoryPoint(double x, double y, double z, double time,
                     const std::string& kind, const std::string& volume)
      : x_{x}, y_{y}, z_{z}, time_{time}, kind_{kind}, volume_{volume} {}

  double getX() const { return x_; }
  double getY() const { return y_; }
  double getZ() const { return z_; }
  double getTime() const { return time_; }
  const std::string& getKind() const { return kind_; }
  const std::string& getVolume() const { return volume_; }

  bool nearlyEquals(const SimTrajectoryPoint& other,
                    double positionTolerance = 1e-3,
                    double timeTolerance = 1e-6) const {
    return std::abs(x_ - other.x_) < positionTolerance &&
           std::abs(y_ - other.y_) < positionTolerance &&
           std::abs(z_ - other.z_) < positionTolerance &&
           std::abs(time_ - other.time_) < timeTolerance &&
           kind_ == other.kind_;
  }

 private:
  double x_{0.};
  double y_{0.};
  double z_{0.};
  double time_{0.};
  std::string kind_{""};
  std::string volume_{""};

  ClassDef(SimTrajectoryPoint, 1);
};

class SimTrajectory {
 public:
  SimTrajectory() = default;
  virtual ~SimTrajectory() = default;

  int getTrackID() const { return track_id_; }
  int getParentID() const { return parent_id_; }
  int getPdgID() const { return pdg_id_; }
  const std::string& getRole() const { return role_; }
  const std::vector<SimTrajectoryPoint>& getPoints() const { return points_; }

  void setTrackID(int trackID) { track_id_ = trackID; }
  void setParentID(int parentID) { parent_id_ = parentID; }
  void setPdgID(int pdgID) { pdg_id_ = pdgID; }
  void setRole(const std::string& role) { role_ = role; }

  void addPoint(const SimTrajectoryPoint& point) {
    if (!points_.empty() && points_.back().nearlyEquals(point)) return;
    points_.push_back(point);
  }

 private:
  int track_id_{0};
  int parent_id_{0};
  int pdg_id_{0};
  std::string role_{""};
  std::vector<SimTrajectoryPoint> points_{};

  ClassDef(SimTrajectory, 1);
};

}  // namespace ldmx

#endif
