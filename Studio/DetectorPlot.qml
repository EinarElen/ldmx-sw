pragma ComponentBehavior: Bound
import QtQuick
import "ViewMath.js" as V

Item {
    id: root
    required property int mode
    required property var hits
    property var clusters: []
    property var tracks: []
    property var selected: ({})
    property int layerIndex: -1
    property int section: 0
    property int projection: 0
    property bool overlays: true
    property bool connectTruth: false
    property real zoom: 1
    property real panX: 0
    property real panY: 0
    property var plotRange: ({
            x: 1,
            y: 1
        })
    property var marks: []
    signal picked(var record)
    signal layerPicked(int layer)
    function repaint() {
        plot.requestPaint();
    }
    onHitsChanged: repaint()
    onClustersChanged: repaint()
    onTracksChanged: repaint()
    onSelectedChanged: repaint()
    onLayerIndexChanged: repaint()
    onSectionChanged: repaint()
    onProjectionChanged: {
        zoom = 1;
        panX = 0;
        panY = 0;
        repaint();
    }
    onModeChanged: {
        zoom = 1;
        panX = 0;
        panY = 0;
        repaint();
    }
    onOverlaysChanged: repaint()
    onConnectTruthChanged: repaint()
    onZoomChanged: repaint()
    onPanXChanged: repaint()
    onPanYChanged: repaint()
    onWidthChanged: repaint()
    onHeightChanged: repaint()
    Canvas {
        id: plot
        anchors.fill: parent
        renderStrategy: Canvas.Cooperative
        onPaint: {
            const c = getContext("2d");
            c.reset();
            c.fillStyle = "#ffffff";
            c.fillRect(0, 0, width, height);
            if (width < 100 || height < 90)
                return;
            let data = root.hits;
            if (root.mode === 1 && root.layerIndex >= 0)
                data = data.filter(h => h.layer === root.layerIndex);
            if (root.mode === 2)
                data = data.filter(h => h.section === root.section);
            const hasProfile = root.mode === 1;
            const left = 44, top = 15, right = width - 18, bottom = height - (hasProfile ? 105 : 32);
            const pw = right - left, ph = bottom - top;
            let points = [];
            function xy(h) {
                if (root.mode === 2)
                    return [h.layer, root.projection === 0 ? h.strip : h.time];
                if (root.mode === 4)
                    return [h.bar, h.module];
                if (!h.position)
                    return null;
                if (root.mode === 1)
                    return root.projection === 0 ? [h.position[0], h.position[1]] : [h.position[2], h.position[0]];
                return [h.position[2], h.position[root.projection === 0 ? 0 : 1]];
            }
            for (let h of data) {
                let p = xy(h);
                if (p && p.every(v => Number.isFinite(v)))
                    points.push({
                        p: p,
                        record: h
                    });
            }
            let bounds = root.mode === 4 ? [-0.5, 49.5, -0.5, 3.5] : root.mode === 3 ? [-900, 300, -60, 60] : [-30, 30, -30, 30];
            if (root.mode === 1 && root.projection === 1)
                bounds = [200, 700, -50, 50];
            if (root.mode === 2)
                bounds = [-0.5, 12.5, -0.5, root.projection === 0 ? 64.5 : 100];
            if (points.length) {
                const xs = points.map(o => o.p[0]), ys = points.map(o => o.p[1]);
                if (root.mode === 1) {
                    const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
                    const dx = Math.max(12, (xmax - xmin) * .16), dy = Math.max(12, (ymax - ymin) * .16);
                    bounds = [xmin - dx, xmax + dx, ymin - dy, ymax + dy];
                    if (root.projection === 0) {
                        const span = Math.max(bounds[1] - bounds[0], bounds[3] - bounds[2]);
                        const cx = (bounds[0] + bounds[1]) / 2, cy = (bounds[2] + bounds[3]) / 2;
                        bounds = [cx - span / 2, cx + span / 2, cy - span / 2, cy + span / 2];
                    }
                } else {
                    bounds = [Math.min(bounds[0], ...xs), Math.max(bounds[1], ...xs) + .01, Math.min(bounds[2], ...ys), Math.max(bounds[3], ...ys) + .01];
                }
            }
            // Preserve physical x/y aspect in the transverse ECal view.
            if (root.mode === 1 && root.projection === 0) {
                const scale = Math.max((bounds[1] - bounds[0]) / pw, (bounds[3] - bounds[2]) / ph);
                const cx = (bounds[0] + bounds[1]) / 2, cy = (bounds[2] + bounds[3]) / 2;
                bounds = [cx - scale * pw / 2, cx + scale * pw / 2, cy - scale * ph / 2, cy + scale * ph / 2];
            }
            const cx = (bounds[0] + bounds[1]) / 2 + root.panX, cy = (bounds[2] + bounds[3]) / 2 + root.panY;
            const dx = (bounds[1] - bounds[0]) / root.zoom, dy = (bounds[3] - bounds[2]) / root.zoom;
            bounds = [cx - dx / 2, cx + dx / 2, cy - dy / 2, cy + dy / 2];
            root.plotRange = {
                x: dx / pw,
                y: dy / ph
            };
            function px(x) {
                return left + (x - bounds[0]) / (bounds[1] - bounds[0]) * pw;
            }
            function py(y) {
                return bottom - (y - bounds[2]) / (bounds[3] - bounds[2]) * ph;
            }
            c.font = "10px sans-serif";
            c.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const x = left + pw * i / 4, y = top + ph * i / 4;
                c.strokeStyle = "#edf1f5";
                c.beginPath();
                c.moveTo(x, top);
                c.lineTo(x, bottom);
                c.moveTo(left, y);
                c.lineTo(right, y);
                c.stroke();
                c.fillStyle = "#748397";
                c.textAlign = "center";
                c.fillText(Number(bounds[0] + (bounds[1] - bounds[0]) * i / 4).toFixed(0), x, bottom + 14);
                c.textAlign = "right";
                c.fillText(Number(bounds[3] - (bounds[3] - bounds[2]) * i / 4).toFixed(0), left - 7, y + 3);
            }
            c.fillStyle = "#637386";
            c.textAlign = "right";
            const xlabel = root.mode === 2 ? "layer ID" : root.mode === 4 ? "bar ID" : root.mode === 1 && root.projection === 0 ? "x / mm" : "z / mm";
            const ylabel = root.mode === 2 ? (root.projection === 0 ? "strip ID" : "t / ns") : root.mode === 4 ? "module" : root.mode === 1 && root.projection === 0 ? "y / mm" : (root.projection === 0 || root.mode === 1 ? "x / mm" : "y / mm");
            c.fillText(xlabel, right, bottom + 28);
            c.textAlign = "left";
            c.fillText(ylabel, left, 10);
            let marks = [];
            if (root.mode === 3 && root.connectTruth) {
                const groups = {};
                for (let item of points)
                    if (item.record.trackId > 0) {
                        const key = item.record.trackId;
                        if (!groups[key])
                            groups[key] = [];
                        groups[key].push(item);
                    }
                c.strokeStyle = "#bacbdc";
                c.lineWidth = 1;
                for (let key of Object.keys(groups)) {
                    const group = groups[key].sort((a, b) => a.p[0] - b.p[0]);
                    c.beginPath();
                    group.forEach((o, i) => i ? c.lineTo(px(o.p[0]), py(o.p[1])) : c.moveTo(px(o.p[0]), py(o.p[1])));
                    c.stroke();
                }
            }
            c.save();
            c.beginPath();
            c.rect(left, top, pw, ph);
            c.clip();
            if (root.mode === 3 && root.overlays) {
                for (let track of root.tracks) {
                    const path = (track.points || []).map(p => [p[2], p[root.projection === 0 ? 0 : 1]]);
                    c.strokeStyle = track.key === root.selected.key ? "#e27623" : "#264c78";
                    c.lineWidth = 2;
                    c.beginPath();
                    path.forEach((p, i) => i ? c.lineTo(px(p[0]), py(p[1])) : c.moveTo(px(p[0]), py(p[1])));
                    c.stroke();
                    for (let p of path) {
                        c.strokeRect(px(p[0]) - 4, py(p[1]) - 4, 8, 8);
                        marks.push({
                            x: px(p[0]),
                            y: py(p[1]),
                            record: track
                        });
                    }
                }
            }
            for (let item of points) {
                const h = item.record, x = px(item.p[0]), y = py(item.p[1]), related = V.related(h, root.selected);
                const radius = Math.min(9, 2.3 + Math.log1p(Math.max(0, h.energy)) * 1.1);
                c.globalAlpha = related ? 1 : .70;
                c.fillStyle = related ? "#0074d9" : h.color;
                c.strokeStyle = related ? "#001f3f" : "white";
                c.lineWidth = related ? 2 : 0.7;
                c.beginPath();
                if (root.mode === 1) {
                    for (let i = 0; i < 6; i++) {
                        const a = i * Math.PI / 3;
                        const xx = x + radius * Math.cos(a), yy = y + radius * Math.sin(a);
                        i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
                    }
                    c.closePath();
                } else if ((root.mode === 2 && root.projection === 0) || root.mode === 4) {
                    c.rect(x - 3.5, y - 4, 7, 8);
                } else
                    c.arc(x, y, related ? 6 : 3.2, 0, Math.PI * 2);
                c.fill();
                c.stroke();
                c.globalAlpha = 1;
                marks.push({
                    x: x,
                    y: y,
                    record: h
                });
            }
            if (root.mode === 1 && root.overlays) {
                for (let cl of root.clusters) {
                    if (!cl.position)
                        continue;
                    const p = root.projection === 0 ? [cl.position[0], cl.position[1]] : [cl.position[2], cl.position[0]];
                    const x = px(p[0]), y = py(p[1]);
                    c.strokeStyle = "#263f63";
                    c.lineWidth = cl.key === root.selected.key ? 3 : 1.5;
                    c.beginPath();
                    c.arc(x, y, 11, 0, Math.PI * 2);
                    c.moveTo(x - 15, y);
                    c.lineTo(x + 15, y);
                    c.moveTo(x, y - 15);
                    c.lineTo(x, y + 15);
                    c.stroke();
                    marks.push({
                        x: x,
                        y: y,
                        record: cl
                    });
                }
            }
            c.restore();
            if (!points.length) {
                c.fillStyle = "#8a97a7";
                c.textAlign = "center";
                c.font = "12px sans-serif";
                c.fillText("No hits in this selection", left + pw / 2, top + ph / 2);
            }
            if (hasProfile) {
                const bins = V.profile(root.hits, 34), peak = Math.max(1, ...bins), bw = pw / 34;
                const baseline = height - 15;
                c.font = "10px sans-serif";
                c.fillStyle = "#637386";
                c.textAlign = "left";
                c.fillText("Energy by layer · click to slice", left, height - 60);
                c.textAlign = "right";
                c.fillText(Math.max(...bins).toFixed(1) + " MeV peak", right, height - 60);
                for (let i = 0; i < 34; i++) {
                    c.fillStyle = i === root.layerIndex ? "#0074d9" : "#c68454";
                    c.fillRect(left + i * bw, baseline - 32 * bins[i] / peak, Math.max(1, bw - 1), Math.max(1, 32 * bins[i] / peak));
                }
                marks.push({
                    profile: true,
                    x: left,
                    y: height - 50,
                    width: pw,
                    height: 50
                });
            }
            root.marks = marks;
        }
    }
    MouseArea {
        anchors.fill: parent
        property point previous
        property bool dragged: false
        onPressed: mouse => {
            previous = Qt.point(mouse.x, mouse.y);
            dragged = false;
        }
        onPositionChanged: mouse => {
            if (!pressed)
                return;
            const dx = mouse.x - previous.x, dy = mouse.y - previous.y;
            if (Math.abs(dx) + Math.abs(dy) > 2)
                dragged = true;
            if (dragged) {
                root.panX -= dx * root.plotRange.x;
                root.panY += dy * root.plotRange.y;
            }
            previous = Qt.point(mouse.x, mouse.y);
        }
        onClicked: mouse => {
            if (dragged)
                return;
            let nearest = null, distance = 144;
            for (let mark of root.marks) {
                if (mark.profile) {
                    if (mouse.y >= mark.y && mouse.x >= mark.x && mouse.x <= mark.x + mark.width) {
                        root.layerPicked(Math.min(33, Math.floor((mouse.x - mark.x) / mark.width * 34)));
                        return;
                    }
                    continue;
                }
                const d = (mark.x - mouse.x) ** 2 + (mark.y - mouse.y) ** 2;
                if (d < distance) {
                    nearest = mark.record;
                    distance = d;
                }
            }
            if (nearest)
                root.picked(nearest);
        }
    }
    WheelHandler {
        onWheel: event => root.zoom = Math.max(.5, Math.min(30, root.zoom * Math.pow(1.001, event.angleDelta.y)))
    }
}
