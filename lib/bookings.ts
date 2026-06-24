export const DEFAULT_BOOKINGS_PER_SLOT = 6;

export type BookingStatus = "confirmed" | "cancelled";

export type Booking = {
  id: string;
  date: string; // YYYY-MM-DD
  slot: string; // "HH:MM"
  name: string;
  email: string;
  phone?: string | null;
  partySize: number;
  status: BookingStatus;
  createdAt: string;
};

export type SlotAvailability = {
  slot: string;
  booked: number;
  remaining: number;
  blocked: boolean;
};

export type DayAvailability = {
  date: string;
  open: boolean;
  limit: number;
  totalBooked: number;
  slots: SlotAvailability[];
  availableSlots?: string[]; // just the bookable times (remaining > 0, not blocked)
};
