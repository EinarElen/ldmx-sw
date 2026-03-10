import { describe, expect, it } from 'vitest';
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  BoxGeometry,
  Vector3
} from 'three';
import {
  getCameraPreset,
  getPannedCameraTransform,
  getZoomedCameraTransform,
  isOrthographicCamera
} from '../utils/cameraNavigation';

describe('cameraNavigation', () => {
  it('zooms perspective cameras by moving along the current view ray', () => {
    const camera = new PerspectiveCamera(50, 1, 1, 5000);
    camera.position.set(0, 200, 1000);
    camera.up.set(0, 1, 0);
    const target = new Vector3(0, 0, 0);

    const next = getZoomedCameraTransform(camera, target, 1.25);

    expect(next.target).toEqual([0, 0, 0]);
    expect(next.zoom).toBeNull();
    expect(next.position[2]).toBeLessThan(1000);
  });

  it('zooms orthographic cameras by changing zoom instead of recentering', () => {
    const camera = new OrthographicCamera(-10, 10, 10, -10, 1, 1000);
    camera.position.set(100, 200, 300);
    camera.zoom = 2;
    const target = new Vector3(4, 5, 6);

    const next = getZoomedCameraTransform(camera, target, 1.5);

    expect(isOrthographicCamera(camera)).toBe(true);
    expect(next.position).toEqual([100, 200, 300]);
    expect(next.target).toEqual([4, 5, 6]);
    expect(next.zoom).toBe(3);
  });

  it('pans camera position and target together and computes detector-aware presets', () => {
    const camera = new PerspectiveCamera(50, 1, 1, 5000);
    camera.position.set(0, 0, 1000);
    camera.up.set(0, 1, 0);
    const target = new Vector3(0, 0, 0);

    const panned = getPannedCameraTransform(camera, target, 'right');
    expect(panned.position[0]).toBeGreaterThan(0);
    expect(panned.target[0]).toBeGreaterThan(0);

    const root = new Group();
    const mesh = new Mesh(
      new BoxGeometry(200, 100, 400),
      new MeshBasicMaterial()
    );
    mesh.position.set(0, 0, 600);
    root.add(mesh);

    const full = getCameraPreset('full', root);
    expect(full.target[2]).toBeGreaterThan(300);
    const dx = full.position[0] - full.target[0];
    const dy = full.position[1] - full.target[1];
    const dz = full.position[2] - full.target[2];
    expect(Math.sqrt(dx * dx + dy * dy + dz * dz)).toBeGreaterThan(500);
  });
});
