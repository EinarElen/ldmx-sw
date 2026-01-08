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
}

void BertiniWithHistoryModel::constructGammaProcess(
    G4ProcessManager* processManager) {
  ldmx_log(info) << "BertiniWithHistoryModel::constructGammaProcess called";
  ldmx_log(info) << "  Recording history: " << (recordHistory_ ? "YES" : "NO");
  ldmx_log(info) << "  Max energy: " << maxEnergy_ << " MeV";
  ldmx_log(info) << "  Energy threshold: " << energyThreshold_ << " MeV";

  // Create the photonuclear process
  auto photoNuclearProcess = new G4HadronInelasticProcess(
      "photonNuclear", G4Gamma::Definition());

  // Create our custom cascade interface with history capture
  auto model = new LDMXCascadeInterface("LDMXBertiniWithHistory");
  model->setRecordHistory(recordHistory_);
  model->setEnergyThreshold(energyThreshold_);
  model->SetMaxEnergy(maxEnergy_ * CLHEP::MeV);

  ldmx_log(info) << "  Created LDMXCascadeInterface model";

  // Add cross section data (uses base class implementation)
  addPNCrossSectionData(photoNuclearProcess);

  // Register our model with the process
  photoNuclearProcess->RegisterMe(model);

  // Add the process to the gamma's process manager
  processManager->AddDiscreteProcess(photoNuclearProcess);

  ldmx_log(info) << "  Photonuclear process added to gamma";
}

}  // namespace bertini
}  // namespace simcore

// Register the model with the factory
DECLARE_PHOTONUCLEAR_MODEL(simcore::bertini::BertiniWithHistoryModel);
