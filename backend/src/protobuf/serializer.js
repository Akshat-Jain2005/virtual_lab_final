/**
 * protobuf/serializer.js - High-performance binary serialization for physics state
 * 
 * Uses TypedArrays (Float32Array) for efficient packing of position, velocity and rotation.
 */

/**
 * Encode physics state into a binary Buffer
 * Format: [timestamp:8][seqId:4][bodyCount:4][...[bodyIdLen:1][bodyId:N][x:4][y:4][vx:4][vy:4][angle:4][av:4]]
 */
function encodePhysicsState(state) {
  const { timestamp, seqId, bodies } = state;
  
  // Calculate buffer size
  let size = 8 + 4 + 4; // Header
  bodies.forEach(b => {
    size += 1 + b.id.length + (4 * 6);
  });

  const buffer = Buffer.allocUnsafe(size);
  let offset = 0;

  // Header
  buffer.writeDoubleLE(timestamp, offset); offset += 8;
  buffer.writeUInt32LE(seqId, offset); offset += 4;
  buffer.writeUInt32LE(bodies.length, offset); offset += 4;

  // Bodies
  bodies.forEach(b => {
    buffer.writeUInt8(b.id.length, offset); offset += 1;
    buffer.write(b.id, offset); offset += b.id.length;
    
    buffer.writeFloatLE(b.position.x, offset); offset += 4;
    buffer.writeFloatLE(b.position.y, offset); offset += 4;
    buffer.writeFloatLE(b.velocity.x, offset); offset += 4;
    buffer.writeFloatLE(b.velocity.y, offset); offset += 4;
    buffer.writeFloatLE(b.angle, offset); offset += 4;
    buffer.writeFloatLE(b.angularVelocity, offset); offset += 4;
  });

  return buffer;
}

/**
 * Decode binary physics state
 */
function decodePhysicsState(buffer) {
  let offset = 0;
  
  const timestamp = buffer.readDoubleLE(offset); offset += 8;
  const seqId = buffer.readUInt32LE(offset); offset += 4;
  const bodyCount = buffer.readUInt32LE(offset); offset += 4;

  const bodies = [];
  for (let i = 0; i < bodyCount; i++) {
    const idLen = buffer.readUInt8(offset); offset += 1;
    const id = buffer.toString('utf8', offset, offset + idLen); offset += idLen;
    
    const x = buffer.readFloatLE(offset); offset += 4;
    const y = buffer.readFloatLE(offset); offset += 4;
    const vx = buffer.readFloatLE(offset); offset += 4;
    const vy = buffer.readFloatLE(offset); offset += 4;
    const angle = buffer.readFloatLE(offset); offset += 4;
    const av = buffer.readFloatLE(offset); offset += 4;

    bodies.push({
      id,
      position: { x, y },
      velocity: { x: vx, y: vy },
      angle,
      angularVelocity: av
    });
  }

  return { timestamp, seqId, bodies };
}

module.exports = {
  encodePhysicsState,
  decodePhysicsState
};
