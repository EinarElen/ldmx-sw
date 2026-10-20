#include "RunConfig.h"
#include <QFile>
#include <QProcess>
#include <QTemporaryDir>
#include <QtTest>

static QVariantList hookRecipe() {
  return {QVariantMap{{"type", "step_trace"}, {"trackId", 7}, {"depth", 2}},
          QVariantMap{{"type", "keep_process"}, {"process", "eBrem"}},
          QVariantMap{{"type", "photonuclear"}}};
}

class ConfigTest : public QObject {
  Q_OBJECT
 private slots:
  void simulation() {
    const QVariantMap options{{"mode", "simulate"}, {"events", 10}, {"run", 42},
                              {"detector", "ldmx-det-v15-8gev"}, {"calorimetry", false}};
    QVERIFY(studio::configError(options).isEmpty());
    const auto config = studio::generateConfig(options);
    QVERIFY(config.contains("single_8gev_e_upstream_tagger()"));
    QVERIFY(config.contains("p.run = 42"));
    QVERIFY(!config.contains("EcalDigiProducer"));
    QVERIFY(!config.contains("input_files"));
  }
  void reprocessing() {
    const QVariantMap options{{"mode", "reprocess"}, {"events", 3}, {"run", 1},
                              {"detector", "ldmx-det-v15-8gev"},
                              {"input", "/workspace/a\"b\n.root"}, {"inputPass", "sim"}};
    const auto config = studio::generateConfig(options);
    QVERIFY(config.contains("Process(\"studio_reco\")"));
    QVERIFY(config.contains("ecal_digi.input_pass_name = \"sim\""));
    QVERIFY(config.contains("hcal_reco.sim_hit_pass_name = \"sim\""));
    QVERIFY(!config.contains("Simulator("));
    QVERIFY(config.contains("a\\\"b\\n.root"));
  }
  void validation() {
    QVariantMap options{{"mode", "simulate"}, {"events", 0}, {"run", 1},
                         {"detector", "ldmx-det-v15-8gev"}};
    QVERIFY(!studio::configError(options).isEmpty());
    QVERIFY(studio::generateConfig(options).isEmpty());
    options["events"] = 10001;
    QVERIFY(!studio::configError(options).isEmpty());
    options["events"] = 1;
    QVERIFY(studio::configError(options).isEmpty());
    options["mode"] = "reprocess";
    options["input"] = "/tmp/test.root";
    options["inputPass"] = "sim'; import os";
    QVERIFY(!studio::configError(options).isEmpty());
    options["inputPass"] = "studio_reco";
    QVERIFY(!studio::configError(options).isEmpty());
  }
  void workspaceBoundary() {
    QTemporaryDir workspace, other;
    QFile file(workspace.filePath("input.root"));
    QVERIFY(file.open(QIODevice::WriteOnly));
    file.close();
    QFile outside(other.filePath("input.root"));
    QVERIFY(outside.open(QIODevice::WriteOnly));
    outside.close();
    QVERIFY(studio::isInside(file.fileName(), workspace.path()));
    QVERIFY(!studio::isInside(outside.fileName(), workspace.path()));
    QVERIFY(!studio::isInside(workspace.filePath("missing.root"), workspace.path()));
    QVERIFY(QFile::link(outside.fileName(), workspace.filePath("escape.root")));
    QVERIFY(!studio::isInside(workspace.filePath("escape.root"), workspace.path()));
  }
  void hookValidation() {
    QVariantMap options{{"mode", "simulate"}, {"events", 1}, {"run", 1},
                        {"detector", "ldmx-det-v15-8gev"}, {"hooks", hookRecipe()}};
    QVERIFY(studio::configError(options).isEmpty());
    for (const auto& invalid : QVariantList{
             "not a list",
             QVariantList{QVariantMap{{"type", "arbitrary_code"}}},
             QVariantList{QVariantMap{{"type", "step_trace"}, {"trackId", 1.5}, {"depth", 0}}},
             QVariantList{QVariantMap{{"type", "step_trace"}, {"trackId", 1}, {"depth", 4}}},
             QVariantList{QVariantMap{{"type", "keep_process"}, {"process", "eBrem'); bad()"}}},
             QVariantList{QVariantMap{{"type", "photonuclear"}, {"unknown", true}}},
             QVariantList{QVariantMap{{"type", "photonuclear"}},
                          QVariantMap{{"type", "photonuclear"}}}}) {
      options["hooks"] = invalid;
      QVERIFY(!studio::configError(options).isEmpty());
      QVERIFY(studio::generateConfig(options).isEmpty());
    }
    options["hooks"] = hookRecipe();
    options["mode"] = "reprocess";
    options["input"] = "/workspace/input.root";
    options["inputPass"] = "sim";
    QVERIFY(!studio::configError(options).isEmpty());
    options["hooks"] = QVariantList{};
    QVERIFY(studio::configError(options).isEmpty());
  }
  void actualPythonConfigurationApi() {
    QTemporaryDir temp;
    for (const QString variant : {"simulate", "reprocess", "hooks", "clusters"}) {
      const QString mode = variant == "hooks" || variant == "clusters" ? "simulate" : variant;
      QVariantMap options{{"mode", mode}, {"events", 10}, {"run", 42},
                           {"detector", "ldmx-det-v15-8gev"}, {"calorimetry", true},
                           {"input", "/workspace/events.root"}, {"inputPass", "sim"}};
      if (variant == "hooks") options["hooks"] = hookRecipe();
      if (variant == "clusters") options["clustering"] = true;
      QFile config(temp.filePath("config.py"));
      QVERIFY(config.open(QIODevice::WriteOnly | QIODevice::Truncate));
      config.write(studio::generateConfig(options).toUtf8());
      config.close();
      QProcess python;
      python.setProcessChannelMode(QProcess::MergedChannels);
      python.start(STUDIO_PYTHON, {"-B", QString(STUDIO_SOURCE_DIR) +
          "/tests/check_config_api.py", config.fileName(), variant});
      QVERIFY(python.waitForFinished(15000));
      const auto output = python.readAll();
      QVERIFY2(python.exitCode() == 0, output.constData());
    }
  }
};
QTEST_GUILESS_MAIN(ConfigTest)
#include "ConfigTest.moc"
