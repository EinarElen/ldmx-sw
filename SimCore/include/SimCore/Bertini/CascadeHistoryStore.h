/**
 * @file CascadeHistoryStore.h
 * @brief Thread-local storage for cascade histories during simulation
 *
 * This class provides storage for cascade histories that are captured
 * during Geant4 stepping and retrieved during event finalization.
 */

#ifndef SIMCORE_BERTINI_CASCADEHISTORYSTORE_H
#define SIMCORE_BERTINI_CASCADEHISTORYSTORE_H

#include <map>

#include "SimCore/Bertini/CascadeHistory.h"

namespace simcore {
namespace bertini {

/**
 * @class CascadeHistoryStore
 * @brief Singleton storage for cascade histories during a simulation event
 *
 * This class stores cascade histories keyed by the track ID of the photon
 * that initiated each photonuclear interaction. It uses thread-local storage
 * to be safe in multi-threaded Geant4 simulations.
 *
 * Usage:
 *   During stepping (from LDMXCascadeInterface):
 *     CascadeHistoryStore::getInstance().addHistory(trackId, history);
 *
 *   During event finalization:
 *     auto histories = CascadeHistoryStore::getInstance().extractHistories();
 *     event.add("PhotonuclearCascadeHistories", histories);
 *
 *   After extracting (or at begin of event):
 *     CascadeHistoryStore::getInstance().clear();
 */
class CascadeHistoryStore {
 public:
  /**
   * Get the thread-local instance
   */
  static CascadeHistoryStore& getInstance();

  /**
   * Clear all stored histories
   * Should be called at the beginning of each event
   */
  void clear() { histories_.clear(); }

  /**
   * Add a cascade history for a given track ID
   * @param trackId The G4 track ID of the initiating photon
   * @param history The cascade history to store
   */
  void addHistory(int trackId, ldmx::CascadeHistory history);

  /**
   * Check if any histories have been recorded
   */
  bool empty() const { return histories_.empty(); }

  /**
   * Get the number of recorded histories
   */
  size_t size() const { return histories_.size(); }

  /**
   * Get all histories (const reference)
   */
  const std::map<int, ldmx::CascadeHistory>& getHistories() const {
    return histories_;
  }

  /**
   * Extract and move all histories out
   * Clears the store after extraction
   */
  std::map<int, ldmx::CascadeHistory> extractHistories();

  /**
   * Check if history exists for a specific track ID
   */
  bool hasHistory(int trackId) const {
    return histories_.find(trackId) != histories_.end();
  }

  /**
   * Get history for a specific track ID (nullptr if not found)
   */
  const ldmx::CascadeHistory* getHistory(int trackId) const;

 private:
  CascadeHistoryStore() = default;
  ~CascadeHistoryStore() = default;

  // Non-copyable
  CascadeHistoryStore(const CascadeHistoryStore&) = delete;
  CascadeHistoryStore& operator=(const CascadeHistoryStore&) = delete;

  /** Map from track ID to cascade history */
  std::map<int, ldmx::CascadeHistory> histories_;
};

}  // namespace bertini
}  // namespace simcore

#endif  // SIMCORE_BERTINI_CASCADEHISTORYSTORE_H
