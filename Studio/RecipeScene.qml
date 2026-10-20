pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Rectangle {
    id: root
    required property int level
    required property bool fromFile
    property int selectedStage: 1
    signal stageSelected(int stage)
    color: "#fbfcfe"
    radius: 8
    border.color: "#e0e7ef"
    implicitHeight: 260
    onLevelChanged: scene.requestPaint()
    onFromFileChanged: scene.requestPaint()
    onSelectedStageChanged: scene.requestPaint()
    Label {
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.margins: 16
        text: "YOUR EXPERIMENT"
        color: "#7b8999"
        font.pixelSize: 10
        font.letterSpacing: 1.3
    }
    Label {
        anchors.top: parent.top
        anchors.right: parent.right
        anchors.margins: 16
        text: "Schematic · select a stage"
        color: "#7b8999"
        font.pixelSize: 10
    }
    Canvas {
        id: scene
        anchors.fill: parent
        anchors.topMargin: 42
        anchors.bottomMargin: 66
        onWidthChanged: requestPaint()
        onHeightChanged: requestPaint()
        onPaint: {
            const c = getContext("2d");
            c.reset();
            const y = height / 2;
            const centers = [.125, .375, .625, .875].map(v => width * v);
            c.fillStyle = "#edf5fe";
            c.fillRect(root.selectedStage * width / 4 + 8, 0, width / 4 - 16, height);
            c.strokeStyle = "#d2dfed";
            c.lineWidth = 1.5;
            c.beginPath();
            c.moveTo(centers[0], y);
            c.lineTo(centers[3], y);
            c.stroke();
            for (let i = 0; i < 3; i++) {
                const x = (centers[i] + centers[i + 1]) / 2;
                c.beginPath();
                c.moveTo(x - 4, y - 4);
                c.lineTo(x, y);
                c.lineTo(x - 4, y + 4);
                c.stroke();
            }
            // Explanatory diagram, not simulated data or physical geometry.
            c.strokeStyle = "#0074d9";
            c.fillStyle = "#0074d9";
            c.lineWidth = 2;
            if (root.fromFile) {
                for (let i = 2; i >= 0; i--) {
                    c.fillStyle = "#f1f6fc";
                    c.fillRect(centers[0] - 20 + i * 5, y - 25 - i * 5, 35, 46);
                    c.strokeRect(centers[0] - 20 + i * 5, y - 25 - i * 5, 35, 46);
                }
            } else {
                c.beginPath();
                c.moveTo(centers[0] - 36, y);
                c.lineTo(centers[0] + 28, y);
                c.stroke();
                c.beginPath();
                c.arc(centers[0], y, 6, 0, Math.PI * 2);
                c.fill();
                c.beginPath();
                c.moveTo(centers[0] + 20, y - 6);
                c.lineTo(centers[0] + 28, y);
                c.lineTo(centers[0] + 20, y + 6);
                c.stroke();
            }
            const detector = centers[1];
            c.fillStyle = "#8fa8c1";
            for (let i = 0; i < 4; i++)
                c.fillRect(detector - 46 + i * 9, y - 20, 2, 40);
            c.fillStyle = "#bd7548";
            c.fillRect(detector - 7, y - 24, 3, 48);
            c.fillStyle = "#6b8cae";
            for (let i = 0; i < 6; i++)
                c.fillRect(detector + 5 + i * 5, y - 32, 3, 64);
            c.fillStyle = "#c9d6e3";
            for (let i = 0; i < 4; i++)
                c.fillRect(detector + 40 + i * 5, y - 42, 3, 84);
            c.globalAlpha = root.level >= 1 ? 1 : .22;
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const d = Math.abs(row - 2) + Math.abs(col - 2);
                    c.fillStyle = d < 2 ? "#0074d9" : d < 3 ? "#7fb4e4" : "#dceaf7";
                    c.fillRect(centers[2] - 27 + col * 11, y - 27 + row * 11, 9, 9);
                }
            }
            c.globalAlpha = root.level === 2 ? 1 : .22;
            c.fillStyle = "#bd7548";
            for (let i = 0; i < 15; i++) {
                const a = i * 2.4, r = 5 + (i % 5) * 5;
                c.beginPath();
                c.arc(centers[3] + Math.cos(a) * r, y + Math.sin(a) * r, 2.5, 0, Math.PI * 2);
                c.fill();
            }
            c.strokeStyle = "#0074d9";
            c.lineWidth = 1.5;
            c.beginPath();
            c.ellipse(centers[3] - 30, y - 30, 60, 60);
            c.stroke();
            c.globalAlpha = 1;
        }
        MouseArea {
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            onClicked: mouse => root.stageSelected(Math.min(3, Math.floor(mouse.x / width * 4)))
        }
    }
    RowLayout {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        anchors.margins: 12
        spacing: 6
        Repeater {
            model: [root.fromFile ? "Existing events" : "Electron beam", "LDMX detector", "Detector response", "Showers & clusters"]
            delegate: Button {
                id: stage
                required property string modelData
                required property int index
                objectName: "recipeStage" + index
                Layout.fillWidth: true
                Layout.preferredWidth: 1
                text: modelData
                checkable: true
                autoExclusive: true
                checked: root.selectedStage === index
                onClicked: root.stageSelected(index)
                implicitHeight: 44
                contentItem: Text {
                    text: stage.text
                    color: stage.checked ? "#0074d9" : "#52677d"
                    font.pixelSize: 11
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    wrapMode: Text.WordWrap
                }
                background: Rectangle {
                    radius: 5
                    color: stage.checked ? "#e8f2fc" : stage.hovered ? "#edf2f7" : "transparent"
                    border.color: stage.activeFocus ? "#0074d9" : "transparent"
                    Rectangle {
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.top: parent.top
                        width: 24
                        height: 2
                        color: stage.checked ? "#0074d9" : "transparent"
                    }
                }
            }
        }
    }
}
