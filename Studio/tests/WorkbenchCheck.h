#pragma once
#include "StudioController.h"
#include "StudyStore.h"
#include <QCoreApplication>
#include <QQuickItem>
#include <QQuickWindow>
#include <QTextStream>
#include <QTimer>
#include <QTest>

inline void checkWorkbench(QQuickWindow* window) {
  QTimer::singleShot(250, window, [window] {
    auto fail=[](const QString& message){QTextStream(stderr)<<"Workbench check: "<<message<<"\n";QCoreApplication::exit(1);};
    auto* store=window->findChild<StudyStore*>("studyStore");
    auto* controller=window->findChild<StudioController*>("studioController");
    auto* analysis=window->findChild<QObject*>("analysisWorkspace");
    if(!store||!controller||!analysis){fail("Missing workspace objects");return;}
    store->setOption("events",7);
    if(!window->property("configText").toString().contains("p.max_events = 7")){
      fail("Recipe edit did not update generated Python");return;
    }
    store->duplicateRecipe();store->setOption("events",9);
    if(store->recipes().size()!=2||store->recipes()[0].toMap().value("events").toInt()!=7){fail("Recipe edits leaked between copies");return;}
    auto findItem = [window](const QString& name) -> QQuickItem* {
      QList<QQuickItem*> items{window->contentItem()};
      while(!items.isEmpty()){
        auto* item=items.takeLast();
        if(item->objectName()==name && item->isVisible())return item;
        items.append(item->childItems());
      }
      return nullptr;
    };
    auto click = [window, &findItem](const QString& name) {
      auto* item=findItem(name);
      if(!item || !item->isVisible() || !item->isEnabled())return false;
      QTest::mouseClick(window,Qt::LeftButton,Qt::NoModifier,
          item->mapToScene(QPointF(item->width()/2,item->height()/2)).toPoint());
      QCoreApplication::processEvents();
      return true;
    };
    window->setProperty("page",1);
    QTest::qWait(100);
    if(!click("outcomeChoice0")||store->recipe().value("calorimetry").toBool()||store->recipe().value("clustering").toBool()){
      fail("Energy-deposit outcome did not remove reconstruction and clustering");return;
    }
    if(!click("outcomeChoice2")||!store->recipe().value("calorimetry").toBool()||!store->recipe().value("clustering").toBool()){
      fail("Cluster outcome did not include prerequisite reconstruction");return;
    }
    if(!click("outcomeChoice2")||!findItem("outcomeChoice2")->property("checked").toBool()){
      fail("Clicking the active outcome cleared its selected state");return;
    }
    auto* editor=window->findChild<QObject*>("recipeEditor");
    if(!editor||!click("recipeStage3")||editor->property("selectedStage").toInt()!=3){
      fail("Visual stage selection did not update contextual explanation");return;
    }
    if(editor->property("details").toBool()||!click("recipeDetailsToggle")||!editor->property("details").toBool()){
      fail("Technical details were not progressively disclosed");return;
    }
    auto* scene=findItem("recipeScene");
    if(!scene){fail("Missing visual experiment scene");return;}
    // Click the source illustration itself, not just its companion button.
    QTest::mouseClick(window,Qt::LeftButton,Qt::NoModifier,
        scene->mapToScene(QPointF(scene->width()/8,scene->height()/2)).toPoint());
    if(editor->property("selectedStage").toInt()!=0){fail("Direct scene picking did not select the source");return;}
    const auto capture=qEnvironmentVariable("STUDIO_CAPTURE_RECIPE");
    if(!capture.isEmpty()){
      window->resize(1240,820);
      QTest::qWait(200);
      if(!window->grabWindow().save(capture)){fail("Could not capture compact recipe");return;}
    }
    if(window->property("outputVisible").toBool()){
      fail("Generated Python should start collapsed");return;
    }
    QMetaObject::invokeMethod(editor,"showPython");
    if(!window->property("outputVisible").toBool()){
      fail("Generated Python is not available from the recipe");return;
    }
    window->setProperty("outputVisible",false);
    controller->showExample();
    QTest::qWait(100);
    // QML Repeater delegates belong to the visual item tree, not necessarily
    // the QObject tree. Traverse both via their QQuickItem children.
    QList<QQuickItem*> pending{window->contentItem()};
    QList<QQuickItem*> panels;
    while(!pending.isEmpty()){
      auto* item=pending.takeLast();
      if(item->objectName()=="detectorPanel")panels.append(item);
      pending.append(item->childItems());
    }
    if(panels.size()!=4){fail("Four detector views were not created");return;}
    QQuickItem* hcal=nullptr;
    for(auto* panel:panels)if(panel->property("mode").toInt()==2)hcal=panel;
    if(!hcal||!click("hcalSection1")||hcal->property("section").toInt()!=1){
      fail("HCal section map did not change the projection selection");return;
    }
    QQuickItem* ecal=nullptr;
    for(auto* panel:panels)if(panel->property("mode").toInt()==1)ecal=panel;
    if(!ecal){fail("Missing ECal view");return;}
    auto* plot=ecal->findChild<QObject*>("detectorPlot");
    if(!plot||!QMetaObject::invokeMethod(plot,"layerPicked",Q_ARG(int,7))||ecal->property("layerIndex").toInt()!=7){fail("Layer selection is not connected");return;}
    const QVariant hit=controller->hits().first();
    QMetaObject::invokeMethod(ecal,"picked",Q_ARG(QVariant,hit));
    if(analysis->property("selected").toMap().value("key")!=hit.toMap().value("key")){fail("Object picking did not reach shared selection");return;}
    for(auto* panel:panels)if(panel->property("selected").toMap().value("key")!=hit.toMap().value("key")){fail("Selection was not linked across views");return;}
    QMetaObject::invokeMethod(ecal,"focusRequested");
    if(store->study().value("layout").toMap().value("focus").toInt()!=1){fail("Focus layout was not saved");return;}
    QMetaObject::invokeMethod(ecal,"changeMode",Q_ARG(int,4));
    if(store->study().value("layout").toMap().value("views").toList().value(1).toInt()!=4){fail("View replacement was not saved");return;}
    const QString id=store->study().value("id").toString();
    if(!store->save()||!store->openStudy(id)){fail("Study did not reopen");return;}
    if(store->recipe().value("events").toInt()!=9){fail("Recipe was not preserved");return;}
    QTextStream(stdout)<<"Workbench interactions passed: visual outcome choices, prerequisites, contextual stages, detail disclosure, Python access, recipe copies, layer slicing, linked picking, view focus/replacement, study reopening.\n";
    QCoreApplication::exit(0);
  });
}
