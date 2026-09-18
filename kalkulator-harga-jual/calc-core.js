(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PriceCalculatorCore = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function parseNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const normalized = String(value ?? "")
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function clampPercent(value) {
    return Math.min(99.99, Math.max(0, parseNumber(value)));
  }

  function roundUp(value, increment = 1000) {
    return Math.ceil(Math.max(0, value) / increment) * increment;
  }

  function calculateAtPrice(data, listPrice) {
    const transactionPrice = Math.max(0, listPrice * (1 - data.discountRate / 100));
    const percentageBreakdown = data.percentageFees.map((fee) => ({ ...fee, amount: transactionPrice * fee.rate / 100 }));
    const percentageTotal = percentageBreakdown.reduce((sum, fee) => sum + fee.amount, 0);
    const fixedTotal = data.fixedFees.reduce((sum, fee) => sum + fee.amount, 0);
    const netPayout = transactionPrice - data.voucher - percentageTotal - fixedTotal;
    const profit = netPayout - data.cost;
    const margin = transactionPrice > 0 ? profit / transactionPrice * 100 : 0;
    const totalFees = data.voucher + percentageTotal + fixedTotal;
    return { listPrice, transactionPrice, percentageBreakdown, percentageTotal, fixedTotal, netPayout, profit, margin, totalFees };
  }

  function calculateIdeal(data) {
    const rate = data.percentageFees.reduce((sum, fee) => sum + fee.rate, 0) / 100;
    const fixed = data.fixedFees.reduce((sum, fee) => sum + fee.amount, 0);
    let targetProfit = data.profitTarget;
    let denominator = 1 - rate;

    if (data.profitMode === "markup") targetProfit = data.cost * data.profitTarget / 100;
    if (data.profitMode === "margin") {
      targetProfit = 0;
      denominator -= data.profitTarget / 100;
    }

    if (denominator <= 0.005) {
      return { error: "Total biaya persentase dan target margin terlalu tinggi. Turunkan nilainya agar total di bawah 100%." };
    }

    const requiredTransaction = data.profitMode === "margin"
      ? (data.cost + fixed + data.voucher) / denominator
      : (data.cost + fixed + data.voucher + targetProfit) / denominator;
    const discountFactor = 1 - data.discountRate / 100;
    if (discountFactor <= 0.005) return { error: "Diskon toko harus di bawah 100%." };

    const rawListPrice = requiredTransaction / discountFactor;
    const listPrice = roundUp(rawListPrice, 1000);
    const result = calculateAtPrice(data, listPrice);
    const requestedProfit = data.profitMode === "margin" ? result.transactionPrice * data.profitTarget / 100 : targetProfit;
    const adFee = data.fixedFees.find((fee) => fee.key === "ad")?.amount || 0;
    const contributionBeforeAds = result.profit + adFee;
    const breakEvenRoas = contributionBeforeAds > 0 ? result.transactionPrice / contributionBeforeAds : 0;
    const targetAdAllowance = Math.max(0, contributionBeforeAds - requestedProfit);
    const targetRoas = targetAdAllowance > 0 ? result.transactionPrice / targetAdAllowance : 0;

    return {
      ...result,
      rawListPrice,
      listPrice,
      requestedProfit,
      breakEvenRoas,
      targetRoas,
      rate,
      fixed,
    };
  }

  return { parseNumber, clampPercent, roundUp, calculateAtPrice, calculateIdeal };
});
