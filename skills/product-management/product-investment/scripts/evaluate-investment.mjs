// skills/product-management/product-investment/scripts/evaluate-investment.mjs
// Offline deterministic investment calculator and evaluation library (Node >= 20.0.0 built-in only)

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const MAX_MAGNITUDE = 9007199254740991n; // 2^53 - 1
const MAX_NPV_TOTAL_DOMAIN = 1000000000000n; // 1e12 minor units for bounded NPV floating precision
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;
const MONETARY_DECIMAL_REGEX = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;
const EVIDENCE_ID_REGEX = /^(?:CLM|SRC)-[0-9]{3,}$/;

function pointerToken(value) {
  return String(value).replace(/~/g, "~0").replace(/\//g, "~1");
}

function nonblank(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const ALLOWED_ROOT_KEYS = new Set([
  "schema_version",
  "analysis_id",
  "currency",
  "money_scale",
  "price_basis",
  "price_date",
  "horizon",
  "cohort",
  "counterfactual",
  "accounting_boundary",
  "discount",
  "scenarios"
]);

const ALLOWED_HORIZON_KEYS = new Set(["start_date", "period", "periods"]);
const ALLOWED_DISCOUNT_KEYS = new Set(["rate", "convention", "price_basis"]);
const ALLOWED_SCENARIO_KEYS = new Set([
  "id",
  "label",
  "assumptions",
  "items",
  "nonmonetary"
]);

const ALLOWED_ITEM_KEYS = new Set([
  "id",
  "side",
  "category",
  "mechanism_id",
  "period",
  "amount",
  "currency",
  "basis",
  "netted_cost_categories",
  "rationale",
  "evidence_ids"
]);

const VALID_BENEFIT_CATEGORIES = new Set([
  "acquisition",
  "conversion",
  "retention",
  "expansion",
  "cash_saving"
]);

const VALID_COST_CATEGORIES = new Set([
  "development",
  "acquisition",
  "operations",
  "support",
  "experiment",
  "other"
]);

/**
 * Validate real Gregorian calendar date (YYYY-MM-DD).
 */
function isValidGregorianDate(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [yStr, mStr, dStr] = dateStr.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1) {
    return false;
  }
  const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  let maxDays = 31;
  if (m === 2) {
    maxDays = isLeap ? 29 : 28;
  } else if (m === 4 || m === 6 || m === 9 || m === 11) {
    maxDays = 30;
  }
  return d <= maxDays;
}

/**
 * Format minor units as a fixed-scale decimal string.
 * Negative zero is normalized to positive zero.
 */
function formatMoney(minorUnits, scale) {
  if (minorUnits === 0n) {
    return "0" + (scale > 0 ? "." + "0".repeat(scale) : "");
  }
  let isNeg = false;
  let absVal = minorUnits;
  if (absVal < 0n) {
    isNeg = true;
    absVal = -absVal;
  }
  if (scale === 0) {
    return (isNeg ? "-" : "") + absVal.toString();
  }
  const divisor = 10n ** BigInt(scale);
  const intPart = absVal / divisor;
  const fracPart = absVal % divisor;
  const fracStr = fracPart.toString().padStart(scale, "0");
  return (isNeg ? "-" : "") + intPart.toString() + "." + fracStr;
}

/**
 * Rational division of P / Q with half-away-from-zero rounding to fixed decimal places.
 * Q must be positive BigInt.
 */
function formatRational(P, Q, decimalPlaces) {
  if (Q <= 0n) {
    throw new Error("Rational denominator Q must be positive BigInt");
  }
  let isNegative = false;
  let pAbs = P;
  if (pAbs < 0n) {
    isNegative = true;
    pAbs = -pAbs;
  }
  const mult = 10n ** BigInt(decimalPlaces);
  let div = (pAbs * mult) / Q;
  const rem = (pAbs * mult) % Q;
  if (rem * 2n >= Q) {
    div += 1n;
  }
  if (div === 0n) {
    isNegative = false; // normalize negative zero
  }
  const divStr = div.toString();
  let intPartStr;
  let fracPartStr;
  if (divStr.length <= decimalPlaces) {
    intPartStr = "0";
    fracPartStr = divStr.padStart(decimalPlaces, "0");
  } else {
    intPartStr = divStr.slice(0, divStr.length - decimalPlaces);
    fracPartStr = divStr.slice(divStr.length - decimalPlaces);
  }
  return (isNegative ? "-" : "") + intPartStr + "." + fracPartStr;
}
/**
 * Greatest common divisor for positive BigInts.
 */
function gcdBigInt(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y > 0n) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * Rational division of P / Q with half-away-from-zero rounding to nearest integer.
 * Q must be positive BigInt.
 */
function roundHalfAwayRational(P, Q) {
  if (P === 0n) return 0n;
  if (Q <= 0n) {
    throw new Error("Rational denominator Q must be positive BigInt");
  }
  const isNeg = P < 0n;
  const absP = isNeg ? -P : P;
  const div = absP / Q;
  const rem = absP % Q;
  const rounded = (rem * 2n >= Q) ? div + 1n : div;
  return isNeg ? -rounded : rounded;
}

/**
 * Parse effective annual discount rate decimal string into exact rational factor 1 + r = N / D.
 * N and D are positive BigInts in lowest terms.
 */
function parseDiscountRatio(rateStr) {
  const parts = rateStr.split(".");
  const intPart = BigInt(parts[0] || "0");
  const fracStr = parts[1] || "";
  const scale = 10n ** BigInt(fracStr.length);
  const fracPart = BigInt(fracStr || "0");
  const rateNumerator = intPart * scale + fracPart;
  const onePlusRNum = scale + rateNumerator;
  const onePlusRDen = scale;
  const g = gcdBigInt(onePlusRNum, onePlusRDen);
  return {
    N: onePlusRNum / g,
    D: onePlusRDen / g
  };
}

/**
 * Deduplicate and sort issues by ASCII path, code, and record_id.
 */
function finalizeIssues(issuesList) {
  issuesList.sort((a, b) => {
    if (a.path !== b.path) return a.path < b.path ? -1 : 1;
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    const recA = a.record_id ?? "";
    const recB = b.record_id ?? "";
    if (recA !== recB) return recA < recB ? -1 : 1;
    return 0;
  });

  const unique = [];
  const seen = new Set();
  for (const iss of issuesList) {
    const key = JSON.stringify([iss.path, iss.code, iss.record_id ?? null]);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(iss);
    }
  }
  return unique;
}

/**
 * Evaluate an investment analysis payload synchronously.
 * Returns an envelope containing schema_version, tool, analysis_id, currency, money_scale, results, and issues.
 */
export function evaluateInvestment(input) {
  const issues = [];

  function addIssue(code, path, message, recordId = null) {
    issues.push({
      code,
      severity: "error",
      path,
      record_id: recordId,
      message
    });
  }

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      schema_version: 1,
      tool: "investment-calculator",
      analysis_id: null,
      currency: null,
      money_scale: null,
      results: [],
      issues: [
        {
          code: "INVALID_FIELD",
          severity: "error",
          path: "",
          record_id: null,
          message: "Input must be a valid JSON object"
        }
      ]
    };
  }

  for (const k of Object.keys(input)) {
    if (!ALLOWED_ROOT_KEYS.has(k)) {
      addIssue("INVALID_FIELD", `/${pointerToken(k)}`, "Unknown root field");
    }
  }

  const analysisId = typeof input.analysis_id === "string" ? input.analysis_id : null;
  const currency = typeof input.currency === "string" ? input.currency : null;
  const moneyScale = typeof input.money_scale === "number" ? input.money_scale : null;

  // Schema version check
  if (input.schema_version !== 1) {
    addIssue("UNSUPPORTED_VERSION", "/schema_version", "schema_version must be 1");
  }

  // analysis_id
  if (typeof input.analysis_id !== "string" || !SLUG_REGEX.test(input.analysis_id) || input.analysis_id.length > 40) {
    addIssue("INVALID_FIELD", "/analysis_id", "analysis_id must be a slug grammar string of at most 40 characters");
  }

  // currency
  if (typeof input.currency !== "string" || !CURRENCY_REGEX.test(input.currency)) {
    addIssue("INVALID_FIELD", "/currency", "currency must be 3 uppercase ASCII letters");
  }

  // money_scale
  if (typeof input.money_scale !== "number" || !Number.isInteger(input.money_scale) || input.money_scale < 0 || input.money_scale > 4) {
    addIssue("INVALID_FIELD", "/money_scale", "money_scale must be an integer between 0 and 4");
  }

  // price_basis
  if (input.price_basis !== "nominal" && input.price_basis !== "real") {
    addIssue("INVALID_FIELD", "/price_basis", "price_basis must be nominal or real");
  }

  // price_date
  if (!isValidGregorianDate(input.price_date)) {
    addIssue("INVALID_FIELD", "/price_date", "price_date must be a valid Gregorian calendar date (YYYY-MM-DD)");
  }

  // horizon
  if (typeof input.horizon !== "object" || input.horizon === null || Array.isArray(input.horizon)) {
    addIssue("INVALID_FIELD", "/horizon", "horizon must be an object");
  } else {
    for (const hk of Object.keys(input.horizon)) {
      if (!ALLOWED_HORIZON_KEYS.has(hk)) {
        addIssue("INVALID_FIELD", `/horizon/${pointerToken(hk)}`, "Unknown horizon field");
      }
    }
    if (!isValidGregorianDate(input.horizon.start_date)) {
      addIssue("INVALID_FIELD", "/horizon/start_date", "horizon.start_date must be a valid Gregorian calendar date (YYYY-MM-DD)");
    }
    if (input.horizon.period !== "month" && input.horizon.period !== "year") {
      addIssue("INVALID_FIELD", "/horizon/period", "horizon.period must be month or year");
    }
    if (typeof input.horizon.periods !== "number" || !Number.isInteger(input.horizon.periods) || input.horizon.periods < 1) {
      addIssue("INVALID_FIELD", "/horizon/periods", "horizon.periods must be an integer >= 1");
    } else if (input.horizon.periods > 600) {
      addIssue("LIMIT_EXCEEDED", "/horizon/periods", "horizon.periods exceeds maximum limit of 600 periods");
    }
  }

  // Required explanatory fields must contain non-whitespace text.
  if (!nonblank(input.cohort)) {
    addIssue("INVALID_FIELD", "/cohort", "cohort must be a nonempty string");
  }
  if (!nonblank(input.counterfactual)) {
    addIssue("INVALID_FIELD", "/counterfactual", "counterfactual must be a nonempty string");
  }
  if (!nonblank(input.accounting_boundary)) {
    addIssue("INVALID_FIELD", "/accounting_boundary", "accounting_boundary must be a nonempty string");
  }

  // discount
  if (input.discount !== null && typeof input.discount === "object" && !Array.isArray(input.discount)) {
    for (const dk of Object.keys(input.discount)) {
      if (!ALLOWED_DISCOUNT_KEYS.has(dk)) {
        addIssue("INVALID_FIELD", `/discount/${pointerToken(dk)}`, "Unknown discount field");
      }
    }
    if (typeof input.discount.rate !== "string") {
      addIssue("INVALID_FIELD", "/discount/rate", "discount.rate must be a string");
    } else {
      const rateMatch = input.discount.rate.match(/^(0|[1-9][0-9]*)(\.[0-9]+)?$/);
      if (!rateMatch) {
        addIssue("INVALID_FIELD", "/discount/rate", "discount.rate must be a valid decimal string");
      } else {
        const parts = input.discount.rate.split(".");
        const frac = parts[1] || "";
        const rateNum = Number(input.discount.rate);
        if (frac.length > 8 || rateNum < 0 || rateNum > 1 || !Number.isFinite(rateNum)) {
          addIssue("INVALID_FIELD", "/discount/rate", "discount.rate must be between 0 and 1 with at most 8 fractional digits");
        }
      }
    }
    if (input.discount.convention !== "effective_annual") {
      addIssue("INVALID_FIELD", "/discount/convention", "discount.convention must be effective_annual");
    }
    if (input.discount.price_basis !== input.price_basis) {
      addIssue("INCOMPATIBLE_UNITS", "/discount/price_basis", "discount.price_basis must match analysis price_basis");
    }
  } else if (input.discount !== null) {
    addIssue("INVALID_FIELD", "/discount", "discount must be an object or null");
  }

  // scenarios
  if (!Array.isArray(input.scenarios) || input.scenarios.length === 0) {
    addIssue("INVALID_FIELD", "/scenarios", "scenarios must be a nonempty array");
  } else if (input.scenarios.length > 3) {
    addIssue("LIMIT_EXCEEDED", "/scenarios", "scenarios exceeds maximum limit of 3 scenarios");
  }

  const validScenarioIds = new Set(["base", "downside", "upside"]);
  const seenScenarioIds = new Set();
  let hasBaseScenario = false;

  if (Array.isArray(input.scenarios)) {
    for (let sIdx = 0; sIdx < input.scenarios.length; sIdx++) {
      const scenario = input.scenarios[sIdx];
      const sPath = `/scenarios/${sIdx}`;

      if (typeof scenario !== "object" || scenario === null || Array.isArray(scenario)) {
        addIssue("INVALID_FIELD", sPath, "scenario must be an object");
        continue;
      }

      for (const sk of Object.keys(scenario)) {
        if (!ALLOWED_SCENARIO_KEYS.has(sk)) {
          addIssue("INVALID_FIELD", `${sPath}/${pointerToken(sk)}`, "Unknown scenario field");
        }
      }

      if (!validScenarioIds.has(scenario.id)) {
        addIssue("INVALID_FIELD", `${sPath}/id`, "scenario.id must be one of: base, downside, upside");
      } else if (seenScenarioIds.has(scenario.id)) {
        addIssue("DUPLICATE_ITEM", `${sPath}/id`, "duplicate scenario id");
      } else {
        seenScenarioIds.add(scenario.id);
        if (scenario.id === "base") {
          hasBaseScenario = true;
        }
      }

      if (!nonblank(scenario.label)) {
        addIssue("INVALID_FIELD", `${sPath}/label`, "scenario.label must be a nonempty string");
      }
      if (!Array.isArray(scenario.assumptions) || scenario.assumptions.length === 0 || !scenario.assumptions.every(nonblank)) {
        addIssue("INVALID_FIELD", `${sPath}/assumptions`, "scenario.assumptions must be a nonempty array of nonempty strings");
      }
      if (!Array.isArray(scenario.nonmonetary) || !scenario.nonmonetary.every(nonblank)) {
        addIssue("INVALID_FIELD", `${sPath}/nonmonetary`, "scenario.nonmonetary must be an array of non-empty strings");
      }

      if (!Array.isArray(scenario.items)) {
        addIssue("INVALID_FIELD", `${sPath}/items`, "scenario.items must be an array");
        continue;
      } else if (scenario.items.length > 1000) {
        addIssue("LIMIT_EXCEEDED", `${sPath}/items`, "scenario items exceed maximum limit of 1000 items");
      }

      const seenItemIds = new Set();
      const seenBenefitMechanisms = new Map(); // period -> Set(mechanism_id)
      const seenCostMechanisms = new Map(); // period -> Set(`${category}:${mechanism_id}`)
      const seenCapacityMechanisms = new Map(); // period -> Set(mechanism_id)
      const cmNettedCategories = new Set();
      const explicitCostCategories = new Set();

      const periodsLimit = input.horizon && typeof input.horizon.periods === "number" ? input.horizon.periods : 600;

      for (let iIdx = 0; iIdx < scenario.items.length; iIdx++) {
        const item = scenario.items[iIdx];
        const iPath = `${sPath}/items/${iIdx}`;

        if (typeof item !== "object" || item === null || Array.isArray(item)) {
          addIssue("INVALID_FIELD", iPath, "item must be an object");
          continue;
        }

        for (const ik of Object.keys(item)) {
          if (!ALLOWED_ITEM_KEYS.has(ik)) {
            addIssue("INVALID_FIELD", `${iPath}/${pointerToken(ik)}`, "Unknown item field");
          }
        }

        if (typeof item.id !== "string" || !SLUG_REGEX.test(item.id) || item.id.length > 64) {
          addIssue("INVALID_FIELD", `${iPath}/id`, "item id must be a slug of at most 64 characters");
        } else if (seenItemIds.has(item.id)) {
          addIssue("DUPLICATE_ITEM", `${iPath}/id`, "duplicate item id");
        } else {
          seenItemIds.add(item.id);
        }

        if (typeof item.mechanism_id !== "string" || !SLUG_REGEX.test(item.mechanism_id) || item.mechanism_id.length > 64) {
          addIssue("INVALID_FIELD", `${iPath}/mechanism_id`, "item mechanism_id must be a slug of at most 64 characters");
        }

        if (typeof item.period !== "number" || !Number.isInteger(item.period) || item.period < 0 || item.period > periodsLimit) {
          addIssue("INVALID_FIELD", `${iPath}/period`, "item period must be within the declared horizon");
        }

        // Side and category validation
        if (item.side === "benefit") {
          if (!VALID_BENEFIT_CATEGORIES.has(item.category)) {
            addIssue("INVALID_FIELD", `${iPath}/category`, "invalid benefit category");
          }
          if (item.currency !== input.currency) {
            addIssue("INCOMPATIBLE_UNITS", `${iPath}/currency`, "benefit currency must match analysis currency");
          }
          if (item.category === "cash_saving") {
            if (item.basis !== "cash_saving") {
              addIssue("INVALID_FIELD", `${iPath}/basis`, "cash_saving benefit must use cash_saving basis");
            }
          } else {
            if (item.basis !== "gross_revenue" && item.basis !== "contribution_margin") {
              addIssue("INVALID_FIELD", `${iPath}/basis`, "benefit basis must be gross_revenue or contribution_margin");
            }
          }

          if (item.basis === "contribution_margin") {
            if (!Array.isArray(item.netted_cost_categories)) {
              addIssue("INVALID_FIELD", `${iPath}/netted_cost_categories`, "netted_cost_categories must be an array");
            } else {
              for (const nc of item.netted_cost_categories) {
                if (!VALID_COST_CATEGORIES.has(nc)) {
                  addIssue("INVALID_FIELD", `${iPath}/netted_cost_categories`, "invalid cost category in netted_cost_categories");
                }
                cmNettedCategories.add(nc);
              }
            }
          } else {
            if (!Array.isArray(item.netted_cost_categories) || item.netted_cost_categories.length > 0) {
              addIssue("INVALID_FIELD", `${iPath}/netted_cost_categories`, "netted_cost_categories must be an empty array when basis is not contribution_margin");
            }
          }

          // Duplicate benefit mechanism check in same period
          if (typeof item.period === "number" && typeof item.mechanism_id === "string") {
            if (!seenBenefitMechanisms.has(item.period)) {
              seenBenefitMechanisms.set(item.period, new Set());
            }
            const periodMechanisms = seenBenefitMechanisms.get(item.period);
            if (periodMechanisms.has(item.mechanism_id)) {
              addIssue("DOUBLE_COUNTED_BENEFIT", `${iPath}/mechanism_id`, "duplicate benefit mechanism in period");
            } else {
              periodMechanisms.add(item.mechanism_id);
            }
          }
        } else if (item.side === "cost") {
          if (!VALID_COST_CATEGORIES.has(item.category)) {
            addIssue("INVALID_FIELD", `${iPath}/category`, "invalid cost category");
          }
          if (item.currency !== input.currency) {
            addIssue("INCOMPATIBLE_UNITS", `${iPath}/currency`, "cost currency must match analysis currency");
          }
          if (item.basis !== "cash_cost") {
            addIssue("INVALID_FIELD", `${iPath}/basis`, "cost basis must be cash_cost");
          }
          if (!Array.isArray(item.netted_cost_categories) || item.netted_cost_categories.length > 0) {
            addIssue("INVALID_FIELD", `${iPath}/netted_cost_categories`, "cost item netted_cost_categories must be an empty array");
          }

          explicitCostCategories.add(item.category);

          // Duplicate cost mechanism/category check in same period
          if (typeof item.period === "number" && typeof item.category === "string" && typeof item.mechanism_id === "string") {
            if (!seenCostMechanisms.has(item.period)) {
              seenCostMechanisms.set(item.period, new Set());
            }
            const periodCostKey = `${item.category}:${item.mechanism_id}`;
            const periodCosts = seenCostMechanisms.get(item.period);
            if (periodCosts.has(periodCostKey)) {
              addIssue("DOUBLE_COUNTED_COST", `${iPath}/mechanism_id`, "duplicate cost mechanism and category in period");
            } else {
              periodCosts.add(periodCostKey);
            }
          }
        } else if (item.side === "capacity") {
          if (item.category !== "capacity") {
            addIssue("INVALID_FIELD", `${iPath}/category`, "capacity item category must be capacity");
          }
          if (item.currency !== null) {
            addIssue("INCOMPATIBLE_UNITS", `${iPath}/currency`, "capacity item currency must be null");
          }
          if (item.basis !== "capacity_hours") {
            addIssue("INVALID_FIELD", `${iPath}/basis`, "capacity item basis must be capacity_hours");
          }
          if (!Array.isArray(item.netted_cost_categories) || item.netted_cost_categories.length > 0) {
            addIssue("INVALID_FIELD", `${iPath}/netted_cost_categories`, "capacity item netted_cost_categories must be an empty array");
          }

          // Duplicate capacity tuple (side, category, mechanism_id, period)
          if (typeof item.period === "number" && typeof item.mechanism_id === "string") {
            if (!seenCapacityMechanisms.has(item.period)) {
              seenCapacityMechanisms.set(item.period, new Set());
            }
            const periodCaps = seenCapacityMechanisms.get(item.period);
            if (periodCaps.has(item.mechanism_id)) {
              addIssue("INVALID_FIELD", `${iPath}/mechanism_id`, "duplicate capacity mechanism in period");
            } else {
              periodCaps.add(item.mechanism_id);
            }
          }
        } else {
          addIssue("INVALID_FIELD", `${iPath}/side`, "item side must be benefit, cost, or capacity");
        }

        // Amount parsing and validation
        if (item.amount !== null) {
          if (typeof item.amount !== "string" || !MONETARY_DECIMAL_REGEX.test(item.amount)) {
            addIssue("INVALID_AMOUNT", `${iPath}/amount`, "amount must be a nonnegative decimal string without sign or exponent");
          } else {
            const parts = item.amount.split(".");
            const frac = parts[1] || "";
            if (item.side === "capacity") {
              if (frac.length > 4) {
                addIssue("INVALID_AMOUNT", `${iPath}/amount`, "capacity amount may have at most 4 fractional digits");
              }
            } else {
              const hasValidScale = typeof input.money_scale === "number"
                && Number.isInteger(input.money_scale)
                && input.money_scale >= 0
                && input.money_scale <= 4;
              if (hasValidScale) {
                const maxScale = input.money_scale;
                if (frac.length > maxScale) {
                  addIssue("INVALID_AMOUNT", `${iPath}/amount`, "monetary amount has too many fractional digits");
                } else {
                  try {
                    const intPart = BigInt(parts[0]);
                    const paddedFrac = frac.padEnd(maxScale, "0");
                    const minorUnits = intPart * (10n ** BigInt(maxScale)) + BigInt(paddedFrac || "0");
                    if (minorUnits > MAX_MAGNITUDE) {
                      addIssue("NUMERIC_RANGE", `${iPath}/amount`, "monetary amount magnitude exceeds maximum safe integer magnitude (9007199254740991)");
                    }
                  } catch {
                    addIssue("INVALID_AMOUNT", `${iPath}/amount`, "failed to parse monetary amount");
                  }
                }
              }
            }
          }
        }

        if (!nonblank(item.rationale)) {
          addIssue("INVALID_FIELD", `${iPath}/rationale`, "item rationale must be a nonempty string");
        }

        if (!Array.isArray(item.evidence_ids) || !item.evidence_ids.every((e) => typeof e === "string" && EVIDENCE_ID_REGEX.test(e)) || new Set(item.evidence_ids).size !== item.evidence_ids.length) {
          addIssue("INVALID_FIELD", `${iPath}/evidence_ids`, "item evidence_ids must contain unique CLM or SRC identifiers");
        }
      }

      // Check double counted cost across contribution margin and explicit cost categories
      for (const nc of cmNettedCategories) {
        if (explicitCostCategories.has(nc)) {
          addIssue("DOUBLE_COUNTED_COST", `${sPath}/items`, "cost category is netted in contribution margin and also claimed as an explicit cost");
        }
      }
    }

    if (!hasBaseScenario) {
      addIssue("INVALID_FIELD", "/scenarios", "scenarios must include the 'base' scenario");
    }
  }

  // If schema/validation issues exist, sort issues and return invalid envelope
  if (issues.length > 0) {
    return {
      schema_version: 1,
      tool: "investment-calculator",
      analysis_id: analysisId,
      currency: currency,
      money_scale: moneyScale,
      results: [],
      issues: finalizeIssues(issues)
    };
  }

  // Deterministic execution of scenarios: base, downside, upside order
  const scenarioOrder = ["base", "downside", "upside"];
  const scenarioMap = new Map();
  for (let idx = 0; idx < input.scenarios.length; idx++) {
    const sc = input.scenarios[idx];
    scenarioMap.set(sc.id, { scenario: sc, originalIndex: idx });
  }

  const results = [];
  const moneyScaleInt = input.money_scale;
  const horizonPeriods = input.horizon.periods;

  for (const scId of scenarioOrder) {
    if (!scenarioMap.has(scId)) continue;
    const { scenario, originalIndex: sIdx } = scenarioMap.get(scId);

    let hasUnknownBenefit = false;
    let hasBenefitItems = false;
    let sumBenefitMinor = 0n;

    let hasUnknownCost = false;
    let hasCostItems = false;
    let sumCostMinor = 0n;

    // Period net cash flows for payback and NPV
    const periodBenefit = new Array(horizonPeriods + 1).fill(0n);
    const periodCost = new Array(horizonPeriods + 1).fill(0n);

    // Capacity items collected
    const capacityItems = [];

    // Sort items by period ascending, then id ascending
    const sortedItems = [...scenario.items].sort((a, b) => {
      if (a.period !== b.period) return a.period - b.period;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    for (const item of sortedItems) {
      if (item.side === "benefit") {
        hasBenefitItems = true;
        if (item.amount === null) {
          hasUnknownBenefit = true;
        } else {
          const parts = item.amount.split(".");
          const intPart = BigInt(parts[0]);
          const fracPart = (parts[1] || "").padEnd(moneyScaleInt, "0");
          const minor = intPart * (10n ** BigInt(moneyScaleInt)) + BigInt(fracPart || "0");
          sumBenefitMinor += minor;
          if (sumBenefitMinor > MAX_MAGNITUDE) {
            addIssue("NUMERIC_RANGE", `/scenarios/${sIdx}/items`, "total benefit exceeds maximum safe magnitude");
          }
          periodBenefit[item.period] += minor;
        }
      } else if (item.side === "cost") {
        hasCostItems = true;
        if (item.amount === null) {
          hasUnknownCost = true;
        } else {
          const parts = item.amount.split(".");
          const intPart = BigInt(parts[0]);
          const fracPart = (parts[1] || "").padEnd(moneyScaleInt, "0");
          const minor = intPart * (10n ** BigInt(moneyScaleInt)) + BigInt(fracPart || "0");
          sumCostMinor += minor;
          if (sumCostMinor > MAX_MAGNITUDE) {
            addIssue("NUMERIC_RANGE", `/scenarios/${sIdx}/items`, "total cost exceeds maximum safe magnitude");
          }
          periodCost[item.period] += minor;
        }
      } else if (item.side === "capacity") {
        capacityItems.push({
          id: item.id,
          hours: item.amount,
          period: item.period
        });
      }
    }

    if (issues.length > 0) {
      return {
        schema_version: 1,
        tool: "investment-calculator",
        analysis_id: analysisId,
        currency: currency,
        money_scale: moneyScale,
        results: [],
        issues: finalizeIssues(issues)
      };
    }

    // Benefit status and value
    let benefitResult;
    if (!hasBenefitItems || hasUnknownBenefit) {
      benefitResult = {
        status: "unavailable",
        value: null,
        reason: "unknown_benefit"
      };
    } else {
      benefitResult = {
        status: "available",
        value: formatMoney(sumBenefitMinor, moneyScaleInt),
        reason: null
      };
    }

    // Cost status and value
    let costResult;
    if (!hasCostItems || hasUnknownCost) {
      costResult = {
        status: "unavailable",
        value: null,
        reason: "unknown_cost"
      };
    } else {
      costResult = {
        status: "available",
        value: formatMoney(sumCostMinor, moneyScaleInt),
        reason: null
      };
    }

    // Net value status and value
    let netValueResult;
    if (benefitResult.status === "unavailable" || costResult.status === "unavailable") {
      netValueResult = {
        status: "unavailable",
        value: null,
        reason: "unknown_cash_flow"
      };
    } else {
      const netMinor = sumBenefitMinor - sumCostMinor;
      netValueResult = {
        status: "available",
        value: formatMoney(netMinor, moneyScaleInt),
        reason: null
      };
    }

    // Ratios precedence: unknown_cost -> zero_cost -> unknown_benefit
    let roiResult;
    let roiPercentResult;
    let benefitCostResult;

    if (costResult.status === "unavailable") {
      roiResult = { status: "unavailable", value: null, reason: "unknown_cost" };
      roiPercentResult = { status: "unavailable", value: null, reason: "unknown_cost" };
      benefitCostResult = { status: "unavailable", value: null, reason: "unknown_cost" };
    } else if (sumCostMinor === 0n) {
      roiResult = { status: "undefined", value: null, reason: "zero_cost" };
      roiPercentResult = { status: "undefined", value: null, reason: "zero_cost" };
      benefitCostResult = { status: "undefined", value: null, reason: "zero_cost" };
    } else if (benefitResult.status === "unavailable") {
      roiResult = { status: "unavailable", value: null, reason: "unknown_benefit" };
      roiPercentResult = { status: "unavailable", value: null, reason: "unknown_benefit" };
      benefitCostResult = { status: "unavailable", value: null, reason: "unknown_benefit" };
    } else {
      const netMinor = sumBenefitMinor - sumCostMinor;
      roiResult = {
        status: "available",
        value: formatRational(netMinor, sumCostMinor, 6),
        reason: null
      };
      roiPercentResult = {
        status: "available",
        value: formatRational(netMinor * 100n, sumCostMinor, 6),
        reason: null
      };
      benefitCostResult = {
        status: "available",
        value: formatRational(sumBenefitMinor, sumCostMinor, 6),
        reason: null
      };
    }

    // Payback
    let paybackResult;
    if (benefitResult.status === "unavailable" || costResult.status === "unavailable") {
      paybackResult = {
        status: "unavailable",
        period: null,
        reason: "unknown_cash_flow",
        terminal_balance: null
      };
    } else {
      const periodNet = new Array(horizonPeriods + 1);
      const cum = new Array(horizonPeriods + 1);
      let runningCum = 0n;

      for (let t = 0; t <= horizonPeriods; t++) {
        periodNet[t] = periodBenefit[t] - periodCost[t];
        runningCum += periodNet[t];
        cum[t] = runningCum;
      }

      const terminalBalance = formatMoney(cum[horizonPeriods], moneyScaleInt);
      const hasNegative = cum.some((c) => c < 0n);

      if (!hasNegative) {
        paybackResult = {
          status: "not_applicable",
          period: null,
          reason: "no_investment_outflow",
          terminal_balance: terminalBalance
        };
      } else {
        const firstNegIdx = cum.findIndex((c) => c < 0n);
        let durablePeriod = null;

        for (let t = firstNegIdx + 1; t <= horizonPeriods; t++) {
          if (cum[t] >= 0n) {
            let staysNonNeg = true;
            for (let k = t; k <= horizonPeriods; k++) {
              if (cum[k] < 0n) {
                staysNonNeg = false;
                break;
              }
            }
            if (staysNonNeg) {
              durablePeriod = t;
              break;
            }
          }
        }

        if (durablePeriod !== null) {
          paybackResult = {
            status: "reached",
            period: durablePeriod,
            reason: null,
            terminal_balance: terminalBalance
          };
        } else {
          paybackResult = {
            status: "not_reached",
            period: null,
            reason: "no_payback_within_horizon",
            terminal_balance: terminalBalance
          };
        }
      }
    }

    // NPV precedence: missing_discount -> unknown_cash_flow
    let npvResult;
    if (input.discount === null) {
      npvResult = {
        status: "unavailable",
        value: null,
        reason: "missing_discount"
      };
    } else if (benefitResult.status === "unavailable" || costResult.status === "unavailable") {
      npvResult = {
        status: "unavailable",
        value: null,
        reason: "unknown_cash_flow"
      };
    } else {
      // Check B+C domain bound <= 1e12
      if (sumBenefitMinor + sumCostMinor > MAX_NPV_TOTAL_DOMAIN) {
        addIssue("NUMERIC_RANGE", `/scenarios/${sIdx}`, `B+C in minor units exceeds bounded NPV domain (${MAX_NPV_TOTAL_DOMAIN})`);
      } else {
        if (input.horizon.period === "year") {
          const { N, D } = parseDiscountRatio(input.discount.rate);
          const nPowers = new Array(horizonPeriods + 1);
          nPowers[0] = 1n;
          for (let i = 1; i <= horizonPeriods; i++) {
            nPowers[i] = nPowers[i - 1] * N;
          }

          let P = 0n;
          let dPower = 1n;
          for (let t = 0; t <= horizonPeriods; t++) {
            const netTMinor = periodBenefit[t] - periodCost[t];
            if (netTMinor !== 0n) {
              P += netTMinor * dPower * nPowers[horizonPeriods - t];
            }
            if (t < horizonPeriods) {
              dPower *= D;
            }
          }
          const Q = nPowers[horizonPeriods];
          const npvMinorBigInt = roundHalfAwayRational(P, Q);
          npvResult = {
            status: "available",
            value: formatMoney(npvMinorBigInt, moneyScaleInt),
            reason: null
          };
        } else {
          const annualRate = Number(input.discount.rate);
          let sum = 0.0;
          let c = 0.0;

          for (let t = 0; t <= horizonPeriods; t++) {
            const factor = Math.pow(1.0 + annualRate, -t / 12);
            const netTMinor = periodBenefit[t] - periodCost[t];
            const valT = Number(netTMinor) * factor;

            const tSum = sum + valT;
            if (Math.abs(sum) >= Math.abs(valT)) {
              c += (sum - tSum) + valT;
            } else {
              c += (valT - tSum) + sum;
            }
            sum = tSum;
          }

          const npvMinorFloat = sum + c;
          if (!Number.isFinite(npvMinorFloat)) {
            addIssue("NUMERIC_RANGE", `/scenarios/${sIdx}`, "computed NPV is not finite");
          } else {
            let npvMinorBigInt;
            if (npvMinorFloat >= 0) {
              npvMinorBigInt = BigInt(Math.floor(npvMinorFloat + 0.5));
            } else {
              npvMinorBigInt = -BigInt(Math.floor(-npvMinorFloat + 0.5));
            }
            npvResult = {
              status: "available",
              value: formatMoney(npvMinorBigInt, moneyScaleInt),
              reason: null
            };
          }
        }
      }
    }

    if (issues.length > 0) {
      return {
        schema_version: 1,
        tool: "investment-calculator",
        analysis_id: analysisId,
        currency: currency,
        money_scale: moneyScale,
        results: [],
        issues: finalizeIssues(issues)
      };
    }

    results.push({
      scenario_id: scId,
      benefit: benefitResult,
      cost: costResult,
      net_value: netValueResult,
      roi: roiResult,
      roi_percent: roiPercentResult,
      benefit_cost: benefitCostResult,
      payback: paybackResult,
      npv: npvResult,
      capacity: capacityItems,
      nonmonetary: scenario.nonmonetary || []
    });
  }

  return {
    schema_version: 1,
    tool: "investment-calculator",
    analysis_id: analysisId,
    currency: currency,
    money_scale: moneyScale,
    results,
    issues: []
  };
}

const MAX_INPUT_BYTES = 1048576;
const INPUT_TOO_LARGE = Symbol("input-too-large");

function sameFileIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function inspectInputPath(filePath) {
  const absolutePath = path.resolve(filePath);
  const root = path.parse(absolutePath).root;
  const segments = absolutePath.slice(root.length).split(path.sep).filter(Boolean);
  const stats = [];
  let current = root;

  for (let index = 0; index < segments.length; index++) {
    current = path.join(current, segments[index]);
    const stat = fs.lstatSync(current, { bigint: true });
    const final = index === segments.length - 1;
    if (stat.isSymbolicLink() || (final ? !stat.isFile() : !stat.isDirectory())) {
      throw new Error("unsafe_input_path");
    }
    stats.push(stat);
  }
  return { absolutePath, stats };
}

function readInputFileSafely(filePath) {
  let fd;
  let result = null;
  try {
    const noFollow = fs.constants.O_NOFOLLOW;
    const nonBlocking = fs.constants.O_NONBLOCK;
    if (typeof noFollow !== "number" || typeof nonBlocking !== "number") {
      throw new Error("safe_open_unavailable");
    }

    const before = inspectInputPath(filePath);
    const leafBefore = before.stats.at(-1);
    if (leafBefore.size > BigInt(MAX_INPUT_BYTES)) throw INPUT_TOO_LARGE;

    fd = fs.openSync(
      before.absolutePath,
      fs.constants.O_RDONLY | noFollow | nonBlocking,
    );
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!opened.isFile()) throw new Error("not_regular");
    if (opened.size > BigInt(MAX_INPUT_BYTES)) throw INPUT_TOO_LARGE;
    if (!sameFileIdentity(leafBefore, opened)) throw new Error("input_changed");

    const expectedSize = Number(opened.size);
    const buffer = Buffer.alloc(expectedSize + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = fs.readSync(fd, buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (count === 0) break;
      bytesRead += count;
    }
    if (bytesRead > MAX_INPUT_BYTES) throw INPUT_TOO_LARGE;

    const afterDescriptor = fs.fstatSync(fd, { bigint: true });
    const afterPath = inspectInputPath(filePath);
    const sameComponents = before.stats.length === afterPath.stats.length
      && before.stats.every((stat, index) => sameFileIdentity(stat, afterPath.stats[index]));
    if (
      bytesRead !== expectedSize
      || !sameFileIdentity(opened, afterDescriptor)
      || !sameComponents
      || !sameFileIdentity(opened, afterPath.stats.at(-1))
    ) {
      throw new Error("input_changed");
    }
    result = { ok: true, content: buffer.subarray(0, bytesRead).toString("utf8") };
  } catch (error) {
    result = error === INPUT_TOO_LARGE ? { limitExceeded: true } : null;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        result = null;
      }
    }
  }
  return result;
}

function writeOutput(content, exitCode) {
  process.exitCode = exitCode;
  process.stdout.write(content);
}

function writeInputFailure(code, message) {
  const envelope = {
    schema_version: 1,
    tool: "investment-calculator",
    analysis_id: null,
    currency: null,
    money_scale: null,
    results: [],
    issues: [{ code, severity: "error", path: "", record_id: null, message }]
  };
  writeOutput(JSON.stringify(envelope, null, 2) + "\n", 2);
}

/**
 * Direct CLI invocation runner.
 */
function runCli() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < 20) {
    process.stderr.write("Node.js version 20 or higher is required.\n");
    process.exitCode = 2;
    return;
  }

  const args = process.argv.slice(2);

  // Exact --help alone is supported; -h and other flags are rejected per frozen contract
  if (args.length === 1 && args[0] === "--help") {
    writeOutput("Usage: node evaluate-investment.mjs <scenario.json>\n\nSynchronous deterministic product investment evaluator.\n", 0);
    return;
  }

  if (args.length !== 1 || args[0].startsWith("-")) {
    const errorEnvelope = {
      schema_version: 1,
      tool: "investment-calculator",
      analysis_id: null,
      currency: null,
      money_scale: null,
      results: [],
      issues: [
        {
          code: "INVALID_ARGUMENT",
          severity: "error",
          path: "",
          record_id: null,
          message: "Exactly one positional JSON file argument is required; unsupported flags rejected."
        }
      ]
    };
    writeOutput(JSON.stringify(errorEnvelope, null, 2) + "\n", 2);
    return;
  }

  const readResult = readInputFileSafely(args[0]);
  if (readResult === null) {
    writeInputFailure("IO_ERROR", "Unable to read input file.");
    return;
  }
  if (readResult.limitExceeded) {
    writeInputFailure("LIMIT_EXCEEDED", "Input file exceeds maximum size limit of 1 MiB.");
    return;
  }
  const rawContent = readResult.content;

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const envelope = {
      schema_version: 1,
      tool: "investment-calculator",
      analysis_id: null,
      currency: null,
      money_scale: null,
      results: [],
      issues: [
        {
          code: "INVALID_JSON",
          severity: "error",
          path: "",
          record_id: null,
          message: "Input file contains invalid JSON."
        }
      ]
    };
    writeOutput(JSON.stringify(envelope, null, 2) + "\n", 2);
    return;
  }

  let output;
  try {
    output = evaluateInvestment(parsed);
  } catch {
    const envelope = {
      schema_version: 1,
      tool: "investment-calculator",
      analysis_id: null,
      currency: null,
      money_scale: null,
      results: [],
      issues: [
        {
          code: "INTERNAL_ERROR",
          severity: "error",
          path: "",
          record_id: null,
          message: "An internal error occurred."
        }
      ]
    };
    writeOutput(JSON.stringify(envelope, null, 2) + "\n", 4);
    return;
  }

  let exitCode = 0;
  if (output.issues.length > 0) {
    const exit2Codes = new Set([
      "INVALID_ARGUMENT",
      "INVALID_JSON",
      "UNSUPPORTED_VERSION",
      "IO_ERROR",
      "LIMIT_EXCEEDED"
    ]);
    const hasExit2 = output.issues.some((iss) => exit2Codes.has(iss.code));
    exitCode = hasExit2 ? 2 : 1;
  }
  writeOutput(JSON.stringify(output, null, 2) + "\n", exitCode);
}

// Check if run directly
try {
  if (process.argv[1]) {
    const entryUrl = pathToFileURL(fs.realpathSync(process.argv[1])).href;
    if (import.meta.url === entryUrl) {
      runCli();
    }
  }
} catch {
  // Ignore in environments where pathToFileURL fails
}
