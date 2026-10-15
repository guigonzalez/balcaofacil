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
  if (sale.importProfitCents !== null && sale.importProfitCents !== undefined) {
    return sale.importProfitCents;
  }
  return sale.items.reduce((total, item) => total + (item.cost === null ? 0 : (item.price - item.cost) * item.quantity), 0);
}

export function calculateSalesAnalytics(sales, days = 30, now = new Date()) {
  if (!PERIODS.has(days)) throw new RangeError("O período deve ser de 7, 30 ou 90 dias.");

  const end = startOfDay(now);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const periodSales = sales.filter(sale => {
    const date = new Date(sale.date);
    return !Number.isNaN(date.getTime()) && date >= start && date <= now;
  });
  const completed = periodSales.filter(sale => sale.status === "completed");
  const revenueCents = completed.reduce((sum, sale) => sum + sale.total, 0);
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
      return date >= bucketStart && date < bucketEnd ? sum + sale.total : sum;
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
    averageTicketCents: completed.length ? Math.round(revenueCents / completed.length) : 0,
    grossProfitCents,
    profitIsPartial,
    trend,
    payments: [...payments.entries()].map(([name, totalCents]) => ({ name, totalCents }))
      .sort((a, b) => b.totalCents - a.totalCents),
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5)
  };
}
