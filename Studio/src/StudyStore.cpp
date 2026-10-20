#include "StudyStore.h"
#include "RunConfig.h"

#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>
#include <QSaveFile>
#include <QRegularExpression>
#include <QUuid>

namespace {
QString uuid() { return QUuid::createUuid().toString(QUuid::Id128); }
QVariantMap readObject(const QString& path) {
  QFile file(path);
  if (!file.open(QIODevice::ReadOnly)) return {};
  return QJsonDocument::fromJson(file.readAll()).object().toVariantMap();
}
bool writeObject(const QString& path, const QVariantMap& value) {
  QSaveFile file(path);
  const auto bytes = QJsonDocument::fromVariant(value).toJson();
  return file.open(QIODevice::WriteOnly) && file.write(bytes) == bytes.size() && file.commit();
}
QVariantMap initialRecipe() {
  return {{"id", uuid()}, {"name", "Electron shower"}, {"mode", "simulate"},
          {"events", 10}, {"run", 1}, {"detector", "ldmx-det-v15-8gev"},
          {"calorimetry", true}, {"clustering", true}, {"hooks", QVariantList{}},
          {"input", ""}, {"inputPass", "studio"}};
}
}

StudyStore::StudyStore(QObject* parent) : QObject(parent) {
  saveTimer_.setSingleShot(true);
  saveTimer_.setInterval(400);
  connect(&saveTimer_, &QTimer::timeout, this, &StudyStore::save);
}
QString StudyStore::directory() const { return workspace_ + "/.ldmx-studio/studies"; }
QVariantMap StudyStore::recipe() const {
  return recipes().value(activeRecipe()).toMap();
}
void StudyStore::setWorkspace(const QString& path) {
  const auto root = QFileInfo(path).canonicalFilePath();
  if (root.isEmpty() || root == workspace_) return;
  if (!study_.isEmpty() && !save()) return;
  workspace_ = root;
  study_.clear();
  refreshStudies();
  const auto last = readObject(directory() + "/active.json").value("id").toString();
  if (last.isEmpty() || !openStudy(last)) newStudy("Untitled study");
  refreshRuns();
}
void StudyStore::edited() {
  error_.clear();
  saveTimer_.start();
  emit changed();
}
void StudyStore::refreshStudies() {
  studies_.clear();
  QDir dir(directory());
  for (const auto& file : dir.entryList({"*.json"}, QDir::Files, QDir::Time)) {
    const auto value = readObject(dir.filePath(file));
    if (value.value("schema").toInt() == 1 && value.contains("recipes"))
      studies_.append(QVariantMap{{"id", value.value("id")}, {"title", value.value("title")}});
  }
}
void StudyStore::newStudy(const QString& name) {
  if (!study_.isEmpty() && !save()) return;
  study_ = {{"schema", 1}, {"id", uuid()},
            {"title", name.trimmed().isEmpty() ? "Untitled study" : name.trimmed()},
            {"notes", ""}, {"recipes", QVariantList{initialRecipe()}},
            {"activeRecipe", 0}, {"files", QVariantList{}},
            {"layout", QVariantMap{{"focus", -1}, {"views", QVariantList{0, 1, 2, 3}}}}};
  save();
}
bool StudyStore::openStudy(const QString& id) {
  // IDs are local UUIDs, never arbitrary paths.
  if (!QRegularExpression("^[0-9a-f]{32}$").match(id).hasMatch()) return false;
  if (!study_.isEmpty() && !save()) return false;
  const auto value = readObject(directory() + "/" + id + ".json");
  if (value.value("schema").toInt() != 1 || value.value("recipes").toList().isEmpty()) {
    error_ = "Cannot open this study document."; emit changed(); return false;
  }
  study_ = value;
  if (activeRecipe() < 0 || activeRecipe() >= recipes().size()) study_["activeRecipe"] = 0;
  error_.clear();
  writeObject(directory() + "/active.json", {{"id", id}});
  emit changed();
  return true;
}
bool StudyStore::save() {
  saveTimer_.stop();
  if (study_.isEmpty()) return true;
  study_["updated"] = QDateTime::currentDateTimeUtc().toString(Qt::ISODate);
  if (!QDir().mkpath(directory()) ||
      !writeObject(directory() + "/" + study_.value("id").toString() + ".json", study_) ||
      !writeObject(directory() + "/active.json", {{"id", study_.value("id")}})) {
    error_ = "Study could not be saved. Check workspace permissions and free space.";
    emit changed(); return false;
  }
  error_.clear();
  refreshStudies();
  emit changed();
  return true;
}
void StudyStore::setTitle(const QString& name) {
  if (name.trimmed().isEmpty()) return;
  study_["title"] = name.trimmed(); edited();
}
void StudyStore::setNotes(const QString& notes) { study_["notes"] = notes; edited(); }
void StudyStore::selectRecipe(int index) {
  if (index < 0 || index >= recipes().size()) return;
  study_["activeRecipe"] = index; edited();
}
void StudyStore::duplicateRecipe() {
  auto list = recipes();
  auto copy = recipe();
  copy["id"] = uuid();
  copy["name"] = copy.value("name").toString() + " copy";
  list.append(copy);
  study_["recipes"] = list; study_["activeRecipe"] = list.size() - 1; edited();
}
void StudyStore::setOption(const QString& key, const QVariant& value) {
  if (key == "id" || key.startsWith("_")) return;
  auto list = recipes();
  if (activeRecipe() < 0 || activeRecipe() >= list.size()) return;
  auto current = recipe();
  if (current.value(key) == value) return;
  current[key] = value;
  list[activeRecipe()] = current;
  study_["recipes"] = list; edited();
}
void StudyStore::setLayout(const QVariantMap& layout) {
  study_["layout"] = layout; edited();
}
QVariantMap StudyStore::recipeForRun() const {
  auto options = recipe();
  options["_studyId"] = study_.value("id");
  options["_studyTitle"] = study_.value("title");
  if (options.value("mode") == "reprocess") options["hooks"] = QVariantList{};
  return options;
}
void StudyStore::refreshRuns() {
  runs_.clear();
  QDir root(workspace_ + "/.ldmx-studio/runs");
  for (const auto& name : root.entryList(QDir::Dirs | QDir::NoDotAndDotDot, QDir::Name | QDir::Reversed)) {
    const auto path = root.filePath(name);
    const auto recipe = readObject(path + "/recipe.json");
    if (recipe.isEmpty()) continue;
    const auto result = readObject(path + "/result.json");
    const auto operation = readObject(path + "/operation.json");
    const auto heartbeat = QFileInfo(path + "/heartbeat").lastModified();
    QString status = result.isEmpty() ?
        (heartbeat.secsTo(QDateTime::currentDateTime()) < 30 ? "Running" : "Interrupted") :
        result.value("cancelled").toBool() ? "Cancelled" :
        result.value("success").toBool() ? "Complete" : "Failed";
    runs_.append(QVariantMap{{"id", name}, {"path", path}, {"status", status},
        {"created", operation.value("started")}, {"recipe", recipe},
        {"name", recipe.value("name", "Scratch run")},
        {"output", QFileInfo::exists(path + "/events.root") ? path + "/events.root" : ""},
        {"bytes", QFileInfo(path + "/events.root").size()}});
  }
  emit runsChanged();
}
bool StudyStore::restoreRunRecipe(const QString& session) {
  const auto file = session + "/recipe.json";
  if (!studio::isInside(file, workspace_ + "/.ldmx-studio/runs")) return false;
  auto copy = readObject(file);
  if (copy.isEmpty()) return false;
  copy.remove("_studyId"); copy.remove("_studyTitle");
  copy["id"] = uuid(); copy["name"] = copy.value("name", "Scratch run").toString() + " restored";
  auto list = recipes(); list.append(copy);
  study_["recipes"] = list; study_["activeRecipe"] = list.size() - 1; edited();
  return true;
}
bool StudyStore::attachFile(const QString& file) {
  const auto path = QFileInfo(file).canonicalFilePath();
  if (!QFileInfo(path).isFile() || !studio::isInside(path, workspace_)) {
    error_ = "Choose an LDMX ROOT file within this workspace."; emit changed(); return false;
  }
  auto files = study_.value("files").toList();
  if (!files.contains(path)) files.append(path);
  study_["files"] = files; edited(); return true;
}
QString StudyStore::readRunText(const QString& session, const QString& name) const {
  if (name != "config.py" && name != "console.log") return {};
  QFile file(session + "/" + name);
  if (!studio::isInside(file.fileName(), workspace_ + "/.ldmx-studio/runs") ||
      !file.open(QIODevice::ReadOnly)) return {};
  if (file.size() > 120000) file.seek(file.size() - 120000);
  return QString::fromUtf8(file.readAll());
}
