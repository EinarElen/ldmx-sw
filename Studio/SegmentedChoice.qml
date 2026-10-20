pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

RowLayout {
    id: root
    required property var choices
    property int currentIndex: 0
    signal chosen(int index)
    spacing: 3
    Repeater {
        model: root.choices
        delegate: Button {
            id: option
            required property string modelData
            required property int index
            Layout.fillWidth: true
            text: modelData
            checkable: true
            autoExclusive: true
            checked: root.currentIndex === index
            implicitHeight: 34
            horizontalPadding: 12
            onClicked: root.chosen(index)
            contentItem: Text {
                text: option.text
                font: option.font
                color: option.checked ? "#0074d9" : "#52677d"
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                radius: 5
                color: option.checked ? "#e8f2fc" : option.hovered ? "#edf1f6" : "#f4f6f9"
                border.color: option.activeFocus ? "#0074d9" : option.checked ? "#b5d4f1" : "transparent"
            }
        }
    }
}
