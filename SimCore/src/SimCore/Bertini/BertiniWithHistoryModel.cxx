/**
 * @file BertiniWithHistoryModel.cxx
 * @brief Implementation of BertiniWithHistoryModel
 */

#include "SimCore/Bertini/BertiniWithHistoryModel.h"

#include <G4Gamma.hh>
#include <G4HadronInelasticProcess.hh>
#include <G4ProcessManager.hh>

#include "SimCore/Bertini/LDMXCascadeInterface.h"

namespace simcore {
namespace bertini {

BertiniWithHistoryModel::BertiniWithHistoryModel(
    const std::string& name, const framework::config::Parameters& parameters)
    : PhotoNuclearModel{name, parameters} {
  // Get configuration parameters with defaults
  maxEnergy_ =
      parameters.getParameter<double>("max_energy", 15000.0);  // 15 GeV
  recordHistory_ = parameters.getParameter<bool>("record_history", true);
  // Default threshold matches ECal PN bias threshold (0.625 * 8 GeV = 5 GeV)
  energyThreshold_ =
      parameters.getParameter<double>("energy_threshold", 5000.0);  // 5 GeV
  // Wrapper collider for logging/debugging (disabled by default)
  useWrapperCollider_ =
      parameters.getParameter<bool>("use_wrapper_collider", false);

  // Kaon biasing parameters
  useKaonBiasing_ = parameters.getParameter<bool>("use_kaon_biasing", false);
  kaonBiasFactor_ = parameters.getParameter<double>("kaon_bias_factor", 1.0);
  kaonBiasThreshold_ =
      parameters.getParameter<double>("kaon_bias_threshold", 2000.0);  // 2 GeV
  kaonBiasMaxPhotonEnergy_ =
      parameters.getParameter<double>("kaon_bias_max_energy", 10000.0);  // 10 GeV
  kaonBiasMaxAttempts_ =
      parameters.getParameter<int>("kaon_bias_max_attempts", 100);
}

void BertiniWithHistoryModel::constructGammaProcess(
    G4ProcessManager* processManager) {
  ldmx_log(info) << "BertiniWithHistoryModel::constructGammaProcess called";
  ldmx_log(info) << "  Recording history: " << (recordHistory_ ? "YES" : "NO");
  ldmx_log(info) << "  Max energy: " << maxEnergy_ << " MeV";
  ldmx_log(info) << "  Energy threshold: " << energyThreshold_ << " MeV";
  ldmx_log(info) << "  Use wrapper collider: "
                 << (useWrapperCollider_ ? "YES" : "NO");

  // Create the photonuclear process
  auto photo_nuclear_process =
      new G4HadronInelasticProcess("photonNuclear", G4Gamma::Definition());

  // Create our custom cascade interface with history capture
  auto model = new LDMXCascadeInterface("LDMXBertiniWithHistory");
  model->setRecordHistory(recordHistory_);
  model->setEnergyThreshold(energyThreshold_);
  model->SetMaxEnergy(maxEnergy_ * CLHEP::MeV);

  // Enable wrapper collider if requested (for logging/debugging)
  // Note: Kaon biasing implies wrapper collider
  if (useWrapperCollider_ || useKaonBiasing_) {
    model->enableWrapperCollider();
    ldmx_log(info) << "  Enabled LDMX wrapper collider";
  }

  // Enable kaon biasing if requested
  if (useKaonBiasing_) {
    model->enableKaonBiasing(kaonBiasFactor_);
    model->setKaonBiasPhotonEnergyRange(kaonBiasThreshold_,
                                         kaonBiasMaxPhotonEnergy_);
    model->setKaonBiasMaxAttempts(kaonBiasMaxAttempts_);
    ldmx_log(info) << "  Enabled kaon biasing with factor " << kaonBiasFactor_;
    ldmx_log(info) << "    Energy range: [" << kaonBiasThreshold_ << ", "
                   << kaonBiasMaxPhotonEnergy_ << "] MeV";
    ldmx_log(info) << "    Max attempts: " << kaonBiasMaxAttempts_;
  }

  ldmx_log(info) << "  Created LDMXCascadeInterface model";

  // Add cross section data (uses base class implementation)
  addPNCrossSectionData(photo_nuclear_process);

  // Register our model with the process
  photo_nuclear_process->RegisterMe(model);

  // Add the process to the gamma's process manager
  processManager->AddDiscreteProcess(photo_nuclear_process);

  ldmx_log(info) << "  Photonuclear process added to gamma";
}

}  // namespace bertini
}  // namespace simcore

// Register the model with the factory
DECLARE_PHOTONUCLEAR_MODEL(simcore::bertini::BertiniWithHistoryModel);
