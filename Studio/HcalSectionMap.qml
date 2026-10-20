pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls

Item {
    id: root
    property int section: 0
    property var hits: []
    signal chosen(int section)
    implicitWidth: 178
    implicitHeight: 76
    Repeater {
        model: [
            {
                name: "Back",
                section: 0,
                x: 60,
                y: 26
            },
            {
                name: "Top",
                section: 1,
                x: 60,
                y: 0
            },
            {
                name: "Bottom",
                section: 2,
                x: 60,
                y: 52
            },
            {
                name: "Right",
                section: 3,
                x: 120,
                y: 26
            },
            {
                name: "Left",
                section: 4,
                x: 0,
                y: 26
            }
        ]
        delegate: Button {
            id: tile
            required property var modelData
            objectName: "hcalSection" + modelData.section
            x: modelData.x
            y: modelData.y
            width: 58
            height: 24
            text: modelData.name
            checkable: true
            autoExclusive: true
            checked: root.section === modelData.section
            readonly property int hitCount: root.hits.filter(h => h.section === modelData.section).length
            onClicked: root.chosen(modelData.section)
            Accessible.name: "HCal " + modelData.name + ", " + hitCount + " hits"
            contentItem: Text {
                text: tile.text
                color: tile.checked ? "#ffffff" : tile.hitCount ? "#001f3f" : "#7b8999"
                font.pixelSize: 10
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                radius: 3
                color: tile.checked ? "#0074d9" : tile.hovered ? "#dceaf8" : tile.hitCount ? "#e7f1fb" : "#f1f4f8"
                border.color: tile.activeFocus ? "#001f3f" : "transparent"
            }
            ToolTip.visible: hovered
            ToolTip.text: tile.modelData.name + " · " + tile.hitCount + " hits above threshold. Schematic section selector."
        }
    }
}
