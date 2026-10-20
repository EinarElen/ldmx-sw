#pragma once

#include <QVariantList>
#include <QtQml/qqmlregistration.h>
#include <QtQuick3D/qquick3dinstancing.h>

class HitInstances : public QQuick3DInstancing {
  Q_OBJECT
  QML_ELEMENT
  Q_PROPERTY(QVariantList hits READ hits WRITE setHits NOTIFY hitsChanged)
 public:
  explicit HitInstances(QQuick3DObject* parent = nullptr)
      : QQuick3DInstancing(parent) {}
  QVariantList hits() const { return hits_; }
  void setHits(const QVariantList& hits);
 signals:
  void hitsChanged();
 protected:
  QByteArray getInstanceBuffer(int* count) override;
 private:
  QVariantList hits_;
  QByteArray buffer_;
};
