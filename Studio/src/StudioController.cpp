#include "StudioController.h"
#include "RunConfig.h"

#include <QCoreApplication>
#include <QDateTime>
#include <QDesktopServices>
#include <QDir>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QRandomGenerator>
#include <QRegularExpression>
#include <QSaveFile>
#include <QStandardPaths>
#include <QUrl>
#include <QUuid>
#include <cmath>

StudioController::StudioController(QObject* parent) : QObject(parent) {
  workspace_ = QDir::currentPath();
  const auto args = QCoreApplication::arguments();
  const int i = args.indexOf("--workspace");
  if (i >= 0 && i + 1 < args.size()) workspace_ = QFileInfo(args[i + 1]).absoluteFilePath();
  process_.setProcessChannelMode(QProcess::MergedChannels);
  connect(&process_, &QProcess::readyReadStandardOutput, this, [this] {
    appendLog(QString::fromUtf8(process_.readAllStandardOutput()));
  });
  connect(&process_, &QProcess::finished, this, &StudioController::finished);
  connect(&process_, &QProcess::errorOccurred, this, [this](QProcess::ProcessError error) {
    if (error == QProcess::FailedToStart) {
      heartbeat_.stop();
      busy_ = false;
      fail(process_.errorString());
      logFile_.close();
    }
  });
  heartbeat_.setInterval(2000);
  connect(&heartbeat_, &QTimer::timeout, this, [this] {
    save("heartbeat", QByteArray::number(QDateTime::currentSecsSinceEpoch()));
  });
}

void StudioController::setWorkspace(const QString& path) {
  if (busy_) return;
  workspace_ = QDir::cleanPath(QFileInfo(path).absoluteFilePath());
  emit workspaceChanged();
}

QString StudioController::localPath(const QUrl& url) const { return url.toLocalFile(); }
QString StudioController::preview(const QVariantMap& options) const {
  return studio::generateConfig(options);
}
QString StudioController::validation(const QVariantMap& options) const {
  return studio::configError(options);
}
void StudioController::appendLog(const QString& text) {
  log_ += text;
  if (log_.size() > 120000) log_.remove(0, log_.size() - 120000);
  if (logFile_.isOpen()) {
    logFile_.write(text.toUtf8());
    logFile_.flush();
  }
  emit logChanged();
}
void StudioController::fail(const QString& message) {
  status_ = message;
  appendLog("\n" + message + "\n");
  emit changed();
}
bool StudioController::save(const QString& name, const QByteArray& content) {
  QSaveFile file(session_ + "/" + name);
  if (!file.open(QIODevice::WriteOnly) || file.write(content) != content.size() ||
      !file.commit()) {
    fail("Cannot write session file: " + name);
    return false;
  }
  return true;
}

bool StudioController::prepare() {
  if (busy_) return false;
  if (!QFileInfo::exists(workspace_ + "/.denv/config")) {
    fail("Choose the denv workspace containing .denv/config.");
    return false;
  }
  // denv 1.x splits mount lists on whitespace.
  if (workspace_.contains(QRegularExpression("\\s"))) {
    fail("denv 1.x requires a workspace path without whitespace.");
    return false;
  }
  if (QStandardPaths::findExecutable("denv").isEmpty()) {
    fail("denv is not on PATH. Launch Studio from your configured terminal.");
    return false;
  }
  const auto name = QDateTime::currentDateTimeUtc().toString("yyyyMMdd-HHmmss") +
                    "-" + QUuid::createUuid().toString(QUuid::Id128).left(8);
  session_ = workspace_ + "/.ldmx-studio/runs/" + name;
  if (!QDir().mkpath(session_)) {
    fail("Cannot create a session in this workspace.");
    return false;
  }
  log_.clear();
  logFile_.close();
  logFile_.setFileName(session_ + "/console.log");
  if (!logFile_.open(QIODevice::WriteOnly)) {
    fail("Cannot open the session log.");
    return false;
  }
  for (const QString name : {"supervise.py", "event_bridge.py"}) {
    QFile file(":/qt/qml/LdmxStudio/bridge/" + name);
    if (!file.open(QIODevice::ReadOnly) || !save(name, file.readAll())) {
      fail("Cannot prepare the container bridge.");
      return false;
    }
  }
  cancelled_ = false;
  return save("heartbeat", QByteArray::number(QDateTime::currentSecsSinceEpoch()));
}

void StudioController::start(const QString& kind, const QStringList& arguments) {
  kind_ = kind;
  busy_ = true;
  status_ = kind;
  QJsonObject manifest{{"operation", kind}, {"workspace", workspace_},
                       {"started", QDateTime::currentDateTimeUtc().toString(Qt::ISODate)},
                       {"command", QJsonArray::fromStringList(arguments)}};
  if (!save("operation.json", QJsonDocument(manifest).toJson())) {
    busy_ = false;
    emit changed();
    return;
  }
  auto environment = QProcessEnvironment::systemEnvironment();
  environment.insert("denv_workspace", workspace_);
  environment.insert("DENV_NOPROMPT", "1");
  process_.setProcessEnvironment(environment);
  process_.setWorkingDirectory(session_);
  process_.setStandardInputFile(QProcess::nullDevice());
  process_.setProgram(QStandardPaths::findExecutable("denv"));
  // denv's entrypoint joins arguments into a shell command. Keep that command
  // constant; the supervisor reads the real argument vector from operation.json.
  process_.setArguments({"python3", "-u", "supervise.py", "."});
  appendLog("$ denv python3 -u supervise.py .\nCommand: " +
            QString::fromUtf8(QJsonDocument(QJsonArray::fromStringList(arguments))
                                  .toJson(QJsonDocument::Compact)) + "\n\n");
  heartbeat_.start();
  process_.start();
  emit changed();
}

void StudioController::run(QVariantMap options) {
  if (busy_) return;
  const auto error = validation(options);
  if (!error.isEmpty()) { fail(error); return; }
  if (options.value("mode") == "reprocess") {
    const QString input = QFileInfo(options.value("input").toString()).canonicalFilePath();
    if (!QFileInfo(input).isFile() || !studio::isInside(input, workspace_)) {
      fail("The input ROOT file must be inside the denv workspace.");
      return;
    }
    options["input"] = input;
  }
  if (!prepare()) return;
  if (!save("config.py", studio::generateConfig(options).toUtf8()) ||
      !save("recipe.json", QJsonDocument::fromVariant(options).toJson())) return;
  event_.clear();
  eventFile_.clear();
  emit eventChanged();
  start("Running simulation / processing", {"fire", session_ + "/config.py"});
}

void StudioController::build(int jobs) {
  if (jobs < 1 || jobs > 128 || !prepare()) return;
  start("Building LDMX", {"cmake", "--build", workspace_ + "/build",
                          "--target", "install", "--parallel", QString::number(jobs)});
}

void StudioController::probe() {
  if (!prepare()) return;
  start("Checking environment", {"python3", session_ + "/event_bridge.py", "probe"});
}

void StudioController::inspect(const QString& file, int index) {
  if (busy_) return;
  const QString path = QFileInfo(file).canonicalFilePath();
  if (!QFileInfo(path).isFile() || !studio::isInside(path, workspace_)) {
    fail("Choose a ROOT file inside the denv workspace.");
    return;
  }
  if (index < 0 || !prepare()) return;
  eventFile_ = path;
  resultFile_ = session_ + "/event.json";
  start("Reading event", {"python3", session_ + "/event_bridge.py", "event",
                          path, QString::number(index), resultFile_});
}

void StudioController::finished(int code, QProcess::ExitStatus exitStatus) {
  heartbeat_.stop();
  appendLog(QString::fromUtf8(process_.readAllStandardOutput()));
  busy_ = false;
  const bool ok = code == 0 && exitStatus == QProcess::NormalExit && !cancelled_;
  status_ = cancelled_ ? "Cancelled" : ok ? "Complete" :
            QString("Failed (exit %1) — see the console").arg(code);
  save("result.json", QJsonDocument(QJsonObject{
      {"exitCode", code}, {"success", ok}, {"cancelled", cancelled_},
      {"finished", QDateTime::currentDateTimeUtc().toString(Qt::ISODate)}}).toJson());
  appendLog("\n" + status_ + "\n");
  logFile_.close();
  if (ok && kind_ == "Reading event") {
    QFile file(resultFile_);
    QJsonParseError error;
    if (!file.open(QIODevice::ReadOnly)) { fail("Cannot read the event export."); return; }
    const auto doc = QJsonDocument::fromJson(file.readAll(), &error);
    if (error.error != QJsonParseError::NoError || !doc.isObject() ||
        doc.object().value("schema").toInt() != 2) {
      fail("Invalid event export.");
      return;
    }
    event_ = doc.object().toVariantMap();
    event_["file"] = eventFile_;
    status_ = QString("Event %1 / %2").arg(eventIndex() + 1).arg(eventCount());
    emit eventChanged();
  } else if (ok && kind_ == "Running simulation / processing") {
    const auto file = session_ + "/events.root";
    if (QFileInfo::exists(file)) {
      emit changed();
      QTimer::singleShot(0, this, [this, file] { inspect(file); });
      return;
    }
    fail("Process succeeded but no events.root was produced.");
  }
  emit changed();
}

void StudioController::cancel() {
  if (!busy_ || cancelled_) return;
  cancelled_ = true;
  save("cancel", "cancel\n");
  status_ = "Cancelling — waiting for the container job to stop";
  // Keep denv attached: killing the host CLI can orphan its container.
  emit changed();
}
void StudioController::revealSession() {
  if (!session_.isEmpty()) QDesktopServices::openUrl(QUrl::fromLocalFile(session_));
}

void StudioController::showExample() {
  if (busy_) return;
  QVariantList hits;
  QRandomGenerator random(42);
  for (int i = 0; i < 360; ++i) {
    const double z = 250 + random.generateDouble() * 380;
    const double spread = (z - 200) * 0.14;
    hits.append(QVariantMap{
        {"key", QString("example:%1").arg(i)}, {"kind", "hit"}, {"source", "sim"},
        {"detector", "Ecal"}, {"layer", i % 34}, {"id", i},
        {"position", QVariantList{(random.generateDouble() - .5) * spread * 2,
                                 (random.generateDouble() - .5) * spread * 2, z}},
        {"energy", random.generateDouble() * 6},
        {"color", "#bb591f"}, {"collection", "Illustrative ECal hits"}});
  }
  event_ = {{"schema", 2}, {"index", 0}, {"entries", 1}, {"hits", hits},
            {"clusters", QVariantList{}}, {"tracks", QVariantList{}},
            {"label", "Synthetic example — not a simulation"},
            {"collections", QVariantList{
                QVariantMap{{"name", "Illustrative ECal hits"}, {"count", 360},
                            {"category", "hits"}, {"detector", "Ecal"}, {"source", "sim"}}}},
            {"warnings", QVariantList{"Synthetic hits for exploring the viewer. No physics prediction."}}};
  status_ = "Synthetic example";
  eventFile_.clear();
  emit eventChanged();
  emit changed();
}
