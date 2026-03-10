import { useEffect, useRef } from 'react';
import type { EventDisplay } from 'phoenix-event-display';
import type { Object3D } from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { GeometryClipPlane } from '../../../types';
import { getPhoenixThreeManager } from '../../../utils/phoenixInterop';
import {
  getSlicePlaneHelper,
  syncSlicePlaneHelpers
} from '../scene/geometryHelpers';

type UseSlicePlaneHelpersArgs = {
  cameraModeKey: string;
  eventDisplay: EventDisplay | null;
  onPlaneTransform: (
    planeId: string,
    patch: Pick<GeometryClipPlane, 'position' | 'rotation'>
  ) => void;
  planes: GeometryClipPlane[];
  selectedPlaneId: string | null;
  transformMode: 'translate' | 'rotate';
};

export function useSlicePlaneHelpers({
  cameraModeKey,
  eventDisplay,
  onPlaneTransform,
  planes,
  selectedPlaneId,
  transformMode
}: UseSlicePlaneHelpersArgs) {
  const transformControlsRef = useRef<TransformControls | null>(null);
  const selectedPlaneIdRef = useRef<string | null>(selectedPlaneId);
  const onPlaneTransformRef = useRef(onPlaneTransform);

  useEffect(() => {
    selectedPlaneIdRef.current = selectedPlaneId;
    onPlaneTransformRef.current = onPlaneTransform;
  }, [onPlaneTransform, selectedPlaneId]);

  useEffect(() => {
    if (!eventDisplay) return;

    const threeManager = getPhoenixThreeManager(eventDisplay);
    const scene = threeManager.getSceneManager().getScene();
    const renderer = threeManager.rendererManager?.getMainRenderer?.();
    const camera = threeManager.controlsManager?.getActiveCamera?.();
    if (!scene || !renderer || !camera) return;

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setMode(transformMode);
    scene.add(asSceneObject(transformControls));
    transformControlsRef.current = transformControls;

    const orbitControls = threeManager.controlsManager?.getMainControls?.();
    const handleDraggingChanged = (event: { value: unknown }) => {
      if (orbitControls) {
        orbitControls.enabled = !Boolean(event.value);
      }
    };
    const handleObjectChange = () => {
      const planeId = selectedPlaneIdRef.current;
      const object = transformControls.object;
      if (!planeId || !object) return;
      onPlaneTransformRef.current(planeId, {
        position: [object.position.x, object.position.y, object.position.z],
        rotation: [object.rotation.x, object.rotation.y, object.rotation.z]
      });
    };

    transformControls.addEventListener(
      'dragging-changed',
      handleDraggingChanged
    );
    transformControls.addEventListener('objectChange', handleObjectChange);

    return () => {
      transformControls.removeEventListener(
        'dragging-changed',
        handleDraggingChanged
      );
      transformControls.removeEventListener('objectChange', handleObjectChange);
      transformControls.detach();
      scene.remove(asSceneObject(transformControls));
      transformControls.dispose();
      if (orbitControls) {
        orbitControls.enabled = true;
      }
      transformControlsRef.current = null;
    };
  }, [cameraModeKey, eventDisplay]);

  useEffect(() => {
    if (!eventDisplay) return;

    const threeManager = getPhoenixThreeManager(eventDisplay);
    const scene = threeManager.getSceneManager().getScene();
    syncSlicePlaneHelpers(scene, planes, selectedPlaneId);
    threeManager.rendererManager?.setLocalClippingEnabled?.(
      planes.some((plane) => plane.enabled)
    );

    const transformControls = transformControlsRef.current;
    if (!transformControls) return;

    transformControls.setMode(transformMode);
    if (!selectedPlaneId) {
      transformControls.detach();
      return;
    }

    const helper = getSlicePlaneHelper(scene, selectedPlaneId);
    if (helper?.visible) {
      transformControls.attach(helper);
    } else {
      transformControls.detach();
    }
  }, [eventDisplay, planes, selectedPlaneId, transformMode]);
}

/**
 * The runtime `TransformControls` class extends `Object3D`, but the published
 * type surface in the example package does not currently encode that. Keep the
 * cast localized here instead of repeating it at every scene call site.
 */
function asSceneObject(transformControls: TransformControls): Object3D {
  return transformControls as unknown as Object3D;
}
