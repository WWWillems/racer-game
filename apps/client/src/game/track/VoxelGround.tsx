import { useState } from "react";
import * as THREE from "three";

import { TRACK_INNER_RADIUS, TRACK_OUTER_RADIUS } from "@racer-game/shared";

const GRID_SIZE = 100;
const VOXEL_SIZE = 1;

const GRASS_COLORS = ["#4ade80", "#34d399", "#22c55e"];

const buildVoxelGround = (): THREE.InstancedMesh => {
  const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff" });
  const maxInstances = GRID_SIZE * GRID_SIZE;
  const mesh = new THREE.InstancedMesh(geometry, material, maxInstances);
  mesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const half = GRID_SIZE / 2;

  let index = 0;
  for (let gx = 0; gx < GRID_SIZE; gx += 1) {
    for (let gz = 0; gz < GRID_SIZE; gz += 1) {
      const x = gx - half + VOXEL_SIZE / 2;
      const z = gz - half + VOXEL_SIZE / 2;
      const radius = Math.sqrt(x * x + z * z);
      const isTrack = radius >= TRACK_INNER_RADIUS && radius <= TRACK_OUTER_RADIUS;
      if (isTrack) {
        continue;
      }

      const paletteIndex = Math.floor(Math.random() * GRASS_COLORS.length);
      color.set(GRASS_COLORS[paletteIndex]);

      dummy.position.set(x, -0.5, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      mesh.setMatrixAt(index, dummy.matrix);
      mesh.setColorAt(index, color);
      index += 1;
    }
  }

  mesh.count = index;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }

  return mesh;
};

export const VoxelGround = () => {
  const [mesh] = useState<THREE.InstancedMesh>(() => {
    return buildVoxelGround();
  });

  return <primitive object={mesh} />;
};
