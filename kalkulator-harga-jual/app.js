"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const { parseNumber, clampPercent, roundUp, calculateAtPrice, calculateIdeal } = window.PriceCalculatorCore;
let currentStep = 1;
let customFeeCounter = 0;
let lastResult = null;
let toastTimer = null;

const presets = {
  shopee: { adminRate: 8, processFee: 1250 },
  tiktok: { adminRate: 8, processFee: 0 },
  custom: { adminRate: 0, processFee: 0 },
};

function formatCurrencyInput(input) {
  const value = Math.max(0, Math.round(parseNumber(input.value)));
  input.value = new Intl.NumberFormat("id-ID").format(value);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2300);
}

function showStep(step, scroll = true) {
  currentStep = step;
  $$(".step-panel").forEach((panel) => panel.classList.toggle("active", Number(panel.dataset.step) === step));
  $$(".step-tab").forEach((tab) => {
    const target = Number(tab.dataset.stepTarget);
    tab.classList.toggle("active", target === step);
    tab.classList.toggle("completed", target < step);
  });
  if (scroll) $(".calculator-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function validateStep(step) {
  if (step === 1) {
    const name = $("#productName");
    const cost = $("#cost");
    const nameOk = name.value.trim().length > 0;
    const costOk = parseNumber(cost.value) > 0;
    name.closest(".field").classList.toggle("invalid", !nameOk);
    cost.closest(".field").classList.toggle("invalid", !costOk);
    return nameOk && costOk;
  }
  if (step === 2) {
    const target = $("#profitTarget");
    const ok = parseNumber(target.value) > 0;
    target.closest(".field").classList.toggle("invalid", !ok);
    return ok;
  }
  return true;
}

function updateProfitMode() {
  const mode = $('input[name="profitMode"]:checked').value;
  $$(".choice-card").forEach((card) => card.classList.toggle("active", $("input", card).checked));
  const prefix = $("#profitPrefix");
  const symbol = $("span", prefix);
  const input = $("#profitTarget");
  const label = $("#profitTargetLabel");
  const hint = $("#profitHint");

  if (mode === "nominal") {
    symbol.textContent = "Rp";
    prefix.className = "money-input";
    input.classList.add("currency");
    label.textContent = "Target untung per produk";
    hint.textContent = "Target laba bersih dalam rupiah setelah seluruh biaya.";
    formatCurrencyInput(input);
  } else {
    symbol.textContent = "%";
    prefix.className = "suffix-input";
    input.classList.remove("currency");
    input.value = Math.min(95, parseNumber(input.value) || 30);
    label.textContent = mode === "markup" ? "Target untung dari modal" : "Target margin transaksi";
    hint.textContent = mode === "markup"
      ? "Contoh: target 30% dari modal Rp100.000 berarti laba bersih Rp30.000."
      : "Contoh: target 20% berarti laba bersih sebesar 20% dari harga setelah diskon.";
  }
}

function applyPlatformPreset(showMessage = true) {
  const platform = $("#platform").value;
  const preset = presets[platform];
  $("#adminRate").value = preset.adminRate;
  $("#processFee").value = new Intl.NumberFormat("id-ID").format(preset.processFee);
  if (showMessage) showToast("Preset awal diterapkan. Silakan cocokkan dengan Seller Centre.");
}

function updatePreorder() {
  if ($("#preorder").value === "yes" && parseNumber($("#preorderRate").value) === 0) {
    $("#preorderRate").value = "3";
  }
  if ($("#preorder").value === "no") $("#preorderRate").value = "0";
}

function addCustomFee(data = { name: "Biaya lainnya", type: "fixed", value: 0 }) {
  customFeeCounter += 1;
  const row = document.createElement("div");
  row.className = "custom-fee-row";
  row.dataset.id = String(customFeeCounter);
  row.innerHTML = `
    <label class="field"><span>Nama biaya</span><input class="custom-name" type="text" value="${escapeHtml(data.name)}" /></label>
    <label class="field"><span>Jenis</span><select class="custom-type"><option value="fixed">Rupiah</option><option value="percent">Persen</option></select></label>
    <label class="field custom-value-field"><span>Nilai</span><div class="money-input"><span>Rp</span><input class="custom-value currency" inputmode="numeric" value="${Math.round(data.value)}" /></div></label>
    <button class="remove-fee" type="button" aria-label="Hapus biaya">×</button>`;
  $(".custom-type", row).value = data.type;
  $("#customFeeList").appendChild(row);
  $("#customFeeEmpty").hidden = true;
  updateCustomFeeType(row);
  $(".custom-type", row).addEventListener("change", () => updateCustomFeeType(row));
  $(".custom-value", row).addEventListener("blur", (event) => {
    if ($(".custom-type", row).value === "fixed") formatCurrencyInput(event.target);
  });
  $(".remove-fee", row).addEventListener("click", () => {
    row.remove();
    $("#customFeeEmpty").hidden = $$(".custom-fee-row").length > 0;
  });
}

function updateCustomFeeType(row) {
  const type = $(".custom-type", row).value;
  const wrapper = $(".custom-value-field > div", row);
  const symbol = $("span", wrapper);
  const input = $(".custom-value", row);
  wrapper.className = type === "fixed" ? "money-input" : "suffix-input";
  symbol.textContent = type === "fixed" ? "Rp" : "%";
  input.classList.toggle("currency", type === "fixed");
  if (type === "fixed") formatCurrencyInput(input);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

function getFormData() {
  const customFees = $$(".custom-fee-row").map((row) => ({
    name: $(".custom-name", row).value.trim() || "Biaya lainnya",
    type: $(".custom-type", row).value,
    value: Math.max(0, parseNumber($(".custom-value", row).value)),
  }));

  const percentageFees = [
    { key: "admin", name: "Admin & layanan", rate: clampPercent($("#adminRate").value) },
    { key: "promo", name: "Promo / Gratis Ongkir XTRA", rate: clampPercent($("#promoRate").value) },
    { key: "live", name: "Live XTRA", rate: clampPercent($("#liveRate").value) },
    { key: "preorder", name: "Biaya pre-order", rate: clampPercent($("#preorderRate").value) },
    { key: "insurance", name: "Premi asuransi", rate: clampPercent($("#insuranceRate").value) },
    { key: "affiliate", name: "Komisi affiliate", rate: clampPercent($("#affiliateRate").value) },
    { key: "coin", name: "Cashback koin", rate: clampPercent($("#coinRate").value) },
    ...customFees.filter((item) => item.type === "percent").map((item, index) => ({ key: `custom-p-${index}`, name: item.name, rate: clampPercent(item.value) })),
  ];

  const fixedFees = [
    { key: "process", name: "Proses pesanan", amount: Math.max(0, parseNumber($("#processFee").value)) },
    { key: "ad", name: "Iklan per produk", amount: Math.max(0, parseNumber($("#adCost").value)) },
    { key: "packing", name: "Packing", amount: Math.max(0, parseNumber($("#packingCost").value)) },
    { key: "operational", name: "Operasional", amount: Math.max(0, parseNumber($("#operationalCost").value)) },
    ...customFees.filter((item) => item.type === "fixed").map((item, index) => ({ key: `custom-f-${index}`, name: item.name, amount: item.value })),
  ];

  return {
    productName: $("#productName").value.trim(),
    platform: $("#platform").value,
    sellerStatus: $("#sellerStatus").value,
    preorder: $("#preorder").value,
    cost: Math.max(0, parseNumber($("#cost").value)),
    profitMode: $('input[name="profitMode"]:checked').value,
    profitTarget: Math.max(0, parseNumber($("#profitTarget").value)),
    discountRate: clampPercent($("#storeDiscount").value),
    voucher: Math.max(0, parseNumber($("#voucher").value)),
    percentageFees,
    fixedFees,
    customFees,
  };
}

function calculateAndShow() {
  if (!validateStep(1) || !validateStep(2)) {
    showStep(!validateStep(1) ? 1 : 2);
    showToast("Lengkapi data wajib terlebih dahulu.");
    return;
  }
  const data = getFormData();
  const result = calculateIdeal(data);
  if (result.error) {
    showToast(result.error);
    return;
  }
  lastResult = { data, result, createdAt: new Date().toISOString() };
  renderResult(lastResult);
  showStep(4);
}

function renderResult(payload) {
  const { data, result } = payload;
  $("#resultProductName").textContent = data.productName;
  $("#idealPrice").textContent = rupiah.format(result.listPrice);
  $("#roundingNote").textContent = `Nilai hitung ${rupiah.format(result.rawListPrice)}, dibulatkan ke atas ke kelipatan Rp1.000.`;
  $("#netPayout").textContent = rupiah.format(result.netPayout);
  $("#netProfit").textContent = rupiah.format(result.profit);
  $("#netMargin").textContent = `${numberFormat.format(result.margin)}%`;
  $("#totalFees").textContent = rupiah.format(result.totalFees);
  $("#breakEvenRoas").textContent = result.breakEvenRoas > 0 ? `${numberFormat.format(result.breakEvenRoas)}x` : "—";
  $("#targetRoas").textContent = result.targetRoas > 0 ? `${numberFormat.format(result.targetRoas)}x` : "—";
  $("#simulationPrice").value = new Intl.NumberFormat("id-ID").format(result.listPrice);

  const health = $("#resultHealth");
  health.className = "result-health";
  let healthText = "Aman";
  let healthIcon = "✓";
  if (result.margin < 10) { health.classList.add("danger"); healthText = "Tipis"; healthIcon = "!"; }
  else if (result.margin < 20) { health.classList.add("warning"); healthText = "Cukup"; healthIcon = "!"; }
  else health.classList.add("good");
  $("span", health).textContent = healthIcon;
  $("strong", health).textContent = healthText;

  const breakdown = [
    ["Harga jual", result.listPrice],
    [`Diskon toko (${numberFormat.format(data.discountRate)}%)`, result.listPrice - result.transactionPrice],
    ["Harga transaksi", result.transactionPrice],
    ["Voucher toko", data.voucher],
    ...result.percentageBreakdown.filter((fee) => fee.rate > 0).map((fee) => [`${fee.name} (${numberFormat.format(fee.rate)}%)`, fee.amount]),
    ...data.fixedFees.filter((fee) => fee.amount > 0).map((fee) => [fee.name, fee.amount]),
    ["Modal / HPP", data.cost],
  ];
  $("#breakdown").innerHTML = breakdown.map(([name, amount]) => `<div class="breakdown-row"><span>${escapeHtml(name)}</span><strong>${rupiah.format(amount)}</strong></div>`).join("")
    + `<div class="breakdown-row total"><span>Untung bersih</span><strong>${rupiah.format(result.profit)}</strong></div>`;

  renderStrikePrices();
  renderInsights(data, result);
  updateSimulation();
}

function renderStrikePrices() {
  if (!lastResult) return;
  const custom = clampPercent($("#strikeCustomRate").value);
  const rates = [custom, 20, 40, 50];
  $("#strikeGrid").innerHTML = rates.map((rate, index) => {
    const price = rate >= 100 ? 0 : roundUp(lastResult.result.listPrice / (1 - rate / 100), 1000);
    return `<div class="strike-item"><small>${index === 0 ? "Custom" : "Jika diskon"} ${numberFormat.format(rate)}%</small><strong>${rupiah.format(price)}</strong></div>`;
  }).join("");
}

function renderInsights(data, result) {
  const insights = [];
  const totalRate = result.rate * 100;
  if (result.margin < 10) insights.push("Margin bersih masih tipis. Pertimbangkan menekan promo, affiliate, atau biaya operasional sebelum menurunkan harga.");
  else if (result.margin < 20) insights.push("Margin sudah positif, tetapi ruang untuk retur atau biaya tak terduga masih terbatas.");
  else insights.push("Margin bersih berada di zona yang relatif sehat berdasarkan input saat ini.");

  if (totalRate >= 20) insights.push(`Total biaya berbasis persentase mencapai ${numberFormat.format(totalRate)}%. Cek kembali program yang paling efektif agar margin tidak bocor.`);
  if (data.discountRate > 0) insights.push(`Diskon toko ${numberFormat.format(data.discountRate)}% sudah dimasukkan. Pasang harga minimal ${rupiah.format(result.listPrice)} agar target tetap tercapai.`);
  if ((data.fixedFees.find((fee) => fee.key === "ad")?.amount || 0) === 0) insights.push("Biaya iklan masih Rp0. Tambahkan estimasi iklan per pesanan jika produk akan diiklankan.");
  else insights.push(`Untuk iklan, usahakan ROAS tidak turun di bawah ${numberFormat.format(result.breakEvenRoas)}x agar produk tidak merugi.`);
  insights.push("Simpan bukti perhitungan dan perbarui persentase saat marketplace mengubah kebijakan biaya.");
  $("#insightList").innerHTML = insights.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function updateSimulation() {
  if (!lastResult) return;
  const price = parseNumber($("#simulationPrice").value);
  const result = calculateAtPrice(lastResult.data, price);
  const output = $("#simulationProfit");
  output.textContent = rupiah.format(result.profit);
  output.style.color = result.profit >= 0 ? "var(--green)" : "var(--red)";
}

function saveHistory() {
  if (!lastResult) return;
  const history = getHistory();
  history.unshift({
    id: Date.now(),
    productName: lastResult.data.productName,
    listPrice: lastResult.result.listPrice,
    profit: lastResult.result.profit,
    margin: lastResult.result.margin,
    createdAt: lastResult.createdAt,
  });
  localStorage.setItem("hargaJualHistory", JSON.stringify(history.slice(0, 12)));
  renderHistory();
  showToast("Hasil disimpan di perangkat ini.");
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem("hargaJualHistory") || "[]"); }
  catch { return []; }
}

function renderHistory() {
  const history = getHistory();
  $("#historyEmpty").hidden = history.length > 0;
  $("#clearHistory").hidden = history.length === 0;
  $("#historyList").innerHTML = history.map((item) => `
    <article class="history-item">
      <h3>${escapeHtml(item.productName)}</h3>
      <strong>${rupiah.format(item.listPrice)}</strong>
      <p>Untung ${rupiah.format(item.profit)} • Margin ${numberFormat.format(item.margin)}%</p>
      <p>${new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
    </article>`).join("");
}

function exportCsv() {
  if (!lastResult) return;
  const { data, result } = lastResult;
  const rows = [
    ["Kalkulator Harga Jual"],
    ["Produk", data.productName],
    ["Platform", data.platform],
    ["Modal", data.cost],
    ["Harga Jual Rekomendasi", result.listPrice],
    ["Harga Setelah Diskon", result.transactionPrice],
    ["Dana Masuk", result.netPayout],
    ["Untung Bersih", result.profit],
    ["Margin Bersih (%)", result.margin],
    ["Total Biaya", result.totalFees],
    ["BEP ROAS", result.breakEvenRoas],
    ["Target ROAS", result.targetRoas],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kalkulasi-${data.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast("CSV berhasil dibuat.");
}

function resetForm() {
  $("#calculatorForm").reset();
  $$(".custom-fee-row").forEach((row) => row.remove());
  $("#customFeeEmpty").hidden = false;
  customFeeCounter = 0;
  lastResult = null;
  applyPlatformPreset(false);
  updateProfitMode();
  showStep(1);
}

function bindEvents() {
  $$(".currency").forEach((input) => input.addEventListener("blur", () => formatCurrencyInput(input)));
  $$(".decimal").forEach((input) => input.addEventListener("blur", () => { input.value = numberFormat.format(clampPercent(input.value)); }));

  $$(".next-button").forEach((button) => button.addEventListener("click", () => {
    if (!validateStep(currentStep)) { showToast("Lengkapi data wajib terlebih dahulu."); return; }
    showStep(Number(button.dataset.next));
  }));
  $$(".prev-button").forEach((button) => button.addEventListener("click", () => showStep(Number(button.dataset.prev))));
  $$(".step-tab").forEach((tab) => tab.addEventListener("click", () => {
    const target = Number(tab.dataset.stepTarget);
    if (target === 4 && !lastResult) { showToast("Hitung data terlebih dahulu untuk membuka hasil."); return; }
    if (target > currentStep && currentStep < 3 && !validateStep(currentStep)) { showToast("Lengkapi langkah ini terlebih dahulu."); return; }
    showStep(target);
  }));

  $$('input[name="profitMode"]').forEach((input) => input.addEventListener("change", updateProfitMode));
  $("#platform").addEventListener("change", () => applyPlatformPreset(true));
  $("#preorder").addEventListener("change", updatePreorder);
  $("#addCustomFee").addEventListener("click", () => addCustomFee());
  $("#calculateButton").addEventListener("click", calculateAndShow);
  $("#editCalculation").addEventListener("click", () => showStep(3));
  $("#simulationPrice").addEventListener("input", updateSimulation);
  $("#simulationPrice").addEventListener("blur", (event) => formatCurrencyInput(event.target));
  $("#strikeCustomRate").addEventListener("input", renderStrikePrices);
  $("#toggleBreakdown").addEventListener("click", () => {
    const hidden = $("#breakdown").classList.toggle("hidden");
    $("#toggleBreakdown").textContent = hidden ? "Tampilkan" : "Sembunyikan";
  });
  $("#saveHistory").addEventListener("click", saveHistory);
  $("#exportCsv").addEventListener("click", exportCsv);
  $("#newCalculation").addEventListener("click", resetForm);
  $("#resetTop").addEventListener("click", resetForm);
  $("#clearHistory").addEventListener("click", () => {
    localStorage.removeItem("hargaJualHistory");
    renderHistory();
    showToast("Riwayat telah dihapus.");
  });
  $("#productName").addEventListener("input", (event) => event.target.closest(".field").classList.remove("invalid"));
  $("#cost").addEventListener("input", (event) => event.target.closest(".field").classList.remove("invalid"));
  $("#profitTarget").addEventListener("input", (event) => event.target.closest(".field").classList.remove("invalid"));
}

bindEvents();
applyPlatformPreset(false);
updateProfitMode();
renderHistory();
$$(".currency").forEach(formatCurrencyInput);
