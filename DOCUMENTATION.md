# SBK Tyre Distributors - B2B Wholesale Tyre Ordering System

## Project Overview
A production-ready B2B wholesale tyre ordering system for Australian dealers. Dealers can search tyres by size, view wholesale pricing, place orders on account, and download PDF invoices.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TailwindCSS, Shadcn-UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Hosting**: Cloudflare Pages
- **PDF Generation**: react-pdf

## Supabase Configuration
```
Project URL: https://wuisxibhflkxzltnpucc.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1aXN4aWJoZmxreHpsdG5wdWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTI3MjMsImV4cCI6MjA4ODU2ODcyM30.AxsGuFjZGIXekbvj67a1n06Ky_6d_MnQyy_hf7H5pt4
```

## Database Schema

### Tables

```sql
-- roles enum
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'dealer');

-- profiles (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    address TEXT,
    role user_role DEFAULT 'dealer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- products (tyres)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand TEXT NOT NULL,
    size TEXT NOT NULL,
    price_aud DECIMAL(10,2) NOT NULL,
    stock_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand, size)
);

-- orders
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealer_id UUID NOT NULL REFERENCES public.profiles(id),
    status TEXT DEFAULT 'pending',
    shipping_type TEXT CHECK (shipping_type IN ('pickup', 'delivery')),
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- order_items
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cart_items
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);
```

## Security (RLS)

### Pricing Protection
- Guests: Can view products but price returns NULL
- Authenticated dealers: Can view full pricing via `get_products_with_price()` function

### Role-Based Access
| Role  | View Products | View Prices | Create Orders | Manage Stock | Manage Users |
|-------|---------------|-------------|---------------|--------------|--------------|
| Guest | ✓             | ✗           | ✗             | ✗            | ✗            |
| Dealer| ✓             | ✓           | ✓             | ✗            | ✗            |
| Staff | ✓             | ✓           | ✓             | ✓            | ✗            |
| Admin | ✓             | ✓           | ✓             | ✓            | ✓            |

## API Keys (Environment Variables)
```env
NEXT_PUBLIC_SUPABASE_URL=https://wuisxibhflkxzltnpucc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1aXN4aWJoZmxreHpsdG5wdWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTI3MjMsImV4cCI6MjA4ODU2ODcyM30.AxsGuFjZGIXekbvj67a1n06Ky_6d_MnQyy_hf7H5pt4
```

## Local Setup
```bash
# Clone repository
git clone <repo-url>
cd sbkdealerportal

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# Run development server
npm run dev
```

## Deployment (Cloudflare Pages)
1. Connect GitHub repo to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `.next`
4. Add environment variables in Cloudflare dashboard
5. Deploy

## Features Implemented
- ✓ Product catalog with 49 BOTO tyres
- ✓ Fast search by tyre size (indexed)
- ✓ Role-based authentication (manual account creation)
- ✓ Shopping cart functionality
- ✓ Order placement (pickup/delivery)
- ✓ Stock deduction on order creation (immediate via trigger)
- ✓ PDF invoice generation (via react-pdf)

## Extracted Tyre Data Sample
```json
[
  {"brand": "BOTO", "size": "175/65R14", "price_aud": 37},
  {"brand": "BOTO", "size": "175/65R15", "price_aud": 38},
  {"brand": "BOTO", "size": "215/60R16", "price_aud": 55},
  {"brand": "BOTO", "size": "245/70R16", "price_aud": 88}
]
```
Total: 49 tyres loaded into database
