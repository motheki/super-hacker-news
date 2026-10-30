// This deployment uses Workers Standard (10,000 subrequests per invocation).
// Keep a smaller application cap to bound fallback work, with room for comment
// trees, deleted items, and retries. Free-plan callers can pass a limit of 50.
const WORKER_SUBREQUEST_LIMIT = 1_000;

export interface BudgetSnapshot {
  readonly subrequestsRemaining: number;
  readonly subrequestsUsed: number;
}

export class SubrequestBudgetError extends Error {
  constructor() {
    super("Worker subrequest budget exhausted");
    this.name = "SubrequestBudgetError";
  }
}

export class RequestBudget {
  readonly #limit: number;
  #used = 0;

  constructor(limit = WORKER_SUBREQUEST_LIMIT) {
    this.#limit = limit;
  }

  canTake(count: number, reserve = 0) {
    return this.#used + count + reserve <= this.#limit;
  }

  take() {
    if (!this.canTake(1)) throw new SubrequestBudgetError();

    this.#used += 1;
  }

  snapshot(): BudgetSnapshot {
    return {
      subrequestsRemaining: this.#limit - this.#used,
      subrequestsUsed: this.#used,
    };
  }
}
