export function checkCollision(obj1, obj2, threshold = 1) {
  return obj1.position.distanceTo(obj2.position) < threshold;
}
    