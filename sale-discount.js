export function calculateDiscountCents(subtotalCents, type, value) {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError("O subtotal deve ser um valor inteiro de centavos não negativo.");
  }
  if (type === "none" && value === 0) return 0;
  if (type === "amount") {
    if (!Number.isSafeInteger(value) || value < 0 || value > subtotalCents) {
      throw new RangeError("O desconto em reais deve estar entre R$ 0,00 e o subtotal.");
    }
    return value;
  }
  if (type === "percent") {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new RangeError("O desconto percentual deve estar entre 0% e 100%.");
    }
    const basisPoints = Math.round(value * 100);
    if (Math.abs(value * 100 - basisPoints) > 1e-8) {
      throw new RangeError("Informe a porcentagem com até duas casas decimais.");
    }
    return Number((BigInt(subtotalCents) * BigInt(basisPoints) + 5000n) / 10000n);
  }
  throw new RangeError("Escolha um desconto em reais ou em percentual.");
}
