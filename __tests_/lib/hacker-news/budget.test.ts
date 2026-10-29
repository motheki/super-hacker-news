import { describe, expect, test } from "bun:test";
import { RequestBudget, RequestBudgetError } from "../../../src/lib/hacker-news/budget";

describe("RequestBudget", () => {
  test("counts requests and refuses to exceed its limit", () => {
    const budget = new RequestBudget(2);

    budget.take();
    expect(budget.snapshot()).toEqual({
      requestsRemaining: 1,
      requestsUsed: 1,
    });

    budget.take();
    expect(() => budget.take()).toThrow(RequestBudgetError);
    expect(budget.snapshot()).toEqual({
      requestsRemaining: 0,
      requestsUsed: 2,
    });
  });
});
