#include "RunConfig.h"

#include <QDir>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QRegularExpression>
#include <QSet>
#include <cmath>

namespace studio {
namespace {
bool integerInRange(const QVariant& value, int minimum, int maximum) {
  bool valid = false;
  const double number = value.toDouble(&valid);
  return valid && std::isfinite(number) && std::floor(number) == number &&
         number >= minimum && number <= maximum;
}

QString hooksError(const QVariantMap& options) {
  if (!options.contains("hooks")) return {};
  if (options.value("hooks").metaType() != QMetaType::fromType<QVariantList>())
    return "G4 hooks must be a list of building blocks.";
  const auto hooks = options.value("hooks").toList();
  if (!hooks.isEmpty() && options.value("mode") != "simulate")
    return "G4 hooks run during simulation and cannot be applied to existing events.";
  QSet<QString> seen;
  for (const auto& value : hooks) {
    const auto hook = value.toMap();
    const auto type = hook.value("type").toString();
    if (seen.contains(type)) return "Enable each G4 hook only once.";
    seen.insert(type);
    QSet<QString> fields{"type"};
    if (type == "step_trace") {
      fields.unite({"trackId", "depth"});
      if (!integerInRange(hook.value("trackId"), 1, 2147483647) ||
          !integerInRange(hook.value("depth"), 0, 3))
        return "Step tracing needs a positive track ID and descendant depth from 0 to 3.";
    } else if (type == "keep_process") {
      fields.insert("process");
      const QStringList processes{"eBrem", "conv", "photonNuclear", "electronNuclear"};
      if (!processes.contains(hook.value("process").toString()))
        return "Choose a supported creator process for track retention.";
    } else if (type != "photonuclear") {
      return "Unknown G4 hook building block.";
    }
    for (auto it = hook.cbegin(); it != hook.cend(); ++it) {
      if (!fields.contains(it.key())) return "Unknown parameter in a G4 hook.";
    }
  }
  return {};
}

QString generateHooks(const QVariantList& hooks) {
  if (hooks.isEmpty()) return {};
  QString config =
      "# G4 user hooks: diagnostics and persistence, in recipe order.\n"
      "from LDMX.Biasing import util as g4_util\n"
      "from LDMX.SimCore import user_actions as g4_actions\n\n"
      "sim.actions = [\n";
  for (const auto& value : hooks) {
    const auto hook = value.toMap();
    const auto type = hook.value("type").toString();
    if (type == "step_trace") {
      config += QString("    g4_util.StepPrinter(track_id=%1, depth=%2),\n")
                    .arg(hook.value("trackId").toInt()).arg(hook.value("depth").toInt());
    } else if (type == "keep_process") {
      config += "    g4_util.TrackProcessFilter(process=" +
                pythonString(hook.value("process").toString()) + "),\n";
    } else if (type == "photonuclear") {
      config += "    g4_actions.PhotonuclearTracker(),\n";
    }
  }
  return config + "]\n\n";
}
}  // namespace

QString pythonString(const QString& value) {
  // JSON string literals are also Python string literals.
  const auto json = QJsonDocument(QJsonArray{value}).toJson(QJsonDocument::Compact);
  return QString::fromUtf8(json.mid(1, json.size() - 2));
}

bool isInside(const QString& file, const QString& directory) {
  const auto root = QFileInfo(directory).canonicalFilePath();
  const auto path = QFileInfo(file).canonicalFilePath();
  return !root.isEmpty() && !path.isEmpty() &&
         path.startsWith(root + QDir::separator());
}

QString configError(const QVariantMap& o) {
  const auto mode = o.value("mode").toString();
  if (mode != "simulate" && mode != "reprocess")
    return "Choose a simulation or reprocessing recipe.";
  bool valid = false;
  const int events = o.value("events").toInt(&valid);
  if (!valid || events < 1 || events > 10000)
    return "Choose between 1 and 10,000 events.";
  const int run = o.value("run").toInt(&valid);
  if (!valid || run < 1)
    return "The run number must be a positive integer.";
  const auto detector = o.value("detector").toString();
  if (detector != "ldmx-det-v15-8gev")
    return "This first recipe supports ldmx-det-v15-8gev.";
  if (o.value("clustering").toBool() && mode == "simulate" && !o.value("calorimetry").toBool())
    return "Calorimeter clustering requires digitization and reconstruction.";
  if (mode == "reprocess") {
    if (o.value("input").toString().isEmpty())
      return "Choose an existing ROOT event file.";
    if (!QRegularExpression("^[A-Za-z][A-Za-z0-9_]*$")
             .match(o.value("inputPass").toString()).hasMatch())
      return "Specify the simulation pass name (for example: studio or sim).";
    if (o.value("inputPass").toString() == "studio_reco")
      return "Choose a simulation pass, not the output pass studio_reco.";
  }
  return hooksError(o);
}

QString generateConfig(const QVariantMap& o) {
  if (!configError(o).isEmpty()) return {};
  const bool simulation = o.value("mode") == "simulate";
  QString config =
      "# Generated by LDMX Studio. Run with: denv fire config.py\n"
      "# Run number controls the default LDMX random-number seed service.\n"
      "from LDMX.Framework import ldmxcfg\n\n"
      "p = ldmxcfg.Process(%1)\n"
      "p.max_events = %2\n"
      "p.run = %3\n"
      "p.log_frequency = 1\n"
      "p.output_files = [\"events.root\"]\n"
      "p.histogram_file = \"histograms.root\"\n"
      "p.logger.term_level = 1\n\n";
  config = config.arg(pythonString(simulation ? "studio" : "studio_reco"))
               .arg(o.value("events").toInt()).arg(o.value("run").toInt());
  if (simulation) {
    config +=
        "from LDMX.SimCore import simulator, generators\n\n"
        "sim = simulator.Simulator(instance_name=\"studio_sim\")\n"
        "sim.set_detector(\"ldmx-det-v15-8gev\", "
        "include_scoring_planes_minimal=True)\n"
        "sim.generators = [generators.single_8gev_e_upstream_tagger()]\n"
        "sim.description = \"LDMX Studio: 8 GeV electron beam\"\n"
        "p.sequence = [sim]\n\n";
    config += generateHooks(o.value("hooks").toList());
  } else {
    config += "p.input_files = [" + pythonString(o.value("input").toString()) +
              "]\np.sequence = []\n\n";
  }
  if (!simulation || o.value("calorimetry").toBool()) {
    const QString pass = pythonString(simulation ? "studio" :
                                     o.value("inputPass").toString());
    const QString outputPass = pythonString(simulation ? "studio" : "studio_reco");
    config +=
        "# v15 calorimeter digitization and reconstruction\n"
        "import LDMX.Ecal.ecal_geometry\n"
        "import LDMX.Ecal.ecal_hardcoded_conditions\n"
        "import LDMX.Hcal.hcal_geometry\n"
        "import LDMX.Hcal.hcal_hardcoded_conditions\n"
        "from LDMX.Ecal import digi as ecal\n"
        "from LDMX.Hcal import digi as hcal\n\n"
        "ecal_digi = ecal.EcalDigiProducer()\n"
        "ecal_reco = ecal.EcalRecProducer()\n"
        "hcal_digi = hcal.HcalDigiProducer()\n"
        "hcal_reco = hcal.HcalRecProducer()\n"
        "ecal_digi.input_pass_name = " + pass + "\n"
        "ecal_reco.digi_pass_name = " + outputPass + "\n"
        "ecal_reco.sim_hit_pass_name = " + pass + "\n"
        "hcal_digi.input_pass_name = " + pass + "\n"
        "hcal_reco.input_pass_name = " + outputPass + "\n"
        "hcal_reco.sim_hit_pass_name = " + pass + "\n"
        "p.sequence.extend([ecal_digi, ecal_reco, hcal_digi, hcal_reco])\n";
    if (o.value("clustering").toBool()) {
      config +=
          "\nfrom LDMX.Ecal.ecal_clusters import EcalClusterProducer\n"
          "from LDMX.Hcal.hcal import HcalClusterProducer\n"
          "ecal_clusters = EcalClusterProducer()\n"
          "ecal_clusters.algorithm = \"clue3d\"\n"
          "ecal_clusters.rec_hit_pass_name = " + outputPass + "\n"
          "hcal_clusters = HcalClusterProducer()\n"
          "hcal_clusters.hcal_hits_pass_name = " + outputPass + "\n"
          "p.sequence.extend([ecal_clusters, hcal_clusters])\n";
    }
  }
  return config;
}
}
