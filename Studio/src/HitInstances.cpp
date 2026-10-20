#include "HitInstances.h"

#include <cmath>

void HitInstances::setHits(const QVariantList& hits) {
  hits_ = hits;
  buffer_.clear();
  for (const auto& value : hits_) {
    const auto hit = value.toMap();
    const auto p = hit.value("position").toList();
    if (p.size() != 3) continue;
    // Display axes: beam z -> horizontal x, vertical y unchanged.
    const QVector3D position(p[2].toFloat() / 10.f,
                             p[1].toFloat() / 10.f, p[0].toFloat() / 10.f);
    const float radius = std::clamp(
        0.008f + 0.004f * float(std::log1p(std::max(0., hit.value("energy").toDouble()))),
        0.008f, 0.045f);
    const auto entry = calculateTableEntry(
        position, QVector3D(radius, radius, radius), {},
        QColor(hit.value("color", "#bb591f").toString()));
    buffer_.append(reinterpret_cast<const char*>(&entry), sizeof(entry));
  }
  markDirty();
  emit hitsChanged();
}

QByteArray HitInstances::getInstanceBuffer(int* count) {
  *count = buffer_.size() / sizeof(InstanceTableEntry);
  return buffer_;
}
