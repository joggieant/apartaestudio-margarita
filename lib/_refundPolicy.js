// api/_refundPolicy.js
//
// Política de reembolso: Flexible
//   100% si se cancela con 3 o más días de anticipación
//   50% si se cancela con menos de 3 días
//   0% si se cancela el mismo día de la entrada (o después)
//
// Ajusta estos porcentajes y días libremente si tu política cambia.

const REFUND_TIERS = [
  { minDaysBefore: 3, percent: 100 },
  { minDaysBefore: 1, percent: 50 },
  { minDaysBefore: 0, percent: 0 },
];

function calculateRefundPercent(checkinDateStr, now = new Date()) {
  const checkin = new Date(checkinDateStr + "T00:00:00Z");
  const daysUntil = Math.floor((checkin - now) / (1000 * 60 * 60 * 24));
  for (const tier of REFUND_TIERS) {
    if (daysUntil >= tier.minDaysBefore) return tier.percent;
  }
  return 0;
}

module.exports = { calculateRefundPercent, REFUND_TIERS };
