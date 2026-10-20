pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "ViewMath.js" as V

ScrollView {
    id: root
    required property var eventData
    required property var selected
    property bool details: false
    property bool collectionsVisible: false
    signal picked(var record)
    contentWidth: availableWidth
    clip: true
    ColumnLayout {
        width: root.availableWidth
        spacing: 12
        Label {
            text: "Inspector"
            font.pixelSize: 16
            font.weight: Font.DemiBold
            Layout.topMargin: 16
            Layout.leftMargin: 14
        }
        Label {
            Layout.leftMargin: 14
            Layout.rightMargin: 14
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            text: root.eventData.header ? "Run " + root.eventData.header.run + " · event " + root.eventData.header.event : "Event objects"
            color: "#637386"
            font.pixelSize: 11
        }
        Label {
            visible: !root.selected.key
            Layout.leftMargin: 14
            Layout.rightMargin: 14
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            text: "Pick a hit in any projection, or select a cluster or track below. Matching objects are highlighted across views."
            color: "#637386"
            font.pixelSize: 12
        }
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 1
            color: "#dbe1e8"
        }
        Label {
            visible: !!root.selected.key
            text: (root.selected.detector || "") + " / " + (root.selected.kind || "")
            font.weight: Font.DemiBold
            Layout.leftMargin: 14
        }
        Repeater {
            model: Object.keys(root.selected).filter(k => ["color", "key", "states", "points", "hitIds", "rms"].indexOf(k) < 0 && (root.details || ["energy", "time", "position", "layer", "count", "pe", "chi2", "ndf"].indexOf(k) >= 0))
            delegate: ColumnLayout {
                id: fieldRow
                required property string modelData
                Layout.fillWidth: true
                Layout.leftMargin: 14
                Layout.rightMargin: 14
                spacing: 3
                Label {
                    text: ({
                            "energy": "Energy / MeV",
                            "time": "Time / ns",
                            "position": "Position / mm",
                            "layer": "Layer",
                            "count": "Contributing hits",
                            "pe": "Photoelectrons"
                        })[fieldRow.modelData] || fieldRow.modelData
                    font.pixelSize: 10
                    color: "#7c8999"
                }
                Label {
                    text: V.format(root.selected[fieldRow.modelData])
                    font.pixelSize: 11
                    Layout.fillWidth: true
                    wrapMode: Text.WrapAnywhere
                }
            }
        }
        Label {
            visible: !!root.selected.hitIds
            text: (root.selected.hitIds || []).length + " constituent channel IDs"
            Layout.leftMargin: 14
            font.pixelSize: 11
            color: "#637386"
        }
        ToolButton {
            visible: !!root.selected.key
            text: root.details ? "▾  Object details" : "▸  Object details"
            checkable: true
            checked: root.details
            onClicked: root.details = checked
            Layout.leftMargin: 8
            font.pixelSize: 11
        }
        Label {
            text: "RECONSTRUCTED OBJECTS"
            Layout.leftMargin: 14
            Layout.topMargin: 10
            font.pixelSize: 10
            color: "#637386"
            font.letterSpacing: 0.7
        }
        Repeater {
            model: (root.eventData.clusters || []).concat(root.eventData.tracks || [])
            delegate: ItemDelegate {
                id: objectRow
                required property var modelData
                Layout.fillWidth: true
                implicitHeight: 52
                highlighted: modelData.key === root.selected.key
                onClicked: root.picked(modelData)
                ToolTip.visible: hovered
                ToolTip.text: modelData.collection + " [" + modelData.index + "]"
                contentItem: ColumnLayout {
                    Label {
                        text: objectRow.modelData.detector + " " + objectRow.modelData.kind + " " + (objectRow.modelData.index + 1)
                        font.pixelSize: 11
                        elide: Text.ElideMiddle
                        Layout.fillWidth: true
                    }
                    Label {
                        text: objectRow.modelData.energy !== undefined ? objectRow.modelData.energy.toFixed(1) + " MeV · " + objectRow.modelData.count + " hits" : objectRow.modelData.representation
                        font.pixelSize: 10
                        color: "#637386"
                        Layout.fillWidth: true
                        elide: Text.ElideRight
                    }
                }
            }
        }
        Label {
            visible: !(root.eventData.clusters || []).length && !(root.eventData.tracks || []).length
            text: "No reconstructed clusters or tracks exported for this event. Enable calorimeter clustering in a recipe or open reconstructed data."
            Layout.leftMargin: 14
            Layout.rightMargin: 14
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            color: "#7a8797"
            font.pixelSize: 11
        }
        ToolButton {
            text: root.collectionsVisible ? "▾  Data collections" : "▸  Data collections"
            checkable: true
            checked: root.collectionsVisible
            onClicked: root.collectionsVisible = checked
            Layout.leftMargin: 8
            Layout.topMargin: 10
            font.pixelSize: 11
        }
        Repeater {
            model: root.collectionsVisible ? root.eventData.collections || [] : []
            delegate: Label {
                required property var modelData
                Layout.leftMargin: 14
                Layout.rightMargin: 14
                Layout.fillWidth: true
                text: modelData.name + "\n" + (modelData.count === undefined ? "Metadata" : modelData.count + " " + modelData.category)
                elide: Text.ElideMiddle
                font.pixelSize: 10
                color: "#637386"
            }
        }
        Repeater {
            model: root.eventData.warnings || []
            delegate: Label {
                required property string modelData
                text: modelData
                Layout.fillWidth: true
                Layout.margins: 14
                wrapMode: Text.WordWrap
                font.pixelSize: 11
                color: "#9c6328"
            }
        }
        Item {
            implicitHeight: 12
        }
    }
}
