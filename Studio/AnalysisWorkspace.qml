pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    required property var controller
    required property var store
    property var selected: ({})
    property string source: "sim"
    property real threshold: 0
    readonly property var views: store.study.layout ? store.study.layout.views : [0, 1, 2, 3]
    readonly property int focusIndex: store.study.layout ? store.study.layout.focus : -1
    function layout(index, mode, focus) {
        const types = Array.from(views);
        if (index >= 0)
            types[index] = mode;
        store.setLayout({
            views: types,
            focus: focus
        });
    }
    Connections {
        target: root.controller
        function onEventChanged() {
            root.selected = {};
        }
    }
    ColumnLayout {
        anchors.fill: parent
        spacing: 0
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 46
            color: "white"
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                spacing: 8
                ToolButton {
                    text: "‹"
                    enabled: !root.controller.busy && root.controller.eventIndex > 0 && !!root.controller.event.file
                    onClicked: root.controller.inspect(root.controller.event.file, root.controller.eventIndex - 1)
                }
                SpinBox {
                    from: 1
                    to: Math.max(1, root.controller.eventCount)
                    value: root.controller.eventIndex + 1
                    editable: true
                    implicitWidth: 110
                    enabled: !root.controller.busy && !!root.controller.event.file
                    onValueModified: root.controller.inspect(root.controller.event.file, value - 1)
                }
                Label {
                    text: "/ " + root.controller.eventCount
                    font.pixelSize: 12
                }
                ToolButton {
                    text: "›"
                    enabled: !root.controller.busy && root.controller.eventIndex + 1 < root.controller.eventCount && !!root.controller.event.file
                    onClicked: root.controller.inspect(root.controller.event.file, root.controller.eventIndex + 1)
                }
                Rectangle {
                    implicitWidth: 1
                    implicitHeight: 20
                    color: "#dbe1e8"
                }
                SegmentedChoice {
                    choices: ["Energy deposits", "Reconstructed hits"]
                    currentIndex: root.source === "reco" ? 1 : 0
                    onChosen: index => root.source = index ? "reco" : "sim"
                }
                Label {
                    text: "≥ MeV"
                    color: "#637386"
                    font.pixelSize: 11
                }
                TextField {
                    text: "0"
                    implicitWidth: 62
                    validator: DoubleValidator {
                        bottom: 0
                        locale: "C"
                    }
                    onEditingFinished: {
                        if (acceptableInput)
                            root.threshold = Number(text);
                    }
                }
                Item {
                    Layout.fillWidth: true
                }
                Button {
                    text: "Four views"
                    enabled: root.focusIndex !== -1
                    onClicked: root.layout(-1, 0, -1)
                }
            }
        }
        Label {
            Layout.fillWidth: true
            Layout.leftMargin: 14
            Layout.rightMargin: 14
            Layout.bottomMargin: 7
            text: root.controller.event.file || root.controller.event.label || "Open an LDMX event output to begin analysis"
            elide: Text.ElideMiddle
            color: "#637386"
            font.pixelSize: 10
        }
        GridLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 8
            columns: root.focusIndex === -1 ? 2 : 1
            rowSpacing: 8
            columnSpacing: 8
            Repeater {
                model: 4
                delegate: DetectorPanel {
                    required property int index
                    visible: root.focusIndex === -1 || root.focusIndex === index
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Layout.preferredWidth: 500
                    Layout.preferredHeight: 350
                    mode: root.views[index]
                    eventData: root.controller.event
                    source: root.source
                    threshold: root.threshold
                    selected: root.selected
                    focused: root.focusIndex === index
                    onChangeMode: mode => root.layout(index, mode, root.focusIndex)
                    onFocusRequested: root.layout(-1, 0, root.focusIndex === index ? -1 : index)
                    onPicked: record => root.selected = record
                }
            }
        }
        Label {
            Layout.fillWidth: true
            Layout.leftMargin: 12
            Layout.bottomMargin: 7
            text: "Linked selection · global LDMX coordinates · hit markers / discrete track-state guides · 3D envelopes are schematic"
            color: "#7a8797"
            font.pixelSize: 10
            elide: Text.ElideRight
        }
    }
}
