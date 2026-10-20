pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Button {
    id: root
    required property int level
    required property string description
    checkable: true
    autoExclusive: true
    implicitHeight: 116
    padding: 13
    onCheckedChanged: glyph.requestPaint()
    Accessible.description: description
    background: Rectangle {
        radius: 8
        color: root.checked ? "#edf5fe" : root.hovered ? "#f5f8fc" : "white"
        border.color: root.checked || root.activeFocus ? "#0074d9" : "#dbe3ec"
        border.width: root.checked || root.activeFocus ? 2 : 1
    }
    contentItem: RowLayout {
        spacing: 12
        Canvas {
            id: glyph
            Layout.preferredWidth: 62
            Layout.preferredHeight: 64
            onPaint: {
                const c = getContext("2d");
                c.reset();
                const dots = [[12, 30], [24, 19], [27, 34], [36, 25], [40, 40], [48, 17], [50, 32], [32, 48]];
                c.fillStyle = root.checked ? "#0074d9" : "#6b8cae";
                for (let i = 0; i < dots.length; i++) {
                    const p = dots[i];
                    if (root.level === 0) {
                        c.beginPath();
                        c.arc(p[0], p[1], i % 3 + 1.5, 0, Math.PI * 2);
                        c.fill();
                    } else {
                        c.globalAlpha = .3 + (i % 4) * .2;
                        c.fillRect(p[0] - 3, p[1] - 3, 6, 6);
                    }
                }
                c.globalAlpha = 1;
                if (root.level === 2) {
                    c.strokeStyle = "#bd7548";
                    c.lineWidth = 1.5;
                    c.beginPath();
                    c.ellipse(11, 9, 46, 45);
                    c.stroke();
                    c.beginPath();
                    c.moveTo(27, 31);
                    c.lineTo(41, 31);
                    c.moveTo(34, 24);
                    c.lineTo(34, 38);
                    c.stroke();
                }
            }
        }
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6
            Label {
                text: root.text
                Layout.fillWidth: true
                font.weight: Font.DemiBold
                wrapMode: Text.WordWrap
                color: "#001f3f"
            }
            Label {
                text: root.description
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
                font.pixelSize: 11
                color: "#637386"
            }
        }
    }
}
