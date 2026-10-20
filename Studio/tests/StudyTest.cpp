#include "StudyStore.h"
#include <QDir>
#include <QFile>
#include <QJsonDocument>
#include <QTemporaryDir>
#include <QtTest>

class StudyTest : public QObject {
  Q_OBJECT
 private slots:
  void persistenceAndRecipeIsolation() {
    QTemporaryDir temp;
    StudyStore first;
    first.setWorkspace(temp.path());
    const auto studyId=first.study().value("id").toString();
    first.setTitle("Photon study");
    first.setOption("events", 5);
    const auto snapshot=first.recipeForRun();
    first.duplicateRecipe();
    first.setOption("events", 25);
    first.setLayout({{"focus", 2}, {"views", QVariantList{4,1,2,3}}});
    QVERIFY(first.save());
    QCOMPARE(snapshot.value("events").toInt(), 5);
    QCOMPARE(first.recipes().at(0).toMap().value("events").toInt(), 5);
    StudyStore reopened;
    reopened.setWorkspace(temp.path());
    QCOMPARE(reopened.study().value("id").toString(), studyId);
    QCOMPARE(reopened.study().value("title").toString(), "Photon study");
    QCOMPARE(reopened.recipe().value("events").toInt(), 25);
    QCOMPARE(reopened.study().value("layout").toMap().value("focus").toInt(), 2);
    QVERIFY(!reopened.openStudy("../../escape"));
  }
  void historyAndRestoration() {
    QTemporaryDir temp;
    StudyStore store;
    store.setWorkspace(temp.path());
    const QString session=temp.path()+"/.ldmx-studio/runs/test-run";
    QVERIFY(QDir().mkpath(session));
    auto write=[&](const QString& name,const QByteArray& bytes){QFile f(session+"/"+name); QVERIFY(f.open(QIODevice::WriteOnly)); f.write(bytes);};
    write("recipe.json",QJsonDocument::fromVariant(store.recipeForRun()).toJson());
    write("result.json",R"({"success":true,"cancelled":false})");
    write("events.root","test fixture, not a ROOT file");
    write("config.py","print('original')");
    store.refreshRuns();
    QCOMPARE(store.runs().size(),1);
    QCOMPARE(store.runs()[0].toMap().value("status").toString(),"Complete");
    QVERIFY(store.restoreRunRecipe(session));
    QCOMPARE(store.recipes().size(),2);
    QVERIFY(store.recipe().value("id")!=store.recipes()[0].toMap().value("id"));
    QVERIFY(store.attachFile(session+"/events.root"));
    QVERIFY(!store.attachFile("/etc/passwd"));
    QCOMPARE(store.readRunText(session,"config.py"),"print('original')");
    QVERIFY(store.readRunText(session,"../../studies/active.json").isEmpty());
  }
};
QTEST_GUILESS_MAIN(StudyTest)
#include "StudyTest.moc"
