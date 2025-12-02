-- Add end_date and end_time to networking_events table
ALTER TABLE public.networking_events
ADD COLUMN IF NOT EXISTS end_date date;

ALTER TABLE public.networking_events
ADD COLUMN IF NOT EXISTS end_time time;

