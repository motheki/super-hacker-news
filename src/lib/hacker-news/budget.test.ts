import { describe, expect, test } from "bun:test";
import { RequestBudget, SubrequestBudgetError } from "./budget";

describe("RequestBudget", () => {
  test("allows popular threads while keeping a bounded Standard-plan fallback", () => {
    const budget = new RequestBudget();
    for (let index = 0; index < 503; index += 1) budget.take();
    expect(budget.snapshot()).toEqual({ subrequestsUsed: 503, subrequestsRemaining: 497 });
    expect(budget.canTake(497)).toBeTrue();
    expect(budget.canTake(498)).toBeFalse();
  });

  test("counts requests and refuses to exceed its limit", () => {
    const budget = new RequestBudget(2);

    budget.take();
    expect(budget.snapshot()).toEqual({
      subrequestsRemaining: 1,
      subrequestsUsed: 1,
    });

    budget.take();
    expect(() => budget.take()).toThrow(SubrequestBudgetError);
    expect(budget.snapshot()).toEqual({
      subrequestsRemaining: 0,
      subrequestsUsed: 2,
    });
  });
});
