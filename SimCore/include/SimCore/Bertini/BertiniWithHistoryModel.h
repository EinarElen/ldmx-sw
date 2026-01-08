/**
 * @file BertiniWithHistoryModel.h
 * @brief Photonuclear model that captures Bertini cascade history
 *
 * This model replaces the default Bertini cascade with LDMXCascadeInterface,
 * which captures the internal cascade history for each photonuclear
 * interaction.
 */

#ifndef SIMCORE_BERTINI_BERTINIWITHHISTORYMODEL_H
#define SIMCORE_BERTINI_BERTINIWITHHISTORYMODEL_H

#include "Framework/Configure/Parameters.h"
#include "Framework/Logger.h"
#include "SimCore/PhotoNuclearModels/PhotoNuclearModel.h"

class G4ProcessManager;

namespace simcore {
namespace bertini {

class LDMXCascadeInterface;

/**
 * @class BertiniWithHistoryModel
 * @brief PhotoNuclear model that records Bertini cascade history
 *
 * This model uses LDMXCascadeInterface instead of the default
 * G4CascadeInterface to capture the internal cascade history for each
 * photonuclear interaction.
 *
 * The captured histories are stored in CascadeHistoryStore and can be retrieved
 * during event finalization to be added to the event output.
 *
 * Python configuration:
 * @code
 * from LDMX.SimCore import photonuclear_models
 * sim.photonuclear_model = photonuclear_models.BertiniWithHistoryModel()
 * @endcode
 */
class BertiniWithHistoryModel : public PhotoNuclearModel {
 public:
  /**
   * Constructor
   * @param name Instance name
   * @param parameters Python configuration parameters
   */
  BertiniWithHistoryModel(const std::string& name,
                          const framework::config::Parameters& parameters);

  virtual ~BertiniWithHistoryModel() = default;

  /**
   * Construct the photonuclear process with history-capturing cascade
   * @param processManager The G4Gamma process manager
   */
  void constructGammaProcess(G4ProcessManager* processManager) override;

 private:
  /** Maximum energy for the model [MeV] */
  double max_energy_{15000.0};  // 15 GeV default

  /** Whether to record history (can be disabled for performance) */
  bool record_history_{true};

  /**
   * Minimum photon energy to record history [MeV]
   * Only cascades initiated by photons above this energy will be recorded.
   * Default: 5000 MeV (5 GeV), matching typical ECal PN bias threshold.
   */
  double energy_threshold_{5000.0};

  enableLogging("BertiniWithHistoryModel")
};

}  // namespace bertini
}  // namespace simcore

#endif  // SIMCORE_BERTINI_BERTINIWITHHISTORYMODEL_H
