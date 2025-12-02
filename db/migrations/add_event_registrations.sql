-- Event Registrations Table
-- Tracks which users have signed up for which events
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    registered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'registered',
    notes text,
    CONSTRAINT event_registrations_pkey PRIMARY KEY (id),
    CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.networking_events(id) ON DELETE CASCADE,
    CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(u_id) ON DELETE CASCADE,
    CONSTRAINT event_registrations_unique UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);

