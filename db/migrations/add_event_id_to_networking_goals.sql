-- Add event_id column to networking_goals table to link goals to specific events
ALTER TABLE public.networking_goals 
ADD COLUMN IF NOT EXISTS event_id uuid;

-- Add foreign key constraint
ALTER TABLE public.networking_goals
ADD CONSTRAINT networking_goals_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_networking_goals_event_id ON public.networking_goals(event_id);

