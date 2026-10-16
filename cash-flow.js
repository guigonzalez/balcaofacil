function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function salesToCashEntries(sales, customers) {
  const customerNames = new Map(customers.map(customer => [customer.id, customer.name]));
  return sales
    .filter(sale => sale.status === "completed" && Number.isSafeInteger(Number(sale.total)) && Number(sale.total) > 0)
    .flatMap(sale => {
      const settledDate = new Date(sale.date);
      if (Number.isNaN(settledDate.getTime())) return [];
      return [{
        id: `sale:${sale.id}`,
        source: "sale",
        direction: "receivable",
        description: `Venda ${sale.id}`,
        counterparty: customerNames.get(sale.customerId) ?? sale.customerName ?? "",
        category: "Venda",
        amountCents: Number(sale.total),
        dueDate: localDateKey(settledDate),
        paymentMethod: sale.payment ?? "",
        settledAt: sale.date
      }];
    });
}

export function cashEntryStatus(entry, now = new Date()) {
  if (entry.settledAt) return "settled";
  return entry.dueDate < localDateKey(now) ? "overdue" : "open";
}

export function summarizeCashFlow(entries, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const summary = {
    openPayablesCents: 0,
    openReceivablesCents: 0,
    overdueCents: 0,
    overdueCount: 0,
    settledPayablesThisMonthCents: 0,
    settledReceivablesThisMonthCents: 0,
    projectedBalanceCents: 0,
    settledBalanceThisMonthCents: 0
  };

  for (const entry of entries) {
    if (cashEntryStatus(entry, now) === "settled") {
      const settledDate = new Date(entry.settledAt);
      if (settledDate >= monthStart && settledDate < nextMonthStart) {
        if (entry.direction === "receivable") summary.settledReceivablesThisMonthCents += entry.amountCents;
        else summary.settledPayablesThisMonthCents += entry.amountCents;
      }
      continue;
    }

    if (entry.direction === "receivable") summary.openReceivablesCents += entry.amountCents;
    else summary.openPayablesCents += entry.amountCents;

    if (cashEntryStatus(entry, now) === "overdue") {
      summary.overdueCents += entry.amountCents;
      summary.overdueCount += 1;
    }
  }

  summary.settledBalanceThisMonthCents =
    summary.settledReceivablesThisMonthCents - summary.settledPayablesThisMonthCents;
  summary.projectedBalanceCents =
    summary.settledBalanceThisMonthCents + summary.openReceivablesCents - summary.openPayablesCents;
  return summary;
}
