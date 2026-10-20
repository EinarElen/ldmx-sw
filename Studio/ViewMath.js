.pragma library

function subsystem(mode) { return mode === 1 ? "Ecal" : mode === 2 ? "Hcal" : mode === 4 ? "TS" : "" }
function collections(event, mode, source) {
    const d = subsystem(mode)
    return (event.collections || []).filter(c => c.category === "hits" && c.source === source &&
        (d ? c.detector === d : mode === 3 ? ["Tagger", "Recoil", "Tracking", "TS"].indexOf(c.detector) >= 0 : true))
}
function filteredHits(event, mode, source, collection, threshold) {
    let data = (event.hits || []).filter(h => h.source === source && (h.energy || 0) >= threshold)
    const d = subsystem(mode)
    if (d) data = data.filter(h => h.detector === d)
    if (mode === 3) data = data.filter(h => ["Tagger", "Recoil", "Tracking", "TS"].indexOf(h.detector) >= 0)
    if (collection) return data.filter(h => h.collection === collection)
    // One collection per subsystem by default. Never add different passes together.
    const chosen = {}
    function group(h) { return h.detector === "TS" ? "TS:" + h.module : h.detector }
    for (let h of data) if (!chosen[group(h)]) chosen[group(h)] = h.collection
    return data.filter(h => h.collection === chosen[group(h)])
}
function profile(hits, count) {
    const bins = Array(count).fill(0)
    for (let h of hits) if (h.layer >= 0 && h.layer < count) bins[h.layer] += h.energy || 0
    return bins
}
function sum(hits) { return hits.reduce((total, h) => total + (h.energy || 0), 0) }
function related(hit, selected) {
    if (!selected || !selected.key) return false
    if (hit.key === selected.key) return true
    return selected.kind === "cluster" && selected.detector === hit.detector &&
        (selected.hitIds || []).indexOf(hit.id) !== -1
}
function format(value) {
    if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toPrecision(5)
    if (Array.isArray(value)) return value.length > 8 ? value.length + " entries" : value.map(format).join(", ")
    if (value === null || value === undefined) return "—"
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
}
