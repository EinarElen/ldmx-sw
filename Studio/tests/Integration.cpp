#include "StudioController.h"

#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>
#include <QTextStream>
#include <QTimer>

// Exercise the same controller used by QML, with actual denv processes.
int main(int argc, char** argv) {
  QCoreApplication app(argc, argv);
  StudioController controller;
  const auto args = app.arguments();
  const int workspaceOption = args.indexOf("--workspace");
  if (workspaceOption < 0 || workspaceOption + 1 >= args.size()) {
    QTextStream(stderr) << "Usage: studio-integration --workspace DIRECTORY\n";
    return 2;
  }
  controller.setWorkspace(args[workspaceOption + 1]);
  QVariantMap options{{"mode", "simulate"}, {"events", 2}, {"run", 12001},
                       {"detector", "ldmx-det-v15-8gev"}, {"calorimetry", true}};
  const bool useHooks = args.contains("--hooks");
  const bool useClusters = args.contains("--clusters");
  options["clustering"] = useClusters;
  if (useHooks) options["hooks"] = QVariantList{
      QVariantMap{{"type", "step_trace"}, {"trackId", 1}, {"depth", 0}},
      QVariantMap{{"type", "keep_process"}, {"process", "eBrem"}},
      QVariantMap{{"type", "photonuclear"}}};
  enum Stage { Probe, Simulate, SecondEvent, Reprocess, Cancel, Done };
  Stage stage = Probe;
  bool cancellationRequested = false;
  QString simulationFile, quotedInputFile, reprocessedFile;
  QTimer poll;
  auto fail = [&](const QString& message) {
    poll.stop();
    QTextStream(stderr) << message << "\n" << controller.log()
                        << "\nSession: " << controller.sessionPath() << "\n";
    app.exit(1);
  };
  auto checkEvent = [&](const QString& pass = "studio") {
    if (controller.eventCount() != 2 || controller.hits().isEmpty()) return false;
    bool ecal = false, hcal = false;
    for (const auto& item : controller.event().value("collections").toList()) {
      const auto collection = item.toMap();
      const auto name = collection.value("name").toString();
      ecal |= name == "EcalRecHits_" + pass && collection.value("count").toInt() > 0;
      // An electron shower can legitimately leave the HCal collection empty.
      hcal |= name == "HcalRecHits_" + pass && collection.contains("count");
    }
    bool clusters = !useClusters;
    for (const auto& item : controller.event().value("clusters").toList()) {
      if (item.toMap().value("collection").toString() == "EcalClusters_" + pass)
        clusters = true;
    }
    return ecal && hcal && clusters;
  };
  QObject::connect(&poll, &QTimer::timeout, &app, [&] {
    if (stage == Cancel && controller.busy() && !cancellationRequested &&
        controller.log().contains("Processing 2 Run")) {
      cancellationRequested = true;
      controller.cancel();
    }
    if (controller.busy()) return;
    const auto status = controller.status();
    if (status.startsWith("Failed") || (status != "Complete" &&
        status != "Cancelled" && !status.startsWith("Event "))) {
      fail(status);
      return;
    }
    switch (stage) {
      case Probe:
        QTextStream(stdout) << "Environment probe passed\n" << Qt::flush;
        stage = Simulate;
        controller.run(options);
        break;
      case Simulate:
        // A successful fire job schedules event export on the next event-loop turn.
        if (status == "Complete") return;
        if (!checkEvent()) { fail("Simulation event payload is incomplete"); return; }
        simulationFile = controller.event().value("file").toString();
        if (useHooks) {
          QFile console(QFileInfo(simulationFile).dir().filePath("console.log"));
          if (!console.open(QIODevice::ReadOnly) ||
              !console.readAll().contains("Track ID: 1 Particle currently in:")) {
            fail("StepPrinter did not produce real Geant4 step output"); return;
          }
          QTextStream(stdout) << "G4 hooks loaded; primary-track step output verified\n"
                              << Qt::flush;
        }
        quotedInputFile = simulationFile + " sample 'quoted';.root";
        if (!QFile::copy(simulationFile, quotedInputFile)) {
          fail("Cannot prepare input with spaces and shell punctuation"); return;
        }
        QTextStream(stdout) << "Simulation: " << simulationFile << "\n"
                            << "Entry 1: " << controller.hits().size() << " displayed hits\n"
                            << Qt::flush;
        stage = SecondEvent;
        controller.inspect(quotedInputFile, 1);
        break;
      case SecondEvent:
        if (!checkEvent() || controller.eventIndex() != 1) {
          fail("Second entry was not loaded"); return;
        }
        QTextStream(stdout) << "Entry 2: " << controller.hits().size()
                            << " displayed hits\n" << Qt::flush;
        stage = Reprocess;
        options["mode"] = "reprocess";
        options.remove("hooks");
        options["input"] = quotedInputFile;
        options["inputPass"] = "studio";
        controller.run(options);
        break;
      case Reprocess:
        if (status == "Complete") return;
        if (!checkEvent("studio_reco")) {
          fail("Reprocessing payload is missing reconstructed output hits"); return;
        }
        reprocessedFile = controller.event().value("file").toString();
        QTextStream(stdout) << "Reprocessed: " << reprocessedFile << "\n" << Qt::flush;
        stage = Cancel;
        options["mode"] = "simulate";
        options["events"] = 1000;
        controller.run(options);
        break;
      case Cancel: {
        if (!cancellationRequested || status != "Cancelled") {
          fail("Cancellation did not stop an active simulation"); return;
        }
        QFile result(controller.sessionPath() + "/result.json");
        if (!result.open(QIODevice::ReadOnly) ||
            QJsonDocument::fromJson(result.readAll()).object().value("exitCode").toInt() != 130) {
          fail("Container supervisor did not acknowledge cancellation"); return;
        }
        QTextStream(stdout) << "Container cancellation passed\n"
                            << "REAL_EVENT_FILE=" << simulationFile << "\n"
                            << "REPROCESSED_EVENT_FILE=" << reprocessedFile << "\n"
                            << Qt::flush;
        stage = Done;
        poll.stop();
        app.exit(0);
        break;
      }
      case Done: break;
    }
  });
  QTimer::singleShot(15 * 60 * 1000, &controller, [&] {
    controller.cancel();
    QTextStream(stderr) << "Integration timeout; cancelling the current job\n" << Qt::flush;
    QTimer::singleShot(10000, &app, [&] { fail("Integration timed out"); });
  });
  controller.probe();
  poll.start(100);
  return app.exec();
}
