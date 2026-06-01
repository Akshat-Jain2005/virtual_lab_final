
const EventEmitter = require('events');

class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    this.EVENTS = {
      ROOM_CREATED: 'room:created',
      USER_JOINED: 'user:joined',
      USER_LEFT: 'user:left',
      PHYSICS_TICK: 'physics:tick',
      ROLLBACK: 'physics:rollback',
      ANALYTICS_UPDATE: 'analytics:update',
      EXPERIMENT_SAVE: 'experiment:save'
    };
  }
}


const eventBus = new DomainEventBus();

module.exports = eventBus;
