pragma ComponentBehavior: Bound
import QtQuick
import QtQuick3D
import LdmxStudio

Item {
    id: root
    required property var hits
    property bool showGeometry: true
    property real yaw: -16
    property real pitch: -12
    property real distance: 400

    function resetCamera() { yaw = -16; pitch = -12; distance = 400 }

    View3D {
        anchors.fill: parent
        environment: SceneEnvironment {
            backgroundMode: SceneEnvironment.Color
            clearColor: "#ffffff"
            antialiasingMode: SceneEnvironment.MSAA
            antialiasingQuality: SceneEnvironment.High
        }
        Node {
            id: orbit
            position: Qt.vector3d(65, 0, 0)
            eulerRotation: Qt.vector3d(root.pitch, root.yaw, 0)
            PerspectiveCamera {
                id: camera
                z: root.distance
                clipNear: 1
                clipFar: 3000
                fieldOfView: 42
            }
        }
        camera: camera
        DirectionalLight { eulerRotation: Qt.vector3d(-30, -20, 0); brightness: 1.3 }
        DirectionalLight { eulerRotation: Qt.vector3d(20, 150, 0); brightness: 0.6 }

        Node {
            visible: root.showGeometry
            // Spatial context only: approximate envelopes, never GDML geometry.
            Repeater3D {
                model: [-75, -60, -45, -30, -15]
                delegate: Model {
                    required property real modelData
                    source: "#Cube"
                    position: Qt.vector3d(modelData, 0, 0)
                    scale: Qt.vector3d(0.009, 0.23, 0.40)
                    materials: PrincipledMaterial {
                        baseColor: "#697992"
                        opacity: 0.30
                        alphaMode: PrincipledMaterial.Blend
                        roughness: 0.7
                    }
                }
            }
            Model {
                source: "#Cube"
                scale: Qt.vector3d(0.012, 0.20, 0.30)
                materials: PrincipledMaterial { baseColor: "#404a57"; roughness: 0.5 }
            }
            Repeater3D {
                model: [2, 5, 9, 14, 20]
                delegate: Model {
                    required property real modelData
                    source: "#Cube"
                    position: Qt.vector3d(modelData, 0, 0)
                    scale: Qt.vector3d(0.008, 0.24, 0.44)
                    materials: PrincipledMaterial {
                        baseColor: "#0074d9"
                        opacity: 0.30
                        alphaMode: PrincipledMaterial.Blend
                    }
                }
            }
            Repeater3D {
                model: 18
                delegate: Model {
                    required property int index
                    source: "#Cube"
                    position: Qt.vector3d(25 + index * 2.3, 0, 0)
                    scale: Qt.vector3d(0.004, 0.63, 0.63)
                    materials: PrincipledMaterial {
                        baseColor: "#98afc7"
                        opacity: 0.18
                        alphaMode: PrincipledMaterial.Blend
                    }
                }
            }
            Repeater3D {
                model: 20
                delegate: Model {
                    required property int index
                    source: "#Cube"
                    position: Qt.vector3d(90 + index * 7, 0, 0)
                    scale: Qt.vector3d(0.008, 1.3, 1.3)
                    materials: PrincipledMaterial {
                        baseColor: "#a8b4c2"
                        opacity: 0.16
                        alphaMode: PrincipledMaterial.Blend
                    }
                }
            }
            // Beam-axis guide.
            Model {
                source: "#Cube"
                x: 75
                scale: Qt.vector3d(3.9, 0.0015, 0.0015)
                materials: PrincipledMaterial {
                    baseColor: "#8d9bac"
                    lighting: PrincipledMaterial.NoLighting
                }
            }
        }
        Model {
            source: "#Sphere"
            instancing: HitInstances { hits: root.hits }
            materials: PrincipledMaterial {
                baseColor: "white"
                lighting: PrincipledMaterial.NoLighting
            }
        }
    }

    DragHandler {
        target: null
        onActiveTranslationChanged: {
            root.yaw += activeTranslation.x - previous.x
            root.pitch = Math.max(-80, Math.min(80, root.pitch + activeTranslation.y - previous.y))
            previous = activeTranslation
        }
        property point previous: Qt.point(0, 0)
        onActiveChanged: previous = Qt.point(0, 0)
    }
    WheelHandler {
        onWheel: event => {
            root.distance = Math.max(80, Math.min(1400, root.distance - event.angleDelta.y * 0.3))
        }
    }
}
