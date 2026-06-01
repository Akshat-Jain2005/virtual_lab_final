
function encodePhysicsState(state) {
  const { timestamp, seqId, bodies } = state;
  
  
  let size = 8 + 4 + 4; 
  bodies.forEach(b => {
    size += 1 + b.id.length + (4 * 6);
  });

  const buffer = Buffer.allocUnsafe(size);
  let offset = 0;

  
  buffer.writeDoubleLE(timestamp, offset); offset += 8;
  buffer.writeUInt32LE(seqId, offset); offset += 4;
  buffer.writeUInt32LE(bodies.length, offset); offset += 4;

  
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
