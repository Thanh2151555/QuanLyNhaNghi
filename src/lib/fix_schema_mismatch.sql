alter table customers
add column if not exists customer_type text not null default 'individual'
check (customer_type in ('individual', 'business', 'vip'));
