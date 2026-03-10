import { describe, expect, test } from 'vitest';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial
} from 'three';
import {
  buildGeometryRegistry,
  createGeometryVisibilityState
} from '../features/geometry-workbench/utils/geometryRegistry';

describe('buildGeometryRegistry', () => {
  test('builds an LDMX hierarchy from renderable detector volumes', () => {
    const root = new Group();
    root.name = '__ldmx_geometry_root__';
    root.add(createVolume('tagger_sensor_vol_0'));
    root.add(createVolume('si_volume_0'));
    root.add(createVolume('back_hcal_absoPhysvol'));
    root.add(createVolume('back_hcal_scintXPhysvol#17'));
    root.add(createVolume('side_hcal_scintZX_1_2_7_Physvol'));

    const registry = buildGeometryRegistry(root);

    expect(registry.rootIds).toEqual(['Tagger', 'ECAL', 'HCAL']);
    expect(registry.nodes['Tagger/Tagger plane 0/Sensor volume']).toBeDefined();
    expect(registry.nodes['ECAL/Silicon sensors/Sensor 1']).toBeDefined();
    expect(
      registry.nodes['HCAL/Back/Layers 1-8/Layer 1/Absorbers/Slab 1']
    ).toBeDefined();
    expect(
      registry.nodes[
        'HCAL/Back/Layers 1-8/Layer 1/Scintillator X/Quadbars 17-20/Bar 19'
      ]
    ).toBeDefined();
    expect(
      registry.nodes[
        'HCAL/Top/Layer group 2/Scintillator ZX/Quadbars 5-8/Bar 7'
      ]
    ).toBeDefined();
    expect(createGeometryVisibilityState(registry)).toMatchObject({
      Tagger: true,
      ECAL: true,
      HCAL: true
    });
  });
});

function createVolume(name: string) {
  const mesh = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshBasicMaterial({ color: '#ffffff' })
  );
  mesh.name = name;
  return mesh;
}
