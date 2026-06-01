
const os = require("os");
const { Worker } = require("worker_threads");
const path = require("path");
const EventEmitter = require("events");
const metrics = require("../utils/metrics");

class WorkerPool extends EventEmitter {
  constructor(options = {}) {
    super();

    this.maxWorkers = options.maxWorkers || os.cpus().length;
    this.workerScript =
      options.workerScript || path.join(__dirname, "PhysicsWorker.js");

    
    this.workers = new Map();

    
    this.roomQueue = [];

    
    this.roomToWorker = new Map();

    
    this.workerCounter = 0;
    this.roomCounter = 0;

    
    this.healthCheckInterval = options.healthCheckInterval || 5000;
    this.healthCheckTimer = null;

    this.metrics = {
      workersCreated: 0,
      workersTerminated: 0,
      roomsAssigned: 0,
      roomsRetired: 0,
      queueDepth: 0,
      averageRoomsPerWorker: 0,
    };
    
    this.io = null;

    
    this.startHealthCheck();
  }

    setIo(io) {
    this.io = io;
  }

    async spawn(roomId) {
    
    const availableWorker = this.getAvailableWorker();

    if (availableWorker) {
      return this.assignRoomToWorker(availableWorker, roomId);
    }

    
    this.roomQueue.push(roomId);
    this.metrics.queueDepth = this.roomQueue.length;

    return new Promise((resolve, reject) => {
      
      const timeoutId = setTimeout(() => {
        const idx = this.roomQueue.indexOf(roomId);
        if (idx !== -1) {
          this.roomQueue.splice(idx, 1);
          this.metrics.queueDepth = this.roomQueue.length;
        }
        reject(new Error(`Room ${roomId} queue timeout (60s)`));
      }, 60000);

      
      const queueEntry = { roomId, resolve, reject, timeoutId };
      this.roomQueue[this.roomQueue.length - 1] = queueEntry;
    });
  }

    retire(roomId) {
    const workerId = this.roomToWorker.get(roomId);

    if (!workerId) {
      return; 
    }

    const worker = this.workers.get(workerId);
    if (worker) {
      const idx = worker.assignedRooms.indexOf(roomId);
      if (idx !== -1) {
        worker.assignedRooms.splice(idx, 1);
      }

      
      if (worker.assignedRooms.length === 0 && worker.terminated) {
        this.workers.delete(workerId);
      }
    }

    this.roomToWorker.delete(roomId);
    this.metrics.roomsRetired++;

    
    this.processQueue();
    this.updatePrometheusMetrics();
  }

    getWorkerForRoom(roomId) {
    return this.roomToWorker.get(roomId) || null;
  }

    getAvailableWorker() {
    
    if (this.workers.size < this.maxWorkers) {
      return this.createWorker();
    }

    
    let leastLoaded = null;
    let minRooms = Infinity;

    for (const [, worker] of this.workers) {
      if (worker.assignedRooms.length < minRooms && !worker.terminated) {
        leastLoaded = worker;
        minRooms = worker.assignedRooms.length;
      }
    }

    return leastLoaded;
  }

    createWorker() {
    const workerId = `worker-${this.workerCounter++}`;

    const worker = new Worker(this.workerScript);

    const workerEntry = {
      id: workerId,
      worker,
      assignedRooms: [],
      health: "healthy",
      createdAt: Date.now(),
      lastHealthCheck: Date.now(),
      stats: {
        framesProcessed: 0,
        framesDropped: 0,
        averageFrameTime: 0,
      },
      terminated: false,
    };

    
    worker.on("error", (err) => {
      console.error(`Worker ${workerId} error:`, err);
      workerEntry.health = "error";
      this.emit("worker:error", { workerId, error: err });
    });

    
    worker.on("exit", (code) => {
      if (code !== 0) {
        console.warn(`Worker ${workerId} exited with code ${code}`);
        workerEntry.health = "dead";
      }
      workerEntry.terminated = true;
      this.metrics.workersTerminated++;
      this.emit("worker:exit", { workerId, code });
    });

    
    worker.on("message", (msg) => {
      if (msg.type === "stats") {
        workerEntry.stats = msg.data;
        metrics.updatePhysicsFrameTime(msg.data.averageFrameTime);
      } else if (msg.type === "physics:delta") {
        
        if (this.io && msg.roomId) {
          this.io.to(msg.roomId).emit("physics:delta", msg.data);
        }
      } else if (msg.type === "analytics:frame") {
        
        if (this.io && msg.data && msg.data.roomId) {
          this.io.to(msg.data.roomId).emit("analytics:frame", msg.data);
        }
      }
    });

    this.workers.set(workerId, workerEntry);
    this.metrics.workersCreated++;
    this.updatePrometheusMetrics();

    return workerEntry;
  }

    assignRoomToWorker(workerEntry, roomId) {
    workerEntry.assignedRooms.push(roomId);
    this.roomToWorker.set(roomId, workerEntry.id);
    this.metrics.roomsAssigned++;
    this.updateAverageRoomsPerWorker();

    return {
      workerId: workerEntry.id,
      roomId,
    };
  }

    processQueue() {
    while (this.roomQueue.length > 0) {
      const queueEntry = this.roomQueue[0];
      const roomId = queueEntry.roomId || queueEntry;

      const availableWorker = this.getAvailableWorker();
      if (!availableWorker) {
        break; 
      }

      this.roomQueue.shift();
      this.metrics.queueDepth = this.roomQueue.length;

      const result = this.assignRoomToWorker(availableWorker, roomId);

      
      if (queueEntry.resolve) {
        clearTimeout(queueEntry.timeoutId);
        queueEntry.resolve(result);
      }
    }
  }

    startHealthCheck() {
    this.healthCheckTimer = setInterval(() => {
      for (const [workerId, workerEntry] of this.workers) {
        if (workerEntry.terminated) {
          continue;
        }

        
        const timeSinceCheck = Date.now() - workerEntry.lastHealthCheck;
        if (timeSinceCheck > 30000) {
          console.warn(`Worker ${workerId} appears unresponsive, restarting`);
          this.restartWorker(workerId);
        }
      }
    }, this.healthCheckInterval);
  }

    restartWorker(workerId) {
    const workerEntry = this.workers.get(workerId);
    if (!workerEntry) return;

    
    if (!workerEntry.terminated) {
      try {
        workerEntry.worker.terminate();
      } catch (e) {
        
      }
    }

    
    const roomsToReassign = [...workerEntry.assignedRooms];
    this.workers.delete(workerId);

    for (const roomId of roomsToReassign) {
      this.roomToWorker.delete(roomId);
      this.spawn(roomId).catch((err) => {
        console.error(`Failed to reassign room ${roomId}:`, err);
      });
    }

    this.emit("worker:restarted", { workerId });
  }

    async shutdown() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const shutdownPromises = [];

    for (const [workerId, workerEntry] of this.workers) {
      if (!workerEntry.terminated) {
        shutdownPromises.push(
          new Promise((resolve) => {
            try {
              workerEntry.worker.terminate().then(resolve).catch(resolve);
            } catch (e) {
              resolve();
            }
          }),
        );
      }
    }

    await Promise.all(shutdownPromises);
    this.workers.clear();
    this.roomToWorker.clear();
    this.roomQueue = [];

    console.log("WorkerPool shut down gracefully");
  }

    getMetrics() {
    return {
      ...this.metrics,
      activeWorkers: this.workers.size,
      activeRooms: this.roomToWorker.size,
      queuedRooms: this.roomQueue.length,
      workerDetails: Array.from(this.workers.entries()).map(([id, w]) => ({
        id,
        health: w.health,
        assignedRooms: w.assignedRooms.length,
        stats: w.stats,
      })),
    };
  }

    sendToWorker(roomId, message) {
    const workerId = this.getWorkerForRoom(roomId);
    if (!workerId) return false;

    const workerEntry = this.workers.get(workerId);
    if (workerEntry && !workerEntry.terminated) {
      workerEntry.worker.postMessage(message);
      return true;
    }
    return false;
  }

    broadcastTick() {
    for (const [, workerEntry] of this.workers) {
      if (!workerEntry.terminated && workerEntry.health === "healthy") {
        workerEntry.worker.postMessage({ type: "tick" });
      }
    }
  }

    updateAverageRoomsPerWorker() {
    const activeWorkers = Array.from(this.workers.values()).filter(
      (w) => !w.terminated,
    );
    if (activeWorkers.length === 0) {
      this.metrics.averageRoomsPerWorker = 0;
      this.updatePrometheusMetrics();
      return;
    }

    const totalRooms = activeWorkers.reduce(
      (sum, w) => sum + w.assignedRooms.length,
      0,
    );
    this.metrics.averageRoomsPerWorker = totalRooms / activeWorkers.length;
    this.updatePrometheusMetrics();
  }

    updatePrometheusMetrics() {
    metrics.updateWorkerPoolMetrics({
      activeWorkers: Array.from(this.workers.values()).filter(w => !w.terminated).length,
      maxWorkers: this.maxWorkers,
      queuedRooms: this.roomQueue.length,
    });
  }
}


let poolInstance = null;

function getInstance(options) {
  if (!poolInstance) {
    poolInstance = new WorkerPool(options);
  }
  return poolInstance;
}

module.exports = {
  WorkerPool,
  getInstance,
};
