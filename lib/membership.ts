export type MembershipPlan = {
  id: string;
  name: string;
  price: string;
  periodMonths: number;
  description?: string | null;
  active: boolean;
  displayOrder: number;
};

export type MemberStatus = "pending" | "active" | "cancelled";

export type Member = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  planId?: string | null;
  planName?: string | null;
  price?: string | null;
  status: MemberStatus;
  validUntil?: string | null; // YYYY-MM-DD
  memberCode: string;
  notes?: string | null;
  createdAt?: string;
};

// Unambiguous code, e.g. "MK-7F3KQ".
export function generateMemberCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `MK-${code}`;
}

// Add whole months to a YYYY-MM-DD date, returning YYYY-MM-DD.
export function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCMonth(base.getUTCMonth() + months);
  return base.toISOString().slice(0, 10);
}

// A member counts as active at the door if active and not past their valid_until.
export function isMemberActive(m: Pick<Member, "status" | "validUntil">, todayStr: string): boolean {
  return m.status === "active" && !!m.validUntil && m.validUntil >= todayStr;
}
