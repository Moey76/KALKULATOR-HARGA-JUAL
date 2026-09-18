"use strict";

const assert = require("node:assert/strict");
const { parseNumber, calculateIdeal, calculateAtPrice } = require("./calc-core.js");

const base = {
  cost: 100000,
  profitMode: "nominal",
  profitTarget: 50000,
  discountRate: 0,
  voucher: 0,
  percentageFees: [{ key: "admin", name: "Admin", rate: 8 }],
  fixedFees: [{ key: "process", name: "Proses", amount: 1250 }, { key: "ad", name: "Iklan", amount: 0 }],
};

assert.equal(parseNumber("100.000"), 100000);
assert.equal(parseNumber("12,5"), 12.5);

const nominal = calculateIdeal(base);
assert.equal(nominal.error, undefined);
assert.equal(nominal.listPrice, 165000);
assert.ok(nominal.profit >= 50000, "harga rekomendasi harus memenuhi target laba");

const withDiscount = calculateIdeal({ ...base, discountRate: 20 });
assert.ok(withDiscount.listPrice > nominal.listPrice, "diskon harus menaikkan harga awal");
assert.ok(withDiscount.profit >= 50000, "target laba tetap tercapai setelah diskon");

const markup = calculateIdeal({ ...base, profitMode: "markup", profitTarget: 30 });
assert.ok(markup.profit >= 30000, "markup 30% dari modal harus tercapai");

const margin = calculateIdeal({ ...base, profitMode: "margin", profitTarget: 20 });
assert.ok(margin.margin >= 20, "margin transaksi 20% harus tercapai");

const impossible = calculateIdeal({
  ...base,
  profitMode: "margin",
  profitTarget: 60,
  percentageFees: [{ key: "admin", name: "Admin", rate: 45 }],
});
assert.ok(impossible.error, "kombinasi persentase >= 100% harus ditolak");

const simulated = calculateAtPrice(base, 200000);
assert.equal(Math.round(simulated.profit), 82750);

console.log("Semua pengujian rumus berhasil.");
