export type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

export class CircuitBreaker {
  private state: State = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private nextAttempt = 0;
  private options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN' && Date.now() < this.nextAttempt) {
      throw new Error('Circuit breaker is OPEN');
    }
    return fn()
      .then(() => {
        this.onSuccess();
        return fn();
      })
      .catch((err) => {
        this.onFailure();
        throw err;
      });
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = 'CLOSED';
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.successes = 0;
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.timeout;
    }
  }

  getState(): State { return this.state; }
  reset(): void { this.state = 'CLOSED'; this.failures = 0; this.successes = 0; }
}
