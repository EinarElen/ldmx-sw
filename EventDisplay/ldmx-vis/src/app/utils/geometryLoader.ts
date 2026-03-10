import type { EventDisplay } from 'phoenix-event-display';
import { Group, type Object3D } from 'three';
import {
  GLTFLoader,
  type GLTF
} from 'three/examples/jsm/loaders/GLTFLoader.js';

const LDMX_GEOMETRY_ROOT = '__ldmx_geometry_root__';

export async function loadGeometryFromUrl(url: string, label: string) {
  const loader = new GLTFLoader();
  const gltf: GLTF = await loader.loadAsync(url);
  return buildGeometryRoot(gltf.scenes, label);
}

export async function loadGeometryFromFile(
  file: File,
  label: string
) {
  const loader = new GLTFLoader();
  const payload = file.name.toLowerCase().endsWith('.gltf')
    ? await file.text()
    : await file.arrayBuffer();

  return new Promise<Object3D>((resolve, reject) => {
    loader.parse(
      payload as string | ArrayBuffer,
      '',
      (gltf: GLTF) => resolve(buildGeometryRoot(gltf.scenes, label)),
      (error: unknown) => reject(error)
    );
  });
}

export function installGeometryRoot(
  eventDisplay: EventDisplay,
  nextRoot: Object3D
) {
  const geometries = eventDisplay.getThreeManager().getSceneManager().getGeometries();
  clearManagedGeometry(geometries);
  geometries.add(nextRoot);
  return nextRoot;
}

function clearManagedGeometry(geometries: Object3D) {
  const children = [...geometries.children];
  for (const child of children) {
    if (child.name === LDMX_GEOMETRY_ROOT) {
      geometries.remove(child);
    }
  }
}

function buildGeometryRoot(scenes: Object3D[], label: string) {
  const root = new Group();
  root.name = LDMX_GEOMETRY_ROOT;
  root.userData.geometryLabel = label;

  for (const scene of scenes) {
    scene.name = scene.name || label;
    root.add(scene);
  }

  return root;
}
