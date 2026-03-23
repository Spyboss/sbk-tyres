create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'::public.user_role
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin'::public.user_role, 'staff'::public.user_role)
  );
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'products', 'orders', 'order_items')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$$;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_select_staff_admin
on public.profiles
for select
to authenticated
using (public.is_staff());

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_own_non_privileged
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (
    select p.role
    from public.profiles p
    where p.id = auth.uid()
  )
);

create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy profiles_delete_admin
on public.profiles
for delete
to authenticated
using (public.is_admin());

create policy products_select_public_active
on public.products
for select
to anon, authenticated
using (is_active = true);

create policy products_select_staff_all
on public.products
for select
to authenticated
using (public.is_staff());

create policy products_select_for_own_orders
on public.products
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items oi
    join public.orders o
      on o.id = oi.order_id
    where oi.product_id = products.id
      and o.dealer_id = auth.uid()
  )
);

create policy products_insert_staff
on public.products
for insert
to authenticated
with check (public.is_staff());

create policy products_update_staff
on public.products
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy products_delete_staff
on public.products
for delete
to authenticated
using (public.is_staff());

create policy orders_select_own
on public.orders
for select
to authenticated
using (dealer_id = auth.uid());

create policy orders_select_staff_all
on public.orders
for select
to authenticated
using (public.is_staff());

create policy orders_insert_own
on public.orders
for insert
to authenticated
with check (dealer_id = auth.uid());

create policy orders_update_staff
on public.orders
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy orders_delete_admin
on public.orders
for delete
to authenticated
using (public.is_admin());

create policy order_items_select_own
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.dealer_id = auth.uid()
  )
);

create policy order_items_select_staff_all
on public.order_items
for select
to authenticated
using (public.is_staff());

create policy order_items_insert_own
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and o.dealer_id = auth.uid()
  )
);

create policy order_items_update_staff
on public.order_items
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy order_items_delete_admin
on public.order_items
for delete
to authenticated
using (public.is_admin());

create or replace function public.deduct_stock_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  update public.products
  set stock_level = stock_level - new.quantity
  where id = new.product_id;

  return new;
end;
$function$;
