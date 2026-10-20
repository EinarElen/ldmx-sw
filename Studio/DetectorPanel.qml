pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "ViewMath.js" as V

Rectangle {
    id: root
    objectName: "detectorPanel"
    required property var eventData
    required property int mode
    required property string source
    required property real threshold
    required property var selected
    property bool focused: false
    property string collection: ""
    property int layerIndex: -1
    property int section: 0
    property int projection: 0
    property bool overlays: true
    property bool truthLines: false
    property bool dataDetails: false
    readonly property var candidates: V.collections(eventData, mode, source)
    readonly property var hits: V.filteredHits(eventData, mode, source, collection, threshold)
    readonly property var sliceHits: hits.filter(h => (mode !== 1 || layerIndex < 0 || h.layer === layerIndex) && (mode !== 2 || h.section === section))
    readonly property var clusters: (eventData.clusters || []).filter(c => c.detector === V.subsystem(mode))
    readonly property var tracks: eventData.tracks || []
    signal changeMode(int value)
    signal focusRequested
    signal picked(var record)
    color: "white"
    border.color: "#dbe1e8"
    clip: true
    onEventDataChanged: {
        if (!candidates.some(c => c.name === collection))
            collection = "";
    }
    onSourceChanged: collection = ""
    onModeChanged: {
        collection = "";
        layerIndex = -1;
        section = 0;
        projection = 0;
    }
    onHitsChanged: if (mode === 2 && hits.length && !hits.some(h => h.section === section))
        section = hits[0].section
    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 1
        spacing: 0
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: 38
            color: "#f6f8fb"
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 8
                spacing: 6
                ComboBox {
                    Layout.fillWidth: true
                    implicitHeight: 30
                    model: ["Detector overview · 3D", "ECal · shower & layers", "HCal · sections & strips", "Tracking · tagger / recoil / TS", "TS · module & bar occupancy"]
                    currentIndex: root.mode
                    onActivated: root.changeMode(currentIndex)
                    background: Rectangle {
                        color: "transparent"
                    }
                }
                ToolButton {
                    text: "Data"
                    checkable: true
                    checked: root.dataDetails
                    onClicked: root.dataDetails = checked
                    ToolTip.visible: hovered
                    ToolTip.text: "Choose an exact collection or processing pass"
                }
                ToolButton {
                    text: root.focused ? "⊞" : "⛶"
                    onClicked: root.focusRequested()
                    ToolTip.visible: hovered
                    ToolTip.text: root.focused ? "Restore multi-view" : "Focus this view"
                }
            }
        }
        RowLayout {
            Layout.fillWidth: true
            Layout.leftMargin: 9
            Layout.rightMargin: 9
            spacing: 6
            ComboBox {
                visible: root.dataDetails
                Layout.fillWidth: true
                implicitHeight: 27
                model: ["First collection / subsystem"].concat(root.candidates.map(c => c.name))
                currentIndex: root.collection ? root.candidates.findIndex(c => c.name === root.collection) + 1 : 0
                onActivated: root.collection = currentIndex ? root.candidates[currentIndex - 1].name : ""
                font.pixelSize: 10
            }
            ComboBox {
                visible: root.mode === 1
                implicitHeight: 27
                implicitWidth: 102
                font.pixelSize: 10
                model: ["All layers"].concat(Array.from({
                    length: 34
                }, (_, i) => "Layer " + i))
                currentIndex: root.layerIndex + 1
                onActivated: root.layerIndex = currentIndex - 1
            }
            HcalSectionMap {
                visible: root.mode === 2
                section: root.section
                hits: root.hits
                onChosen: value => root.section = value
            }
            Item {
                Layout.fillWidth: true
            }
            ComboBox {
                visible: root.mode > 0 && root.mode < 4
                implicitHeight: 27
                implicitWidth: 90
                font.pixelSize: 10
                model: root.mode === 1 ? ["XY", "ZX"] : root.mode === 2 ? ["Strips", "Time"] : ["ZX", "ZY"]
                currentIndex: root.projection
                onActivated: root.projection = currentIndex
            }
        }
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.minimumHeight: 90
            DetectorView {
                id: overview
                visible: root.mode === 0
                anchors.fill: parent
                hits: root.hits.filter(h => h.position).map(h => V.related(h, root.selected) ? Object.assign({}, h, {
                        color: "#0074d9"
                    }) : h)
            }
            DetectorPlot {
                id: detectorPlot
                objectName: "detectorPlot"
                visible: root.mode !== 0
                anchors.fill: parent
                mode: root.mode
                hits: root.hits
                clusters: root.clusters
                tracks: root.tracks
                selected: root.selected
                layerIndex: root.layerIndex
                section: root.section
                projection: root.projection
                overlays: root.overlays
                connectTruth: root.truthLines
                onPicked: record => root.picked(record)
                onLayerPicked: value => root.layerIndex = value
            }
        }
        RowLayout {
            Layout.fillWidth: true
            Layout.leftMargin: 10
            Layout.rightMargin: 10
            Layout.bottomMargin: 5
            spacing: 5
            Label {
                text: root.sliceHits.length + " hits · " + V.sum(root.sliceHits).toFixed(1) + " MeV"
                font.pixelSize: 10
                color: "#637386"
                ToolTip.visible: footerHover.hovered
                ToolTip.text: "Sum in the selected hit collections and layer or section, above threshold. Simulated deposits and reconstructed energy are separate."
                HoverHandler {
                    id: footerHover
                }
            }
            Item {
                Layout.fillWidth: true
            }
            CheckBox {
                visible: root.mode === 1 || root.mode === 3
                text: "Reco overlays"
                checked: root.overlays
                font.pixelSize: 10
                implicitHeight: 26
                onToggled: root.overlays = checked
            }
            CheckBox {
                visible: root.mode === 3
                text: "Truth links"
                checked: root.truthLines
                font.pixelSize: 10
                implicitHeight: 26
                onToggled: root.truthLines = checked
                ToolTip.visible: hovered
                ToolTip.text: "Connect hits with the same simulation track ID. Lines are guides, not propagated trajectories."
            }
            ToolButton {
                text: "Reset"
                font.pixelSize: 10
                implicitHeight: 24
                onClicked: {
                    overview.resetCamera();
                    detectorPlot.zoom = 1;
                    detectorPlot.panX = 0;
                    detectorPlot.panY = 0;
                    root.layerIndex = -1;
                }
                ToolTip.visible: hovered
                ToolTip.text: "Reset view. Scroll to zoom; drag to pan or orbit."
            }
        }
    }
}
