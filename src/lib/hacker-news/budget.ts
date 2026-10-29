const DEFAULT_REQUEST_LIMIT = 64;

export interface BudgetSnapshot {
  readonly requestsRemaining: number;
  readonly requestsUsed: number;
}

export class RequestBudgetError extends Error {
  constructor() {
    super("Hacker News request budget exhausted");
    this.name = "RequestBudgetError";
  }
}

export class RequestBudget {
  readonly #limit: number;
  #used = 0;

  constructor(limit = DEFAULT_REQUEST_LIMIT) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("Invalid request budget");
    this.#limit = limit;
  }

  canTake(count: number, reserve = 0) {
    return this.#used + count + reserve <= this.#limit;
  }

  take() {
    if (!this.canTake(1)) throw new RequestBudgetError();

    this.#used += 1;
  }

  snapshot(): BudgetSnapshot {
    return {
      requestsRemaining: this.#limit - this.#used,
      requestsUsed: this.#used,
    };
  }
}
