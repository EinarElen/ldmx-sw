#include <QCommandLineParser>
#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQuickStyle>
#include <QQuickWindow>
#include <QTimer>
#include <QTextStream>
#include <QDir>
#include <QTemporaryDir>
#include <memory>

#include "StudioController.h"
#ifdef STUDIO_BUILD_TESTING
#include "../tests/WorkbenchCheck.h"
#endif

int main(int argc, char* argv[]) {
  QGuiApplication app(argc, argv);
  app.setApplicationName("ldmx-studio");
  app.setOrganizationName("LDMX");
  QQuickStyle::setStyle("Basic");
  QCommandLineParser parser;
  parser.setApplicationDescription("Native LDMX simulation workbench");
  parser.addHelpOption();
  parser.addOption({"workspace", "denv workspace directory", "directory"});
  parser.addOption({"screenshot", "Save the rendered window and exit (UI smoke test)", "path"});
  parser.addOption({"example", "Display explicitly synthetic example hits"});
  parser.addOption({"open-event", "Open a ROOT event file through denv", "file"});
  parser.addOption({"entry", "Zero-based event entry to open", "index", "0"});
  parser.addOption({"page", "Workspace document: study, recipe, runs, analysis", "name"});
#ifdef STUDIO_BUILD_TESTING
  parser.addOption({"check-workbench", "Run isolated native UI interaction checks"});
#endif
  parser.process(app);
  std::unique_ptr<QTemporaryDir> testWorkspace;
#ifdef STUDIO_BUILD_TESTING
  if (parser.isSet("check-workbench")) {
    if (parser.isSet("workspace")) return 2;
    testWorkspace = std::make_unique<QTemporaryDir>();
    if (!testWorkspace->isValid() || !QDir::setCurrent(testWorkspace->path())) return 2;
  }
#endif
  QQmlApplicationEngine engine;
  QObject::connect(&engine, &QQmlApplicationEngine::objectCreationFailed,
                   &app, [] { QCoreApplication::exit(1); }, Qt::QueuedConnection);
  engine.loadFromModule("LdmxStudio", "Main");
  if (engine.rootObjects().isEmpty()) return 1;
  auto* window = qobject_cast<QQuickWindow*>(engine.rootObjects().first());
  auto* controller = window->findChild<StudioController*>("studioController");
  const QStringList pages{"study", "recipe", "runs", "analysis"};
  const int page = pages.indexOf(parser.value("page"));
  if (parser.isSet("page") && page < 0) return 2;
  if (page >= 0) window->setProperty("page", page);
  auto capture = [&] {
    if (page >= 0) window->setProperty("page", page);
    QTimer::singleShot(250, &app, [&] {
      app.exit(window->grabWindow().save(parser.value("screenshot")) ? 0 : 1);
    });
  };
#ifdef STUDIO_BUILD_TESTING
  if (parser.isSet("check-workbench")) checkWorkbench(window);
#endif
  if (parser.isSet("open-event")) {
    bool valid = false;
    const int entry = parser.value("entry").toInt(&valid);
    if (!valid || entry < 0 || !controller) return 2;
    if (parser.isSet("screenshot")) {
      // Allow container startup and event export before capturing the real data.
      QObject::connect(controller, &StudioController::eventChanged, &app, [&] {
        if (controller->eventCount() > 0) QTimer::singleShot(750, &app, capture);
      });
      QObject::connect(controller, &StudioController::changed, &app, [&] {
        if (!controller->busy() && controller->eventCount() == 0) {
          QTextStream(stderr) << controller->status() << "\n" << controller->log();
          app.exit(1);
        }
      });
    }
    QTimer::singleShot(0, controller, [&, entry] {
      controller->inspect(parser.value("open-event"), entry);
    });
  } else if (parser.isSet("screenshot")) {
    QTimer::singleShot(2500, &app, capture);
  }
  return app.exec();
}
