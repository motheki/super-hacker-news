import { describe, expect, test } from "bun:test";
import { RequestBudget, SubrequestBudgetError } from "./budget";

describe("RequestBudget", () => {
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
