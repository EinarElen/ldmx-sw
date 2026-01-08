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

  /**
   * Whether to use the LDMX wrapper collider with logging
   * When enabled, replaces the G4ElementaryParticleCollider with
   * LDMXElementaryParticleCollider which logs collision details.
   * Default: false (use standard Bertini collider)
   */
  bool useWrapperCollider_{false};

  // --- Kaon biasing parameters ---

  /**
   * Whether to enable kaon production biasing via rejection sampling.
   * When enabled, non-kaon-producing collisions may be rejected and
   * regenerated, effectively enhancing kaon production.
   * Default: false
   */
  bool useKaonBiasing_{false};

  /**
   * Kaon bias enhancement factor.
   * Values > 1 enhance kaon production.
   * Example: factor = 10 means non-kaon events accepted with probability 1/10.
   * Default: 1.0 (no bias)
   */
  double kaonBiasFactor_{1.0};

  /**
   * Minimum projectile (photon) energy for kaon biasing [MeV].
   * Kaon biasing is only applied for photonuclear interactions
   * initiated by photons with energy above this threshold.
   * Default: 2000 MeV (2 GeV, near kaon production threshold)
   */
  double kaonBiasThreshold_{2000.0};

  /**
   * Maximum projectile (photon) energy for kaon biasing [MeV].
   * Above this energy, biasing may not be needed (kaons produced naturally).
   * Set to a very high value to effectively disable upper limit.
   * Default: 10000 MeV (10 GeV)
   */
  double kaonBiasMaxPhotonEnergy_{10000.0};

  /**
   * Maximum regeneration attempts for rejection sampling.
   * If exceeded, accept the last collision with appropriate weight.
   * Default: 100
   */
  int kaonBiasMaxAttempts_{100};

  enableLogging("BertiniWithHistoryModel")
};

}  // namespace bertini
}  // namespace simcore

#endif  // SIMCORE_BERTINI_BERTINIWITHHISTORYMODEL_H
