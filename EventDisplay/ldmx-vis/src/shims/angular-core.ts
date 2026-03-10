type SubscriptionCallback<T> = (value: T) => void;

/**
 * Minimal EventEmitter shim for Phoenix internals.
 * Phoenix uses Angular's EventEmitter only as a lightweight pub/sub channel.
 */
export class EventEmitter<T> {
  private listeners = new Set<SubscriptionCallback<T>>();

  emit(value: T) {
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  subscribe(listener: SubscriptionCallback<T>) {
    this.listeners.add(listener);
    return {
      unsubscribe: () => {
        this.listeners.delete(listener);
      }
    };
  }
}
