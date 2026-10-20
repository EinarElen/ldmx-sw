pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ScrollView {
    id: root
    required property var store
    signal openFile(string path)
    signal attachFile
    signal navigate(int page)
    contentWidth: availableWidth
    clip: true
    ColumnLayout {
        width: root.availableWidth
        spacing: 18
        Label {
            text: "Study workspace"
            font.pixelSize: 27
            font.weight: Font.Light
            Layout.topMargin: 24
            Layout.leftMargin: 24
        }
        Label {
            text: "Recipes, run history, event files and analysis layouts stay together."
            color: "#637386"
            Layout.leftMargin: 24
        }
        TextField {
            Layout.fillWidth: true
            Layout.leftMargin: 24
            Layout.rightMargin: 24
            text: root.store.study.title || ""
            font.pixelSize: 20
            onEditingFinished: root.store.setTitle(text)
        }
        Label {
            text: "STUDY NOTES"
            font.pixelSize: 11
            color: "#637386"
            font.letterSpacing: 1
            Layout.leftMargin: 24
        }
        TextArea {
            Layout.fillWidth: true
            Layout.leftMargin: 24
            Layout.rightMargin: 24
            Layout.preferredHeight: 160
            text: root.store.study.notes || ""
            placeholderText: "What are you investigating? Record assumptions, comparisons and next steps here."
            wrapMode: TextEdit.Wrap
            selectByMouse: true
            onTextChanged: if (activeFocus)
                root.store.setNotes(text)
            background: Rectangle {
                color: "#fafbfd"
                border.color: "#dbe1e8"
                radius: 4
            }
        }
        RowLayout {
            Layout.fillWidth: true
            Layout.leftMargin: 24
            Layout.rightMargin: 24
            Label {
                text: "Event datasets"
                font.pixelSize: 17
                font.weight: Font.Medium
            }
            Item {
                Layout.fillWidth: true
            }
            Button {
                text: "Attach LDMX file…"
                onClicked: root.attachFile()
            }
        }
        Repeater {
            model: root.store.study.files || []
            delegate: ItemDelegate {
                required property string modelData
                Layout.fillWidth: true
                Layout.leftMargin: 24
                Layout.rightMargin: 24
                text: modelData
                onClicked: root.openFile(modelData)
            }
        }
        Label {
            visible: !(root.store.study.files || []).length
            text: "Attach an existing event file, or generate one from a recipe. Run outputs are available in the Runs document."
            Layout.fillWidth: true
            Layout.leftMargin: 24
            Layout.rightMargin: 24
            color: "#637386"
            wrapMode: Text.WordWrap
        }
        Rectangle {
            Layout.fillWidth: true
            Layout.leftMargin: 24
            Layout.rightMargin: 24
            implicitHeight: 1
            color: "#dbe1e8"
        }
        RowLayout {
            Layout.leftMargin: 24
            spacing: 12
            Button {
                text: "Edit recipe →"
                onClicked: root.navigate(1)
            }
            Button {
                text: "Review runs →"
                onClicked: root.navigate(2)
            }
            Button {
                text: "Analysis workspace →"
                onClicked: root.navigate(3)
            }
        }
        Label {
            Layout.fillWidth: true
            Layout.margins: 24
            wrapMode: Text.WordWrap
            color: "#637386"
            font.pixelSize: 12
            text: "LDMX v15 / 8 GeV workspace\nStudies save automatically under .ldmx-studio/studies. Each execution has a separate recipe, Python configuration, log and ROOT outputs."
        }
    }
}
