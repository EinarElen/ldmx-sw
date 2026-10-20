pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Dialog {
    id: editor
    title: "Geant4 user hooks"
    width: 570
    height: Math.min(700, parent.height - 32)
    modal: true
    standardButtons: Dialog.Close
    function loadHooks(blocks) {
        trace.checked = false;
        keep.checked = false;
        photonuclear.checked = false;
        trackId.value = 1;
        depth.value = 0;
        process.currentIndex = 0;
        for (const block of blocks) {
            if (block.type === "step_trace") {
                trackId.value = block.trackId;
                depth.value = block.depth;
                trace.checked = true;
            } else if (block.type === "keep_process") {
                process.currentIndex = ["eBrem", "conv", "photonNuclear", "electronNuclear"].indexOf(block.process);
                keep.checked = true;
            } else if (block.type === "photonuclear")
                photonuclear.checked = true;
        }
    }
    readonly property var hooks: {
        const blocks = [];
        if (trace.checked)
            blocks.push({
                type: "step_trace",
                trackId: trackId.value,
                depth: depth.value
            });
        if (keep.checked)
            blocks.push({
                type: "keep_process",
                process: process.currentText
            });
        if (photonuclear.checked)
            blocks.push({
                type: "photonuclear"
            });
        return blocks;
    }
    component Note: Label {
        Layout.fillWidth: true
        wrapMode: Text.WordWrap
        color: "#637386"
        font.pixelSize: 12
    }
    component Rule: Rectangle {
        Layout.fillWidth: true
        implicitHeight: 1
        color: "#dbe1e8"
        Layout.topMargin: 7
        Layout.bottomMargin: 7
    }
    contentItem: ScrollView {
        id: scroll
        contentWidth: availableWidth
        clip: true
        ColumnLayout {
            width: scroll.availableWidth
            spacing: 9
            Note {
                text: "Combine optional blocks for this simulation. Changes appear immediately in the Python preview and are saved with the run."
            }
            Rule {}
            CheckBox {
                id: trace
                text: "Print track steps"
                font.weight: Font.DemiBold
            }
            Note {
                text: "On each matching step → print to the run console. Track IDs restart for each event; 1 is the primary electron."
            }
            RowLayout {
                enabled: trace.checked
                Label {
                    text: "Track ID"
                }
                SpinBox {
                    id: trackId
                    from: 1
                    to: 2147483647
                    value: 1
                    editable: true
                }
                Label {
                    text: "Descendant depth"
                }
                SpinBox {
                    id: depth
                    from: 0
                    to: 3
                    value: 0
                    editable: true
                }
            }
            Note {
                text: "Depth 0 traces only that track. Including descendants can produce large logs."
            }
            Rule {}
            CheckBox {
                id: keep
                text: "Keep tracks from a process"
                font.weight: Font.DemiBold
            }
            Note {
                text: "After tracking → retain matching tracks in SimParticles. The creator-process name must contain the selected text."
            }
            RowLayout {
                enabled: keep.checked
                Label {
                    text: "Creator process"
                }
                ComboBox {
                    id: process
                    Layout.fillWidth: true
                    model: ["eBrem", "conv", "photonNuclear", "electronNuclear"]
                }
            }
            Note {
                text: "eBrem: electron bremsstrahlung · conv: photon conversion. Changes stored truth, not event selection; can substantially increase output size."
            }
            Rule {}
            CheckBox {
                id: photonuclear
                text: "Record photonuclear interactions"
                font.weight: Font.DemiBold
            }
            Note {
                text: "Collect photonuclear interaction details and descendants in ROOT when an interaction occurs. This does not increase their rate."
            }
            Note {
                text: "The event view currently displays hits; particle and interaction details remain in the ROOT output."
            }
        }
    }
}
