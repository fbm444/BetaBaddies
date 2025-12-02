-- Add cancelled status to networking_events
ALTER TABLE public.networking_events 
ADD COLUMN IF NOT EXISTS cancelled boolean DEFAULT false;

-- Add cancelled_at timestamp
ALTER TABLE public.networking_events 
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

-- Add index for cancelled events
CREATE INDEX IF NOT EXISTS idx_networking_events_cancelled ON public.networking_events(cancelled);

