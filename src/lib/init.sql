-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number TEXT NOT NULL UNIQUE,
    room_type TEXT NOT NULL,
    price_per_hour NUMERIC DEFAULT 0 NOT NULL,
    price_per_night NUMERIC DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'available' NOT NULL CONSTRAINT chk_room_status CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'maintenance')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    citizen_id TEXT NOT NULL,
    customer_type TEXT DEFAULT 'individual' NOT NULL CONSTRAINT chk_customer_type CHECK (customer_type IN ('individual', 'business', 'vip')),
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'individual' NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_customer_type'
    ) THEN
        ALTER TABLE public.customers
        ADD CONSTRAINT chk_customer_type CHECK (customer_type IN ('individual', 'business', 'vip'));
    END IF;
END $$;

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    room_id UUID NOT NULL REFERENCES public.rooms(id),
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    booking_type TEXT NOT NULL CONSTRAINT chk_booking_type CHECK (booking_type IN ('hourly', 'overnight', 'daily')),
    status TEXT DEFAULT 'reserved' NOT NULL CONSTRAINT chk_booking_status CHECK (status IN ('reserved', 'checked_in', 'checked_out', 'cancelled')),
    total_price NUMERIC DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id),
    room_fee NUMERIC DEFAULT 0 NOT NULL,
    service_fee NUMERIC DEFAULT 0 NOT NULL,
    discount NUMERIC DEFAULT 0 NOT NULL,
    total_amount NUMERIC DEFAULT 0 NOT NULL,
    payment_status TEXT DEFAULT 'unpaid' NOT NULL CONSTRAINT chk_invoice_payment_status CHECK (payment_status IN ('unpaid', 'paid')),
    payment_method TEXT CONSTRAINT chk_invoice_payment_method CHECK (payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'card')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create profiles table for Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'staff' NOT NULL CONSTRAINT chk_profile_role CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
