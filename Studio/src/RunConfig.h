#pragma once

#include <QString>
#include <QVariantMap>

namespace studio {
QString pythonString(const QString& value);
QString configError(const QVariantMap& options);
QString generateConfig(const QVariantMap& options);
bool isInside(const QString& file, const QString& directory);
}
