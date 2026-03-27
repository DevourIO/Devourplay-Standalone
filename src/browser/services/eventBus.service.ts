import EventEmitter from 'events';

export class EventBusService extends EventEmitter {}

export const eventBusInstance = new EventBusService();
