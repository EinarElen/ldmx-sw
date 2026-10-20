pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import LdmxStudio

Item {
    id: root
    required property var store
    required property var controller
    readonly property var recipe: store.recipe
    readonly property bool fromFile: recipe.mode === "reprocess"
    readonly property int outcome: recipe.clustering ? 2 : recipe.calorimetry || fromFile ? 1 : 0
    property int selectedStage: 1
    property bool details: false
    signal chooseInput
    signal showPython
    function selectOutcome(level) {
        if (fromFile && level === 0)
            return;
        store.setOption("calorimetry", level >= 1);
        store.setOption("clustering", level === 2);
    }
    component Hint: Label {
        Layout.fillWidth: true
        wrapMode: Text.WordWrap
        color: "#637386"
        font.pixelSize: 12
        lineHeight: 1.25
    }
    ScrollView {
        id: scroll
        anchors.fill: parent
        anchors.margins: 24
        contentWidth: availableWidth
        clip: true
        ColumnLayout {
            width: scroll.availableWidth
            spacing: 20
            RowLayout {
                TextField {
                    id: recipeName
                    text: root.recipe.name || ""
                    Layout.fillWidth: true
                    font.pixelSize: 26
                    font.weight: Font.Light
                    leftPadding: 0
                    selectByMouse: true
                    Accessible.name: "Recipe name"
                    onEditingFinished: root.store.setOption("name", text)
                    background: Rectangle {
                        color: "transparent"
                        border.color: recipeName.activeFocus ? "#0074d9" : "transparent"
                    }
                }
                Button {
                    text: "Duplicate"
                    onClicked: root.store.duplicateRecipe()
                }
            }
            RowLayout {
                Layout.fillWidth: true
                spacing: 22
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.preferredWidth: 720
                    Layout.alignment: Qt.AlignTop
                    spacing: 18
                    SegmentedChoice {
                        objectName: "recipeSourceChoice"
                        Layout.fillWidth: true
                        choices: ["Simulate a beam", "Use existing events"]
                        currentIndex: root.fromFile ? 1 : 0
                        onChosen: index => {
                            root.store.setOption("mode", index === 0 ? "simulate" : "reprocess");
                            root.selectedStage = 0;
                        }
                    }
                    RecipeScene {
                        objectName: "recipeScene"
                        Layout.fillWidth: true
                        Layout.preferredHeight: scroll.availableHeight < 720 ? 220 : 260
                        level: root.outcome
                        fromFile: root.fromFile
                        selectedStage: root.selectedStage
                        onStageSelected: stage => root.selectedStage = stage
                    }
                    Label {
                        text: "What would you like to study?"
                        font.pixelSize: 17
                        font.weight: Font.Medium
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 9
                        Repeater {
                            model: [
                                {
                                    title: "Energy deposits",
                                    detail: "Where particles leave energy"
                                },
                                {
                                    title: "Detector response",
                                    detail: "Signals reconstructed as hits"
                                },
                                {
                                    title: "Showers & clusters",
                                    detail: "Hits grouped into energy clusters"
                                }
                            ]
                            delegate: OutcomeChoice {
                                required property var modelData
                                required property int index
                                objectName: "outcomeChoice" + index
                                Layout.fillWidth: true
                                Layout.preferredWidth: 1
                                level: index
                                text: modelData.title
                                description: modelData.detail
                                checked: root.outcome === index
                                enabled: !root.fromFile || index > 0
                                opacity: enabled ? 1 : .45
                                onClicked: root.selectOutcome(index)
                                ToolTip.visible: hovered && !enabled
                                ToolTip.text: "Existing-event recipes rebuild detector response or clusters."
                            }
                        }
                    }
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 78
                        radius: 8
                        color: "white"
                        border.color: "#dbe3ec"
                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 15
                            spacing: 12
                            ColumnLayout {
                                Label {
                                    text: "Sample size"
                                    font.weight: Font.DemiBold
                                }
                                Label {
                                    text: root.fromFile ? "Maximum events to process" : "Independent electron events"
                                    font.pixelSize: 11
                                    color: "#637386"
                                }
                            }
                            Item {
                                Layout.fillWidth: true
                            }
                            Repeater {
                                model: [1, 10, 100]
                                delegate: Button {
                                    id: sampleChoice
                                    required property int modelData
                                    text: modelData.toString()
                                    checkable: true
                                    autoExclusive: true
                                    checked: root.recipe.events === modelData
                                    implicitWidth: 44
                                    onClicked: root.store.setOption("events", modelData)
                                    Accessible.name: modelData + " events"
                                    background: Rectangle {
                                        radius: 4
                                        color: sampleChoice.checked ? "#e8f2fc" : sampleChoice.hovered ? "#edf1f6" : "#f4f6f9"
                                        border.color: sampleChoice.checked || sampleChoice.activeFocus ? "#0074d9" : "transparent"
                                    }
                                }
                            }
                            SpinBox {
                                from: 1
                                to: 10000
                                editable: true
                                implicitWidth: 120
                                value: root.recipe.events || 1
                                Accessible.name: "Number of events"
                                onValueModified: root.store.setOption("events", value)
                            }
                        }
                    }
                    Hint {
                        text: root.fromFile ? "The original file stays intact. Your reconstructed output becomes a new dataset in Runs." : "Run this recipe to create a dataset. Its events open in the linked detector views, ready to explore."
                    }
                }
                Rectangle {
                    Layout.preferredWidth: 280
                    Layout.fillHeight: true
                    Layout.minimumHeight: context.implicitHeight + 36
                    Layout.alignment: Qt.AlignTop
                    color: "#f7f9fc"
                    radius: 8
                    ColumnLayout {
                        id: context
                        anchors.fill: parent
                        anchors.margins: 18
                        spacing: 14
                        Label {
                            text: "IN FOCUS"
                            color: "#7b8999"
                            font.pixelSize: 10
                            font.letterSpacing: 1.2
                        }
                        Label {
                            text: [root.fromFile ? "Your event sample" : "An electron beam", "The LDMX experiment", "From energy to hits", "Recognizing showers"][root.selectedStage]
                            Layout.fillWidth: true
                            font.pixelSize: 21
                            font.weight: Font.Light
                            wrapMode: Text.WordWrap
                        }
                        Hint {
                            text: [root.fromFile ? "Start with a simulated LDMX sample and rebuild the calorimeter response. Choose a file inside this workspace." : "Send one 8 GeV electron through LDMX per event. Each event samples a new interaction using the same beam setup.", "Tracking planes follow charged particles before and after the target. The calorimeters measure energy farther downstream.", "Energy deposits become detector signals. Reconstruction turns those signals into hits with measured energy, position and time.", "Clustering groups nearby calorimeter hits. Inspect a cluster to see its energy, position and contributing channels."][root.selectedStage]
                        }
                        Label {
                            visible: root.selectedStage >= 2
                            text: root.outcome >= root.selectedStage - 1 ? "●  Included in this recipe" : "○  Not included"
                            color: root.outcome >= root.selectedStage - 1 ? "#0074d9" : "#7b8999"
                            font.pixelSize: 11
                        }
                        Button {
                            visible: root.selectedStage >= 2 && root.outcome < root.selectedStage - 1
                            text: root.selectedStage === 2 ? "Include detector response" : "Include clustering"
                            Layout.fillWidth: true
                            onClicked: root.selectOutcome(root.selectedStage - 1)
                        }
                        Button {
                            visible: root.fromFile
                            Layout.fillWidth: true
                            text: root.recipe.input ? "Change event file…" : "Choose event file…"
                            onClicked: root.chooseInput()
                        }
                        Hint {
                            visible: root.fromFile
                            text: root.recipe.input ? root.recipe.input.split("/").pop() : "No input file selected"
                        }
                        Item {
                            Layout.fillHeight: true
                        }
                        ToolButton {
                            objectName: "recipeDetailsToggle"
                            text: root.details ? "▾  Implementation details" : "▸ Implementation details"
                            checkable: true
                            checked: root.details
                            onClicked: root.details = checked
                            Layout.fillWidth: true
                            font.pixelSize: 12
                        }
                        ColumnLayout {
                            visible: root.details
                            Layout.fillWidth: true
                            spacing: 10
                            Hint {
                                text: [root.fromFile ? "Input collections are selected by their simulation pass name. This recipe assumes v15 conditions." : "Geant4 single-electron gun, upstream of the tagger. The run number controls the default random-seed service.", "ldmx-det-v15-8gev\nMinimal scoring planes. This drawing explains the workflow; it is not a geometry preview.", "ECal / HCal digitization and reconstruction with v15 conditions.", "ECal: CLUE3D\nHCal: HcalClusterProducer\nBoth read the recipe's reconstructed hit pass."][root.selectedStage]
                            }
                            RowLayout {
                                visible: root.fromFile && root.selectedStage === 0
                                Label {
                                    text: "Input pass"
                                }
                                TextField {
                                    Layout.fillWidth: true
                                    text: root.recipe.inputPass || "studio"
                                    onEditingFinished: root.store.setOption("inputPass", text)
                                }
                            }
                            RowLayout {
                                Label {
                                    text: "Run / seed"
                                }
                                SpinBox {
                                    Layout.fillWidth: true
                                    from: 1
                                    to: 2147483647
                                    editable: true
                                    value: root.recipe.run || 1
                                    onValueModified: root.store.setOption("run", value)
                                }
                            }
                            Button {
                                text: "Geant4 hooks · " + (root.recipe.hooks || []).length
                                enabled: !root.fromFile
                                Layout.fillWidth: true
                                onClicked: hooks.open()
                            }
                        }
                        Button {
                            text: "View generated Python"
                            Layout.fillWidth: true
                            onClicked: root.showPython()
                        }
                    }
                }
            }
            Label {
                text: root.controller.validation(Object.assign({}, root.recipe, {
                    hooks: root.fromFile ? [] : root.recipe.hooks
                }))
                color: "#a33d2a"
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
            }
        }
    }
    HooksEditor {
        id: hooks
        anchors.centerIn: Overlay.overlay
        property bool loading: false
        onOpened: {
            loading = true;
            loadHooks(root.recipe.hooks || []);
            loading = false;
        }
        onHooksChanged: if (visible && !loading)
            root.store.setOption("hooks", hooks.hooks)
    }
}
