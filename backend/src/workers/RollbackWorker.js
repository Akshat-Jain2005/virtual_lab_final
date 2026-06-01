
const { parentPort } = require('worker_threads');

class RollbackWorker {
  constructor() {
    this.snapshots = new Map(); 
    this.maxSnapshots = 500;
  }

  handleSnapshot(data) {
    const { roomId, seqId, state } = data;
    if (!this.snapshots.has(roomId)) {
      this.snapshots.set(roomId, []);
    }
    
    const roomSnapshots = this.snapshots.get(roomId);
    roomSnapshots.push({ seqId, state, timestamp: Date.now() });
    
    if (roomSnapshots.length > this.maxSnapshots) {
      roomSnapshots.shift();
    }
  }

  handleRollbackRequest(data) {
    const { roomId, targetSeqId } = data;
    const roomSnapshots = this.snapshots.get(roomId);
    
    if (!roomSnapshots) return;

    const snapshot = roomSnapshots.find(s => s.seqId === targetSeqId);
    if (!snapshot) {
      parentPort.postMessage({
        type: 'rollback:error',
        roomId,
        error: 'Snapshot not found'
      });
      return;
    }

    
    parentPort.postMessage({
      type: 'rollback:snapshot_found',
      roomId,
      targetSeqId,
      state: snapshot.state
    });
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'snapshot':
        this.handleSnapshot(msg.data);
        break;
      case 'rollback:request':
        this.handleRollbackRequest(msg.data);
        break;
      case 'shutdown':
        process.exit(0);
        break;
    }
  }
}

const worker = new RollbackWorker();
parentPort.on('message', (msg) => worker.handleMessage(msg));
console.log('RollbackWorker initialized (Snapshot Repository)');
