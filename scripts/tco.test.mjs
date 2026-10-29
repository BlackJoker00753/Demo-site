import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateWatchTCO, detectServiceTier, TCO_PRESETS } from "../frontend/js/core/tco.js";
import { usd } from "../frontend/js/core/format.js";

test("published five-year example includes the same insurance and inflation in summary and table", () => {
  const result = calculateWatchTCO({ retailPriceUsd: 10000, brandSlug: "rolex", years: 5, includeInsurance: true });
  assert.equal(result.totalServiceCostUsd, 622);
  assert.equal(result.totalWaterTestCostUsd, 172);
  assert.equal(result.totalInsuranceCostUsd, 675);
  assert.equal(result.totalMaintenanceCostUsd, 1469);
  assert.equal(result.netTcoUsd, -31);
  assert.equal(result.timeline.find(row => row.year === 5).netTcoUsd, -31);
  assert.equal(usd(result.costPerDayUsd, { fractionDigits: 2 }), "$-0,02");
  assert.equal(usd(3.25, { fractionDigits: 2 }), "$3,25");
  assert.equal(usd(10000), "$10 000");
});

test("every selected horizon reconciles across brands, service classes, conditions and insurance", () => {
  for (const brandSlug of ["rolex", "seiko", "fp-journe", "unknown-brand"]) {
    for (const serviceTierId of ["base", "medium", "high", "grand", "quartz"]) {
      for (const includeInsurance of [false, true]) {
        for (const conditionId of ["mint_fullset", "watch_only"]) {
          for (let years = 1; years <= 15; years++) {
            const result = calculateWatchTCO({ retailPriceUsd: 12500, brandSlug, serviceTierId, years, includeInsurance, conditionId });
            const row = result.timeline.find(row => row.year === years);
            assert.ok(row, `missing selected year ${years}`);
            for (const key of ["totalServiceCostUsd", "totalWaterTestCostUsd", "totalInsuranceCostUsd", "totalMaintenanceCostUsd", "residualValueUsd", "netTcoUsd", "costPerDayUsd"]) assert.equal(row[key], result[key], key);
            assert.equal(result.totalMaintenanceCostUsd, result.totalServiceCostUsd + result.totalWaterTestCostUsd + result.totalInsuranceCostUsd);
            assert.equal(result.netTcoUsd, 12500 + result.totalMaintenanceCostUsd - result.residualValueUsd);
            if (!includeInsurance) assert.equal(result.totalInsuranceCostUsd, 0);
          }
        }
      }
    }
  }
});

test("insurance changes all horizons, not only the highlighted summary", () => {
  const options = { retailPriceUsd: 10000, years: 7, annualInflation: 0 };
  const plain = calculateWatchTCO(options);
  const insured = calculateWatchTCO({ ...options, includeInsurance: true });
  for (const row of insured.timeline) {
    const previous = plain.timeline.find(previous => previous.year === row.year);
    assert.equal(row.netTcoUsd - previous.netTcoUsd, row.totalInsuranceCostUsd);
    assert.ok(row.totalInsuranceCostUsd > 0);
  }
  assert.equal(plain.totalWaterTestCostUsd, 240);
  assert.equal(plain.totalServiceCostUsd, 550);
});

test("frequency of wearing changes cost per day but never total ownership costs", () => {
  const options = { retailPriceUsd: 2000, brandSlug: "seiko", years: 7 };
  const daily = calculateWatchTCO(options);
  const occasional = calculateWatchTCO({ ...options, wearFrequencyId: "occasional" });
  assert.equal(daily.netTcoUsd, occasional.netTcoUsd);
  assert.equal(daily.totalDaysWorn, 7 * 365);
  assert.equal(occasional.totalDaysWorn, 7 * 12);
  assert.ok(Math.abs(occasional.costPerDayUsd) > Math.abs(daily.costPerDayUsd));
});

test("electronic movements are not assigned a mechanical overhaul", () => {
  for (const type of ["quartz", "smart", "solar", "kinetic"]) assert.equal(detectServiceTier(["chronograph"], type), "quartz");
  assert.equal(detectServiceTier([], "automatic"), "base");
  assert.equal(detectServiceTier(["minute-repeater"], "manual"), "grand");
});

test("presets are eight distinct canonical selections", () => {
  assert.equal(TCO_PRESETS.length, 8);
  assert.equal(new Set(TCO_PRESETS.map(([slug]) => slug)).size, 8);
  assert.ok(TCO_PRESETS.some(([slug]) => slug === "omega-speedmaster-moonwatch"));
  assert.ok(TCO_PRESETS.some(([slug]) => slug === "cartier-santos"));
});
