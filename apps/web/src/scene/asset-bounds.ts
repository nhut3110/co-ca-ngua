import { Box3, Group, Vector3, type Object3D } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
/** Keep imported node/quantization transforms intact inside a normalization wrapper. */
export function fitAsset(source: Object3D, width: number, height?: number) {
  const root = new Group();
  root.add(clone(source));
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root),
    size = box.getSize(new Vector3()),
    center = box.getCenter(new Vector3());
  const scale = Math.min(width / Math.max(size.x, size.z), height ? height / size.y : Infinity);
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  return root;
}
