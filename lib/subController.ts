// This file handles external components subscribing to pulse.
// It also handles subscribing mapData properties to collections

import { uuid } from './helpers';
import { ComponentContainer } from './interfaces';
import Dep from './dep';

interface SubscribingComponentObject {
  componentUUID: string;
  keys: Array<string>;
}

export default class SubController {
  public subscribingComponentKey: number = 0;
  public subscribingComponent: boolean | SubscribingComponentObject = false;
  public unsubscribingComponent: boolean = false;
  public skimmingDeepReactive: boolean = false;
  public uuid: any = uuid;
  public lastAccessedDep: null | Dep = null;

  public componentStore: { [key: string]: ComponentContainer } = {};

  constructor(private getContext: any) {}

  registerComponent(instance, config) {
    let uuid = instance.__pulseUniqueIdentifier;
    if (!uuid) {
      // generate UUID
      uuid = this.uuid();
      // inject uuid into component instance
      const componentContainer = {
        instance: instance,
        uuid,
        ready: config.waitForMount ? false : true
      };
      instance.__pulseUniqueIdentifier = uuid;

      this.componentStore[uuid] = componentContainer;
    } else {
      this.mount(instance);
    }
    return uuid;
  }

  mount(instance) {
    let component = this.componentStore[instance.__pulseUniqueIdentifier];

    if (component) {
      component.instance = instance;
      component.ready = true;
    }
  }

  unmount(instance) {
    const uuid = instance.__pulseUniqueIdentifier;
    if (!uuid) return;

    // delete refrence to this component from store
    delete this.componentStore[instance.__pulseUniqueIdentifier];
  }

  subscribePropertiesToComponents(properties, componentUUID) {
    // provisionally get keys of mapped data
    const provision = properties(this.getContext());

    const keys = Object.keys(provision);

    // mapData has a user defined local key, we need to include that in the
    // subscription so we know what to update on the component later.
    this.subscribingComponentKey = 0;

    this.subscribingComponent = {
      componentUUID,
      keys
    };
    const returnToComponent = properties(this.getContext());

    this.subscribingComponent = false;

    this.subscribingComponentKey = 0;

    return returnToComponent;
  }

  prepareNext(dep) {
    this.lastAccessedDep = dep;
    if (!this.skimmingDeepReactive) this.subscribingComponentKey++;
  }

  foundDeepReactive() {
    this.skimmingDeepReactive = true;
    // undo changes
    this.lastAccessedDep.subscribers.pop();
    this.subscribingComponentKey--;
  }

  exitDeepReactive() {
    this.skimmingDeepReactive = false;
    //redo changes
    this.lastAccessedDep.subscribe();
    this.subscribingComponentKey++;
  }
}