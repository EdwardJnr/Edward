import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMonth, isMonth, monthRange, previousMonth, type LeadForMetrics } from "./metrics";

const lead = (over: Partial<LeadForMetrics>): LeadForMetrics => ({
  source: "WhatsApp",
  stage: "new",
  valueCents: null,
  isRepeat: false,
  firstContactOn: "2026-10-03",
  closedOn: null,
  ...over,
});

test("counts enquiries by first contact and sales by close date", () => {
  const leads = [
    lead({}),
    lead({ source: "Instagram" }),
    lead({ firstContactOn: "2026-09-20", stage: "won", valueCents: 50_000, closedOn: "2026-10-02", isRepeat: true }),
    lead({ stage: "won", valueCents: 25_000, closedOn: "2026-10-10" }),
    lead({ stage: "lost", closedOn: "2026-10-11" }),
    lead({ firstContactOn: "2026-11-01" }),
  ];
  const m = computeMonth(leads, "2026-10", 40_000);
  assert.equal(m.enquiries, 4);
  assert.deepEqual(m.enquiriesBySource, { WhatsApp: 3, Instagram: 1 });
  assert.equal(m.spendDollars, 400);
  assert.equal(m.costPerEnquiryDollars, 100);
  assert.equal(m.salesCount, 2);
  assert.equal(m.salesDollars, 750);
  assert.equal(m.repeatSharePercent, 50);
});

test("leaves cost per enquiry and repeat share empty when they cannot be calculated", () => {
  const m = computeMonth([lead({ firstContactOn: "2026-08-01" })], "2026-10", null);
  assert.equal(m.enquiries, 0);
  assert.equal(m.costPerEnquiryDollars, null);
  assert.equal(m.repeatSharePercent, null);
  assert.equal(computeMonth([], "2026-10", 10_000).costPerEnquiryDollars, null);
});

test("month helpers handle year boundaries", () => {
  assert.equal(previousMonth("2026-01"), "2025-12");
  assert.deepEqual(monthRange("2026-12"), ["2026-12-01", "2027-01-01"]);
  assert.deepEqual(monthRange("2026-02"), ["2026-02-01", "2026-03-01"]);
  assert.equal(isMonth("2026-13"), false);
  assert.equal(isMonth("2026-10"), true);
});
