// Physics and helper utilities (collision, distance, vector limits)
function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

function calculateDistance(obj1, obj2) {
  const dx = obj2.x - obj1.x;
  const dy = obj2.y - obj1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Detect circular collision between two objects
function checkCircleCollision(obj1, obj2, radius1, radius2) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (radius1 + radius2);
}

// Separate two objects in collision
function separateObjects(obj1, obj2, radius1, radius2, objA, objB) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) {
    const angle = Math.random() * Math.PI * 2;
    obj1.x += Math.cos(angle) * (radius1 + radius2);
    obj1.y += Math.sin(angle) * (radius1 + radius2);
    return;
  }
  
  const overlap = (radius1 + radius2) - distance;
  const separationX = (dx / distance) * overlap * 0.5;
  const separationY = (dy / distance) * overlap * 0.5;
  
  obj1.x += separationX;
  obj1.y += separationY;
  obj2.x -= separationX;
  obj2.y -= separationY;

  if((objA instanceof Hero || objB instanceof Hero) &&
    (objA.isJumping || objB.isJumping)) {
      console.log("Hero is jumping")
    }
}

function limitVector(vector, maxMagnitude) {
  const currentMagnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);

  if (currentMagnitude > maxMagnitude) {
    const scale = maxMagnitude / currentMagnitude;
    return {
      x: vector.x * scale,
      y: vector.y * scale,
    };
  }

  // If it is already within the limit, return a copy
  return { x: vector.x, y: vector.y };
}
