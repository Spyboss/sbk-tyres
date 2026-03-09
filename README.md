# SBK Tyre Distributors - Dealer Portal

B2B Wholesale Tyre Ordering System for Australian dealers.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **UI Components**: Shadcn-UI (Radix UI)
- **Backend**: Supabase (PostgreSQL, Auth)
- **State Management**: Zustand (client-side cart)
- **Hosting**: Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account

### Installation

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Development

```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
/app
  /catalog      - Product catalog with search
  /cart         - Shopping cart
  /checkout     - Checkout page
  /orders       - Dealer order history
  /admin
    /orders    - Manage orders
    /products  - Inventory management
    /users     - User management
  /login        - Authentication
/components
  /ui           - Shadcn UI components
  header.tsx    - Main navigation
/lib
  supabase.ts   - Supabase client
  store.ts      - Zustand cart store
  utils.ts      - Helper functions
/types
  index.ts      - TypeScript types
```

## Features

- Product catalog with fast tyre size search (trigram index)
- Wholesale pricing (authenticated dealers only)
- Client-side shopping cart (Zustand)
- Order placement (pickup/delivery)
- Admin order management with shipping cost
- Stock auto-deduction on order

## Deployment (Cloudflare Pages)

1. Connect GitHub repo to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `.next`
4. Add environment variables in Cloudflare dashboard

## Database Schema

- **profiles**: User accounts with roles (admin/staff/dealer)
- **products**: Tyre catalog (brand, size, price, stock)
- **orders**: Dealer orders
- **order_items**: Order line items

## Security

- RLS policies enforce role-based access
- Price visibility controlled at frontend level
- Stock deduction via database trigger
