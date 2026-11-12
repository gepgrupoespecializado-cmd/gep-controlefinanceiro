ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS lembrete_status text NOT NULL DEFAULT 'pendente';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS lembrete_enviado_em timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS lembrete_referencia text;