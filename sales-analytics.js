const PERIODS = new Set([7, 30, 90]);

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function saleProfit(sale) {
  const discount = sale.discountCents ?? 0;
  if (sale.importProfitCents !== null && sale.importProfitCents !== undefined) {
    return sale.importProfitCents - discount;
  }
  return sale.items.reduce((total, item) => total + (item.cost === null ? 0 : (item.price - item.cost) * item.quantity), 0) - discount;
}

export function estimatePaymentFeeCents(totalCents, payment, feeRates = {}) {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new RangeError("O total da venda deve ser um valor inteiro de centavos não negativo.");
  }
  const rate = payment === "Cartão de débito"
    ? feeRates.debitPercent ?? 0
    : payment === "Cartão de crédito"
      ? feeRates.creditPercent ?? 0
      : 0;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new RangeError("A taxa do cartão deve estar entre 0% e 100%.");
  }
  return Math.round(totalCents * rate / 100);
}

export function calculateSalesAnalytics(sales, days = 30, now = new Date(), feeRates = {}) {
  if (!PERIODS.has(days)) throw new RangeError("O período deve ser de 7, 30 ou 90 dias.");

  const feeRateValues = [feeRates.debitPercent ?? 0, feeRates.creditPercent ?? 0];
  if (feeRateValues.some(rate => typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 100)) {
    throw new RangeError("As taxas de cartão devem estar entre 0% e 100%.");
  }
  const end = startOfDay(now);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const periodSales = sales.filter(sale => {
    const date = new Date(sale.date);
    return !Number.isNaN(date.getTime()) && date >= start && date <= now;
  });
  const completed = periodSales.filter(sale => sale.status === "completed");
  const collectedRevenueCents = completed.reduce((sum, sale) => sum + sale.total, 0);
  const discountCents = completed.reduce((sum, sale) => sum + (sale.discountCents ?? 0), 0);
  const revenueCents = collectedRevenueCents + discountCents;
  const paymentFeeCents = completed.reduce((sum, sale) =>
    sum + estimatePaymentFeeCents(sale.total, sale.payment, feeRates), 0);
  const unestimatedLegacyCardCents = completed.reduce((sum, sale) =>
    sum + (sale.payment === "Cartão" ? sale.total : 0), 0);
  const grossProfitCents = completed.reduce((sum, sale) => sum + saleProfit(sale), 0);
  const profitIsPartial = completed.some(sale =>
    (sale.importSource && (sale.importProfitCents === null || sale.importProfitCents === undefined)) ||
    sale.items.some(item => item.cost === null)
  );

  const intervalDays = days === 7 ? 1 : days === 30 ? 3 : 7;
  const bucketCount = Math.ceil(days / intervalDays);
  const trend = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(start);
    bucketStart.setDate(bucketStart.getDate() + index * intervalDays);
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketEnd.getDate() + intervalDays);
    const value = completed.reduce((sum, sale) => {
      const date = new Date(sale.date);
      const subtotal = sale.subtotalCents ?? sale.total + (sale.discountCents ?? 0);
      return date >= bucketStart && date < bucketEnd ? sum + subtotal : sum;
    }, 0);
    return { date: bucketStart, label: dayKey(bucketStart), value };
  });

  const payments = new Map();
  for (const sale of completed) payments.set(sale.payment, (payments.get(sale.payment) ?? 0) + sale.total);

  const products = new Map();
  for (const sale of completed) {
    for (const item of sale.items) {
      const key = item.productId || item.name;
      const product = products.get(key) ?? { id: item.productId ?? "", name: item.name, quantity: 0, revenueCents: 0 };
      product.quantity += item.quantity;
      product.revenueCents += item.price * item.quantity;
      products.set(key, product);
    }
  }

  return {
    start,
    end: new Date(end.getTime() + 86400000 - 1),
    completedCount: completed.length,
    cancelledCount: periodSales.filter(sale => sale.status === "cancelled").length,
    revenueCents,
    paymentFeeCents,
    collectedRevenueCents,
    discountCents,
    netRevenueCents: collectedRevenueCents - paymentFeeCents,
    unestimatedLegacyCardCents,
    paymentFeeIsPartial: unestimatedLegacyCardCents > 0,
    averageTicketCents: completed.length ? Math.round(collectedRevenueCents / completed.length) : 0,
    grossProfitCents,
    profitIsPartial,
    trend,
    payments: [...payments.entries()].map(([name, totalCents]) => ({ name, totalCents }))
      .sort((a, b) => b.totalCents - a.totalCents),
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5)
  };
}
