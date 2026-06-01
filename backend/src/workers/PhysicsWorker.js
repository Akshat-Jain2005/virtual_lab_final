
const { parentPort } = require('worker_threads');
const PhysicsEngine = require('../physics/engine/PhysicsEngine');
const FixedLoop = require('../physics/engine/FixedLoop');
const RollbackManager = require('../physics/engine/Rollback');
const { encodePhysicsState } = require('../protobuf/serializer');
const AnalyticsPipeline = require('../analytics/AnalyticsPipeline');


const FluidDragPlugin = require('../physics/plugins/FluidDragPlugin');
const ViscosityPlugin = require('../physics/plugins/ViscosityPlugin');
const SpringDegradationPlugin = require('../physics/plugins/SpringDegradationPlugin');

class PhysicsWorker {
  constructor() {
    this.rooms = new Map(); 
    this.analytics = new AnalyticsPipeline();
    this.stats = {
      framesProcessed: 0,
      framesDropped: 0,
      averageFrameTime: 0,
      frameTimeHistory: [],
    };
  }

  getOrInitRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const engine = new PhysicsEngine('AIR');
      
      
      engine.registerPlugin(new FluidDragPlugin({ density: 1.225 }));
      engine.registerPlugin(new SpringDegradationPlugin());
      
      this.rooms.set(roomId, {
        engine,
        rollback: new RollbackManager(300),
        loop: new FixedLoop((delta) => engine.update(delta)),
        seqId: 0,
        dirty: false
      });
    }
    return this.rooms.get(roomId);
  }

  step() {
    const start = performance.now();
    
    for (const [roomId, room] of this.rooms) {
      const stats = room.loop.step(start);
      
      room.seqId++;
      room.rollback.saveSnapshot(room.seqId, room.engine.getState());

      
      if (room.dirty || this.stats.framesProcessed % 2 === 0) {
        this.sendState(roomId, room);
        room.dirty = false;
      }
    }

    this.stats.framesProcessed++;
    const frameTime = performance.now() - start;
    this.stats.frameTimeHistory.push(frameTime);
    if (this.stats.frameTimeHistory.length > 60) this.stats.frameTimeHistory.shift();
    this.stats.averageFrameTime = this.stats.frameTimeHistory.reduce((a, b) => a + b, 0) / this.stats.frameTimeHistory.length;
  }

  sendState(roomId, room) {
    const state = {
      timestamp: performance.now(),
      seqId: room.seqId,
      bodies: room.engine.getState()
    };

    const binaryState = encodePhysicsState(state);

    parentPort.postMessage({
      type: 'physics:delta',
      roomId,
      data: binaryState,
      stats: {
        framesProcessed: this.stats.framesProcessed,
        averageFrameTime: this.stats.averageFrameTime,
      },
    }, [binaryState.buffer]);

    
    if (!room.analyticsCounter) room.analyticsCounter = 0;
    room.analyticsCounter++;
    if (room.analyticsCounter % 6 === 0) {
      try {
        const result = this.analytics.processFrame(roomId, state.bodies);
        if (result) {
          parentPort.postMessage({
            type: 'analytics:frame',
            data: result
          });
        }
      } catch (err) {
        console.error(`[Analytics error] Room ${roomId}:`, err);
      }
    }
  }

  handleMessage(msg) {
    const { roomId } = msg;
    const room = roomId ? this.getOrInitRoom(roomId) : null;

    switch (msg.type) {
      case 'body:add':
        room.engine.addBody(msg.bodyId, msg.config);
        room.dirty = true;
        break;
      case 'body:update':
        room.engine.updateBody(msg.bodyId, msg.updates);
        room.dirty = true;
        break;
      case 'tick':
        this.step();
        break;
      case 'rollback':
        room.rollback.rollbackTo(room.engine, msg.targetSeqId);
        room.rollback.replayEvents(room.engine, msg.targetSeqId);
        room.dirty = true;
        break;
      case 'shutdown':
        process.exit(0);
        break;
    }
  }
}

const worker = new PhysicsWorker();
parentPort.on('message', (msg) => worker.handleMessage(msg));
console.log('PhysicsWorker initialized (Multi-room support)');
