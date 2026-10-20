pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    required property var store
    required property var controller
    property var selected: ({})
    property bool currentStudyOnly: true
    readonly property var rows: store.runs.filter(r => !currentStudyOnly || r.recipe._studyId === store.study.id)
    signal openFile(string path)
    signal restoreRecipe
    signal showText(string text, string label)
    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 24
        spacing: 14
        RowLayout {
            Label {
                text: "Runs & outputs"
                font.pixelSize: 25
                font.weight: Font.Light
            }
            Item {
                Layout.fillWidth: true
            }
            CheckBox {
                text: "This study"
                checked: root.currentStudyOnly
                onToggled: root.currentStudyOnly = checked
            }
            Button {
                text: "Refresh"
                onClicked: root.store.refreshRuns()
            }
        }
        Label {
            text: "Select a run to reopen its output, inspect its exact configuration, or create a new recipe from it."
            color: "#637386"
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 32
            color: "#eef2f6"
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                Label {
                    text: "RECIPE / STARTED"
                    Layout.fillWidth: true
                    font.pixelSize: 10
                    color: "#637386"
                }
                Label {
                    text: "EVENTS"
                    Layout.preferredWidth: 65
                    font.pixelSize: 10
                    color: "#637386"
                }
                Label {
                    text: "MODE"
                    Layout.preferredWidth: 90
                    font.pixelSize: 10
                    color: "#637386"
                }
                Label {
                    text: "STATUS"
                    Layout.preferredWidth: 95
                    font.pixelSize: 10
                    color: "#637386"
                }
            }
        }
        ListView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: root.rows
            spacing: 3
            delegate: ItemDelegate {
                id: row
                required property var modelData
                width: ListView.view.width
                height: 64
                highlighted: root.selected.id === modelData.id
                onClicked: root.selected = modelData
                onDoubleClicked: if (modelData.status === "Complete" && modelData.output)
                    root.openFile(modelData.output)
                contentItem: RowLayout {
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        Label {
                            text: row.modelData.name
                            font.weight: Font.Medium
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }
                        Label {
                            text: row.modelData.created
                            color: "#637386"
                            font.pixelSize: 11
                        }
                    }
                    Label {
                        text: row.modelData.recipe.events
                        Layout.preferredWidth: 65
                    }
                    Label {
                        text: row.modelData.recipe.mode
                        Layout.preferredWidth: 90
                        font.pixelSize: 12
                    }
                    Label {
                        text: row.modelData.status
                        color: row.modelData.status === "Failed" ? "#a33d2a" : "#0074d9"
                        Layout.preferredWidth: 95
                    }
                }
            }
            Label {
                visible: root.rows.length === 0
                anchors.centerIn: parent
                text: "No runs in this selection yet"
                color: "#637386"
            }
        }
        Label {
            text: root.selected.path || "Select a run"
            Layout.fillWidth: true
            elide: Text.ElideMiddle
            color: "#637386"
            font.pixelSize: 11
        }
        Flow {
            Layout.fillWidth: true
            spacing: 8
            Button {
                text: "Open event output"
                enabled: !root.controller.busy && root.selected.status === "Complete" && !!root.selected.output
                onClicked: root.openFile(root.selected.output)
            }
            Button {
                text: "Restore as new recipe"
                enabled: !!root.selected.path
                onClicked: {
                    if (root.store.restoreRunRecipe(root.selected.path))
                        root.restoreRecipe();
                }
            }
            Button {
                text: "Configuration"
                enabled: !!root.selected.path
                onClicked: root.showText(root.store.readRunText(root.selected.path, "config.py"), "Run configuration")
            }
            Button {
                text: "Log"
                enabled: !!root.selected.path
                onClicked: root.showText(root.store.readRunText(root.selected.path, "console.log"), "Run log · tail")
            }
        }
    }
}
