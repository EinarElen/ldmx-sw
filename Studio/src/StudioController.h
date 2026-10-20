#pragma once

#include <QFile>
#include <QObject>
#include <QProcess>
#include <QTimer>
#include <QUrl>
#include <QVariantList>
#include <QVariantMap>
#include <QtQml/qqmlregistration.h>

class StudioController : public QObject {
  Q_OBJECT
  QML_ELEMENT
  Q_PROPERTY(QString workspace READ workspace WRITE setWorkspace NOTIFY workspaceChanged)
  Q_PROPERTY(QString status READ status NOTIFY changed)
  Q_PROPERTY(QString log READ log NOTIFY logChanged)
  Q_PROPERTY(bool busy READ busy NOTIFY changed)
  Q_PROPERTY(QString sessionPath READ sessionPath NOTIFY changed)
  Q_PROPERTY(QVariantMap event READ event NOTIFY eventChanged)
  Q_PROPERTY(QVariantList hits READ hits NOTIFY eventChanged)
  Q_PROPERTY(int eventIndex READ eventIndex NOTIFY eventChanged)
  Q_PROPERTY(int eventCount READ eventCount NOTIFY eventChanged)
 public:
  explicit StudioController(QObject* parent = nullptr);
  QString workspace() const { return workspace_; }
  void setWorkspace(const QString& path);
  QString status() const { return status_; }
  QString log() const { return log_; }
  bool busy() const { return busy_; }
  QString sessionPath() const { return session_; }
  QVariantMap event() const { return event_; }
  QVariantList hits() const { return event_.value("hits").toList(); }
  int eventIndex() const { return event_.value("index", 0).toInt(); }
  int eventCount() const { return event_.value("entries", 0).toInt(); }
  Q_INVOKABLE QString preview(const QVariantMap& options) const;
  Q_INVOKABLE QString validation(const QVariantMap& options) const;
  Q_INVOKABLE void run(QVariantMap options);
  Q_INVOKABLE void build(int jobs);
  Q_INVOKABLE void probe();
  Q_INVOKABLE void inspect(const QString& file, int index = 0);
  Q_INVOKABLE void cancel();
  Q_INVOKABLE void showExample();
  Q_INVOKABLE void revealSession();
  Q_INVOKABLE QString localPath(const QUrl& url) const;
 signals:
  void workspaceChanged();
  void changed();
  void logChanged();
  void eventChanged();
 private:
  bool prepare();
  void start(const QString& kind, const QStringList& arguments);
  void finished(int code, QProcess::ExitStatus exitStatus);
  void appendLog(const QString& text);
  bool save(const QString& name, const QByteArray& content);
  void fail(const QString& message);
  QString workspace_, status_ = "Ready to explore", log_, session_, kind_, eventFile_;
  QString resultFile_;
  QVariantMap event_;
  QProcess process_;
  QTimer heartbeat_;
  QFile logFile_;
  bool busy_ = false, cancelled_ = false;
};
