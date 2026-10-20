#pragma once

#include <QObject>
#include <QTimer>
#include <QVariantList>
#include <QVariantMap>
#include <QtQml/qqmlregistration.h>

// Small, local study documents. Run recipes are copied into immutable sessions.
class StudyStore : public QObject {
  Q_OBJECT
  QML_ELEMENT
  Q_PROPERTY(QString workspace READ workspace WRITE setWorkspace NOTIFY changed)
  Q_PROPERTY(QVariantMap study READ study NOTIFY changed)
  Q_PROPERTY(QVariantList studies READ studies NOTIFY changed)
  Q_PROPERTY(QVariantList recipes READ recipes NOTIFY changed)
  Q_PROPERTY(QVariantMap recipe READ recipe NOTIFY changed)
  Q_PROPERTY(int activeRecipe READ activeRecipe NOTIFY changed)
  Q_PROPERTY(QVariantList runs READ runs NOTIFY runsChanged)
  Q_PROPERTY(QString error READ error NOTIFY changed)
 public:
  explicit StudyStore(QObject* parent = nullptr);
  QString workspace() const { return workspace_; }
  void setWorkspace(const QString& path);
  QVariantMap study() const { return study_; }
  QVariantList studies() const { return studies_; }
  QVariantList recipes() const { return study_.value("recipes").toList(); }
  QVariantMap recipe() const;
  int activeRecipe() const { return study_.value("activeRecipe", 0).toInt(); }
  QVariantList runs() const { return runs_; }
  QString error() const { return error_; }
  Q_INVOKABLE void newStudy(const QString& name);
  Q_INVOKABLE bool openStudy(const QString& id);
  Q_INVOKABLE void setTitle(const QString& name);
  Q_INVOKABLE void setNotes(const QString& notes);
  Q_INVOKABLE void selectRecipe(int index);
  Q_INVOKABLE void duplicateRecipe();
  Q_INVOKABLE void setOption(const QString& key, const QVariant& value);
  Q_INVOKABLE void setLayout(const QVariantMap& layout);
  Q_INVOKABLE QVariantMap recipeForRun() const;
  Q_INVOKABLE bool save();
  Q_INVOKABLE void refreshRuns();
  Q_INVOKABLE bool restoreRunRecipe(const QString& session);
  Q_INVOKABLE bool attachFile(const QString& file);
  Q_INVOKABLE QString readRunText(const QString& session, const QString& name) const;
 signals:
  void changed();
  void runsChanged();
 private:
  void edited();
  void refreshStudies();
  QString directory() const;
  QString workspace_, error_;
  QVariantMap study_;
  QVariantList studies_, runs_;
  QTimer saveTimer_;
};
