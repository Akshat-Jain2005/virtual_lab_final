const RollbackManager = require('../../src/physics/engine/Rollback');

describe('RollbackManager', () => {
  let rollback;
  let mockEngine;

  beforeEach(() => {
    rollback = new RollbackManager(10);
    mockEngine = {
      updateBody: jest.fn(),
      getState: () => []
    };
  });

  it('should save and retrieve snapshots', () => {
    const state = [{ id: 'b1', position: { x: 0, y: 0 } }];
    rollback.saveSnapshot(1, state);
    
    const retrieved = rollback.getSnapshot(1);
    expect(retrieved.state).toEqual(state);
    expect(retrieved.sequenceId).toBe(1);
  });

  it('should maintain circular buffer size', () => {
    for (let i = 1; i <= 15; i++) {
      rollback.saveSnapshot(i, []);
    }
    
    expect(rollback.getSnapshot(1)).toBeUndefined();
    expect(rollback.getSnapshot(6).sequenceId).toBe(6);
    expect(rollback.snapshots).toHaveLength(10);
  });

  it('should rollback engine state', () => {
    const state = [{ id: 'b1', position: { x: 10, y: 20 }, velocity: { x: 1, y: 1 }, angle: 0 }];
    rollback.saveSnapshot(42, state);
    
    const success = rollback.rollbackTo(mockEngine, 42);
    
    expect(success).toBe(true);
    expect(mockEngine.updateBody).toHaveBeenCalledWith('b1', {
      position: state[0].position,
      velocity: state[0].velocity,
      angle: state[0].angle
    });
  });
});
