
class RollbackManager {
  constructor(maxSnapshots = 300) {
    this.snapshots = []; 
    this.maxSnapshots = maxSnapshots;
    this.events = []; 
  }

  saveSnapshot(sequenceId, state) {
    this.snapshots.push({ sequenceId, state, timestamp: Date.now() });
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  getSnapshot(sequenceId) {
    return this.snapshots.find(s => s.sequenceId === sequenceId);
  }

  rollbackTo(engine, sequenceId) {
    const snapshot = this.getSnapshot(sequenceId);
    if (!snapshot) return false;

    snapshot.state.forEach(bodyState => {
      engine.updateBody(bodyState.id, {
        position: bodyState.position,
        velocity: bodyState.velocity,
        angle: bodyState.angle
      });
    });

    return true;
  }

  addEvent(event) {
    this.events.push(event);
    this.events.sort((a, b) => a.seqId - b.seqId);
  }

    replayEvents(engine, startSeq) {
    const eventsToReplay = this.events.filter(e => e.seqId > startSeq);
    
    eventsToReplay.forEach(event => {
      this.applyEvent(engine, event);
    });

    this.events = this.events.filter(e => e.seqId > startSeq);
  }

    applyEvent(engine, event) {
    switch (event.type) {
      case 'physics:grab':
        engine.updateBody(event.bodyId, {
          position: event.position,
          velocity: event.velocity
        });
        break;
      
      case 'body:add':
        engine.addBody(event.bodyId, event.config);
        break;
      
      case 'body:remove':
        engine.removeBody(event.bodyId);
        break;
      
      case 'force:apply':
        engine.updateBody(event.bodyId, { force: event.force });
        break;
      
      case 'constraint:change':
        
        break;
        
      default:
        console.warn(`[ROLLBACK] Unhandled event type: ${event.type}`);
    }
  }
}

module.exports = RollbackManager;
