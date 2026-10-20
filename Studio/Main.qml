pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls
import QtQuick.Dialogs
import QtQuick.Layouts
import QtCore
import LdmxStudio

ApplicationWindow {
    id: window
    width: 1600
    height: 1000
    minimumWidth: 1240
    minimumHeight: 820
    visible: true
    title: (studyStore.study.title || "LDMX") + " — Studio"
    color: "#eef2f6"
    font.family: Qt.platform.os === "osx" ? "Helvetica Neue" : "Sans Serif"
    font.pixelSize: 13
    palette {
        window: "#ffffff"
        windowText: "#001f3f"
        base: "#ffffff"
        alternateBase: "#f4f6f9"
        text: "#001f3f"
        button: "#f1f4f8"
        buttonText: "#001f3f"
        highlight: "#0074d9"
        highlightedText: "#ffffff"
        mid: "#b8c3ce"
        dark: "#a0acb9"
        light: "#ffffff"
        placeholderText: "#8190a0"
    }
    StudioController {
        id: studio
        objectName: "studioController"
    }
    StudyStore {
        id: studyStore
        objectName: "studyStore"
        workspace: studio.workspace
    }
    Settings {
        id: settings
        category: "studio-workbench"
        property var horizontal
        property var vertical
    }
    property int page: 0
    property int outputTab: 0
    property bool outputVisible: false
    property string archivedText: ""
    property string archivedLabel: "Run output"
    property var runOptions: {
        const options = Object.assign({}, studyStore.recipe);
        if (options.mode === "reprocess")
            options.hooks = [];
        return options;
    }
    property string configText: studio.preview(runOptions)
    property string validationError: studio.validation(runOptions)
    function openEvents(path) {
        if (!studio.busy) {
            studyStore.attachFile(path);
            studio.inspect(path);
            page = 3;
        }
    }
    function runRecipe() {
        if (!studio.busy && validationError.length === 0 && studyStore.save()) {
            studio.run(studyStore.recipeForRun());
            studyStore.refreshRuns();
            outputTab = 1;
            outputVisible = true;
        }
    }
    onClosing: close => {
        if (studio.busy) {
            close.accepted = false;
            closeDialog.open();
            return;
        }
        if (!studyStore.save()) {
            close.accepted = false;
            return;
        }
        settings.horizontal = horizontal.saveState();
        settings.vertical = vertical.saveState();
    }
    Component.onCompleted: {
        if (settings.horizontal)
            horizontal.restoreState(settings.horizontal);
        if (settings.vertical)
            vertical.restoreState(settings.vertical);
        if (Qt.application.arguments.indexOf("--example") !== -1)
            studio.showExample();
    }
    Connections {
        target: studio
        function onEventChanged() {
            if (studio.eventCount > 0) {
                window.page = 3;
                if (studio.event.file)
                    studyStore.attachFile(studio.event.file);
            }
        }
        function onChanged() {
            if (!studio.busy)
                studyStore.refreshRuns();
        }
    }
    Shortcut {
        sequence: "Ctrl+Return"
        onActivated: window.runRecipe()
    }
    Shortcut {
        sequences: [StandardKey.Save]
        onActivated: studyStore.save()
    }
    Shortcut {
        sequences: [StandardKey.Open]
        onActivated: {
            rootFile.purpose = "inspect";
            rootFile.open();
        }
    }
    component Caption: Label {
        color: "#7b8999"
        font.pixelSize: 10
        font.weight: Font.DemiBold
        font.letterSpacing: 1
    }
    component DocTab: Button {
        id: tab
        checkable: true
        implicitHeight: 38
        horizontalPadding: 20
        contentItem: Text {
            text: tab.text
            color: tab.checked ? "#0074d9" : "#637386"
            font: tab.font
            verticalAlignment: Text.AlignVCenter
            horizontalAlignment: Text.AlignHCenter
        }
        background: Rectangle {
            color: tab.checked ? "white" : tab.hovered ? "#f0f4f9" : "#f6f8fb"
            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width
                height: tab.checked ? 2 : 1
                color: tab.checked ? "#0074d9" : "#dbe1e8"
            }
        }
    }
    header: Rectangle {
        height: 58
        color: "white"
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 18
            anchors.rightMargin: 18
            spacing: 14
            Image {
                source: "assets/ldmx.svg"
                Layout.preferredWidth: 100
                Layout.preferredHeight: 33
                fillMode: Image.PreserveAspectFit
                sourceSize.width: 300
            }
            Label {
                text: "Studio"
                font.pixelSize: 21
                font.weight: Font.Light
            }
            Rectangle {
                implicitWidth: 1
                implicitHeight: 24
                color: "#dbe1e8"
            }
            Label {
                text: studyStore.study.title || "Study"
                font.weight: Font.Medium
                Layout.fillWidth: true
                elide: Text.ElideRight
            }
            Label {
                text: "LDMX v15  /  8 GeV"
                font.pixelSize: 11
                color: "#637386"
            }
            ToolButton {
                text: "Study ▾"
                onClicked: studyMenu.popup()
            }
            Button {
                text: "Environment…"
                enabled: !studio.busy
                onClicked: environment.open()
            }
            Button {
                text: "Open events…"
                enabled: !studio.busy
                onClicked: {
                    rootFile.purpose = "inspect";
                    rootFile.open();
                }
            }
            Button {
                id: runButton
                text: studio.busy ? "Cancel operation" : "▶  Run recipe"
                highlighted: !studio.busy
                enabled: studio.busy || window.validationError.length === 0
                onClicked: studio.busy ? studio.cancel() : window.runRecipe()
                contentItem: Text {
                    text: runButton.text
                    color: runButton.enabled ? "white" : "#a8b6c5"
                    font: runButton.font
                    verticalAlignment: Text.AlignVCenter
                    horizontalAlignment: Text.AlignHCenter
                }
                background: Rectangle {
                    color: runButton.enabled ? "#0074d9" : "#e4eaf0"
                    radius: 3
                }
            }
        }
        Rectangle {
            anchors.bottom: parent.bottom
            width: parent.width
            height: 1
            color: "#dbe1e8"
        }
    }
    Menu {
        id: studyMenu
        MenuItem {
            text: "New study"
            enabled: !studio.busy
            onTriggered: {
                studyStore.newStudy("Untitled study");
                window.page = 0;
            }
        }
        MenuItem {
            text: "Open saved study…"
            enabled: !studio.busy
            onTriggered: savedStudies.open()
        }
        MenuItem {
            text: "Save study"
            onTriggered: studyStore.save()
        }
    }
    SplitView {
        id: horizontal
        anchors.fill: parent
        orientation: Qt.Horizontal
        handle: Rectangle {
            implicitWidth: 1
            color: SplitHandle.hovered ? "#0074d9" : "#dbe1e8"
        }
        Rectangle {
            SplitView.preferredWidth: 216
            SplitView.minimumWidth: 175
            SplitView.maximumWidth: 360
            color: "#f5f7fa"
            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 12
                Caption {
                    text: "EXPLORER"
                    Layout.topMargin: 5
                }
                Label {
                    text: studyStore.study.title || "Study"
                    font.pixelSize: 15
                    font.weight: Font.DemiBold
                    Layout.fillWidth: true
                    elide: Text.ElideRight
                }
                ItemDelegate {
                    text: "Study notes / datasets"
                    palette.highlightedText: "#0074d9"
                    Layout.fillWidth: true
                    highlighted: window.page === 0
                    onClicked: window.page = 0
                }
                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 1
                    color: "#dbe1e8"
                }
                RowLayout {
                    Caption {
                        text: "RECIPES"
                        Layout.fillWidth: true
                    }
                    ToolButton {
                        text: "+"
                        implicitHeight: 24
                        onClicked: {
                            studyStore.duplicateRecipe();
                            window.page = 1;
                        }
                        ToolTip.visible: hovered
                        ToolTip.text: "Duplicate the active recipe"
                    }
                }
                ListView {
                    Layout.fillWidth: true
                    Layout.preferredHeight: Math.min(220, contentHeight)
                    clip: true
                    model: studyStore.recipes
                    delegate: ItemDelegate {
                        required property var modelData
                        required property int index
                        width: ListView.view.width
                        height: 44
                        highlighted: index === studyStore.activeRecipe
                        palette.highlightedText: "#0074d9"
                        text: modelData.name
                        onClicked: {
                            studyStore.selectRecipe(index);
                            window.page = 1;
                        }
                    }
                }
                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 1
                    color: "#dbe1e8"
                }
                Caption {
                    text: "WORKSPACE"
                }
                ItemDelegate {
                    text: "Runs and outputs"
                    palette.highlightedText: "#0074d9"
                    Layout.fillWidth: true
                    highlighted: window.page === 2
                    onClicked: {
                        studyStore.refreshRuns();
                        window.page = 2;
                    }
                }
                ItemDelegate {
                    text: "Detector analysis"
                    palette.highlightedText: "#0074d9"
                    Layout.fillWidth: true
                    highlighted: window.page === 3
                    onClicked: window.page = 3
                }
                Caption {
                    text: "ATTACHED DATA"
                    Layout.topMargin: 8
                }
                ListView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    model: studyStore.study.files || []
                    delegate: ItemDelegate {
                        required property string modelData
                        width: ListView.view.width
                        text: modelData.split("/").pop()
                        enabled: !studio.busy
                        onClicked: window.openEvents(modelData)
                        ToolTip.visible: hovered
                        ToolTip.text: modelData
                    }
                }
                Label {
                    text: "Host Qt 6\nExecution through denv"
                    font.pixelSize: 11
                    color: "#7b8999"
                    lineHeight: 1.4
                }
            }
        }
        SplitView {
            id: vertical
            orientation: Qt.Vertical
            SplitView.fillWidth: true
            SplitView.minimumWidth: 750
            handle: Rectangle {
                implicitHeight: 5
                color: SplitHandle.hovered ? "#c6dcf4" : "#e7ecf2"
            }
            ColumnLayout {
                SplitView.fillHeight: true
                SplitView.minimumHeight: 430
                spacing: 0
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 0
                    DocTab {
                        text: "Study"
                        checked: window.page === 0
                        onClicked: window.page = 0
                    }
                    DocTab {
                        text: "Recipe"
                        checked: window.page === 1
                        onClicked: window.page = 1
                    }
                    DocTab {
                        text: "Runs"
                        checked: window.page === 2
                        onClicked: {
                            studyStore.refreshRuns();
                            window.page = 2;
                        }
                    }
                    DocTab {
                        text: "Analysis"
                        checked: window.page === 3
                        onClicked: window.page = 3
                    }
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: 38
                        color: "#f6f8fb"
                        Rectangle {
                            anchors.bottom: parent.bottom
                            width: parent.width
                            height: 1
                            color: "#dbe1e8"
                        }
                    }
                }
                StackLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    currentIndex: window.page
                    StudyPage {
                        store: studyStore
                        onOpenFile: path => window.openEvents(path)
                        onAttachFile: {
                            rootFile.purpose = "attach";
                            rootFile.open();
                        }
                        onNavigate: value => window.page = value
                    }
                    RecipeEditor {
                        objectName: "recipeEditor"
                        store: studyStore
                        controller: studio
                        onShowPython: {
                            window.outputTab = 0;
                            window.outputVisible = true;
                        }
                        onChooseInput: {
                            rootFile.purpose = "input";
                            rootFile.open();
                        }
                    }
                    RunPage {
                        store: studyStore
                        controller: studio
                        onOpenFile: path => window.openEvents(path)
                        onRestoreRecipe: window.page = 1
                        onShowText: (text, label) => {
                            window.archivedText = text;
                            window.archivedLabel = label;
                            window.outputTab = 2;
                            window.outputVisible = true;
                        }
                    }
                    AnalysisWorkspace {
                        id: analysis
                        objectName: "analysisWorkspace"
                        controller: studio
                        store: studyStore
                    }
                }
            }
            Rectangle {
                visible: window.outputVisible
                SplitView.preferredHeight: 165
                SplitView.minimumHeight: 90
                color: "#fbfcfe"
                ColumnLayout {
                    anchors.fill: parent
                    spacing: 0
                    RowLayout {
                        Layout.fillWidth: true
                        Layout.leftMargin: 10
                        Layout.rightMargin: 8
                        spacing: 4
                        ToolButton {
                            text: "Python recipe"
                            checked: window.outputTab === 0
                            checkable: true
                            onClicked: window.outputTab = 0
                            font.pixelSize: 11
                        }
                        ToolButton {
                            text: "Live console"
                            checked: window.outputTab === 1
                            checkable: true
                            onClicked: window.outputTab = 1
                            font.pixelSize: 11
                        }
                        ToolButton {
                            text: window.archivedLabel
                            visible: window.archivedText.length > 0
                            checked: window.outputTab === 2
                            checkable: true
                            onClicked: window.outputTab = 2
                            font.pixelSize: 11
                        }
                        Item {
                            Layout.fillWidth: true
                        }
                        Label {
                            text: window.outputTab === 0 ? "Generated · read only" : studio.busy ? "denv running" : ""
                            font.pixelSize: 10
                            color: "#7a8797"
                        }
                        ToolButton {
                            text: "×"
                            onClicked: window.outputVisible = false
                            implicitHeight: 28
                        }
                    }
                    ScrollView {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        Layout.leftMargin: 12
                        Layout.rightMargin: 12
                        clip: true
                        TextArea {
                            text: window.outputTab === 0 ? window.configText : window.outputTab === 1 ? studio.log : window.archivedText
                            readOnly: true
                            selectByMouse: true
                            font.family: Qt.platform.os === "osx" ? "Menlo" : "monospace"
                            font.pixelSize: 11
                            color: "#3a516c"
                            background: null
                            wrapMode: TextEdit.NoWrap
                            onTextChanged: if (window.outputTab === 1)
                                cursorPosition = length
                        }
                    }
                }
            }
        }
        Rectangle {
            visible: window.page === 3
            SplitView.preferredWidth: 248
            SplitView.minimumWidth: 200
            SplitView.maximumWidth: 400
            color: "#f6f8fb"
            Inspector {
                anchors.fill: parent
                eventData: studio.event
                selected: analysis.selected
                onPicked: record => analysis.selected = record
            }
        }
    }
    footer: Rectangle {
        color: "#eef2f6"
        height: 28
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 14
            anchors.rightMargin: 14
            Rectangle {
                implicitWidth: 5
                implicitHeight: 5
                radius: 2
                color: studio.busy ? "#be7237" : "#0074d9"
            }
            Label {
                text: studyStore.error || studio.status
                font.pixelSize: 11
                Layout.fillWidth: true
                elide: Text.ElideRight
                color: studyStore.error ? "#a33d2a" : "#38516e"
            }
            ToolButton {
                text: window.outputVisible ? "Hide output" : "Show output"
                font.pixelSize: 10
                implicitHeight: 24
                onClicked: window.outputVisible = !window.outputVisible
            }
            Label {
                text: studio.workspace
                font.pixelSize: 10
                color: "#7b8999"
                elide: Text.ElideLeft
                Layout.maximumWidth: 360
            }
        }
    }
    FileDialog {
        id: rootFile
        property string purpose: "inspect"
        title: "Choose an LDMX ROOT event file in the workspace"
        nameFilters: ["ROOT event files (*.root)"]
        onAccepted: {
            const path = studio.localPath(selectedFile);
            if (purpose === "input")
                studyStore.setOption("input", path);
            else if (purpose === "attach")
                studyStore.attachFile(path);
            else
                window.openEvents(path);
        }
    }
    FolderDialog {
        id: workspaceFolder
        title: "Choose the denv workspace"
        onAccepted: workspaceField.text = studio.localPath(selectedFolder)
    }
    Dialog {
        id: savedStudies
        anchors.centerIn: parent
        width: 470
        modal: true
        title: "Open study"
        standardButtons: Dialog.Close
        contentItem: ListView {
            implicitHeight: 300
            model: studyStore.studies
            clip: true
            delegate: ItemDelegate {
                required property var modelData
                width: ListView.view.width
                text: modelData.title
                onClicked: {
                    if (studyStore.openStudy(modelData.id)) {
                        savedStudies.close();
                        window.page = 0;
                    }
                }
            }
        }
    }
    Dialog {
        id: environment
        anchors.centerIn: parent
        width: 600
        modal: true
        title: "Execution environment"
        standardButtons: Dialog.Close
        ColumnLayout {
            anchors.fill: parent
            spacing: 14
            Label {
                text: "denv workspace"
                font.weight: Font.DemiBold
            }
            RowLayout {
                Layout.fillWidth: true
                TextField {
                    id: workspaceField
                    text: studio.workspace
                    Layout.fillWidth: true
                }
                Button {
                    text: "Browse…"
                    onClicked: workspaceFolder.open()
                }
            }
            Label {
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
                text: "The selected workspace must contain .denv/config and an installed LDMX environment. Studio and study editing run on the host."
                color: "#637386"
            }
            RowLayout {
                Button {
                    text: "Check environment"
                    enabled: !studio.busy
                    onClicked: {
                        studio.workspace = workspaceField.text;
                        studio.probe();
                        window.outputTab = 1;
                        window.outputVisible = true;
                        environment.close();
                    }
                }
                Label {
                    text: "Jobs"
                }
                SpinBox {
                    id: buildJobs
                    from: 1
                    to: 128
                    value: 2
                    editable: true
                }
                Button {
                    text: "Build + install"
                    enabled: !studio.busy
                    onClicked: {
                        studio.workspace = workspaceField.text;
                        studio.build(buildJobs.value);
                        window.outputTab = 1;
                        window.outputVisible = true;
                        environment.close();
                    }
                }
            }
            Label {
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
                text: "Build uses the existing workspace/build configuration. Configure the checkout with just configure first."
                color: "#637386"
                font.pixelSize: 12
            }
        }
    }
    Dialog {
        id: closeDialog
        anchors.centerIn: parent
        modal: true
        title: "A container operation is running"
        standardButtons: Dialog.Cancel | Dialog.Ok
        Label {
            text: "Cancel the operation, then close Studio once it stops."
        }
        onAccepted: studio.cancel()
    }
}
