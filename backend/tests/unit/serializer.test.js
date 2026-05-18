const { encodePhysicsState, decodePhysicsState } = require('../../src/protobuf/serializer');

describe('Binary Serializer', () => {
  it('should encode and decode physics state correctly', () => {
    const state = {
      timestamp: 123456789,
      seqId: 42,
      bodies: [
        {
          id: 'body-1',
          position: { x: 10, y: 20 },
          velocity: { x: 1, y: 2 },
          angle: 0.5,
          angularVelocity: 0.1
        },
        {
          id: 'body-2',
          position: { x: -10, y: -20 },
          velocity: { x: -1, y: -2 },
          angle: -0.5,
          angularVelocity: -0.1
        }
      ]
    };

    const encoded = encodePhysicsState(state);
    const decoded = decodePhysicsState(encoded);

    expect(decoded.timestamp).toBe(state.timestamp);
    expect(decoded.seqId).toBe(state.seqId);
    expect(decoded.bodies).toHaveLength(state.bodies.length);
    
    decoded.bodies.forEach((body, i) => {
      expect(body.id).toBe(state.bodies[i].id);
      expect(body.position.x).toBeCloseTo(state.bodies[i].position.x);
      expect(body.position.y).toBeCloseTo(state.bodies[i].position.y);
      expect(body.velocity.x).toBeCloseTo(state.bodies[i].velocity.x);
      expect(body.velocity.y).toBeCloseTo(state.bodies[i].velocity.y);
      expect(body.angle).toBeCloseTo(state.bodies[i].angle);
      expect(body.angularVelocity).toBeCloseTo(state.bodies[i].angularVelocity);
    });
  });
});
