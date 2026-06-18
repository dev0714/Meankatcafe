-- Adds volunteer check-in + true head-count support to bookings.
-- Run once in the Supabase SQL editor (service role / dashboard).
alter table meankatcafe.bookings
  add column if not exists arrived_at timestamptz,        -- when a guest was checked in (null = not arrived)
  add column if not exists actual_party_size integer;     -- true head count (null = use party_size)
