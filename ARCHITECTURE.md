# 1. PRD - Product Requirements Document

## SBK Tyre Distributors - B2B Wholesale Tyre Ordering System

---

## MVP Scope

The MVP includes:
1. **Product Catalog** - Browse tyres with search by size
2. **Authentication** - Manual dealer account creation (no public registration)
3. **Pricing** - Wholesale prices visible only to authenticated dealers
4. **Shopping Cart** - Client-side cart (Zustand, no database)
5. **Checkout** - Place orders (pickup or delivery)
6. **Order Management** - Admin/Staff can update order status and add shipping costs
7. **PDF Invoice** - Generate downloadable invoice after checkout
8. **Stock Management** - Auto-deduct stock on order creation

---

## User Stories

### As a Dealer:
- I want to search tyres by size so that I can quickly find the products I need
- I want to see wholesale pricing so I know my costs
- I want to add tyres to cart and checkout so I can place orders
- I want to select pickup or delivery so I can choose how to receive my order
- I want to download PDF invoices so I have documentation for my records
- I want to view my order history so I can track past orders

### As a Staff Member:
- I want to view all dealer orders so I can process them
- I want to update order status (pending → confirmed → shipped) so dealers know their order progress
- I want to add shipping costs to orders so the invoice reflects total cost
- I want to manage product stock levels so inventory is accurate

### As an Admin:
- I want to create dealer accounts manually so only approved dealers can order
- I want to manage products (add/edit/delete) so the catalog stays current
- I want to view all data so I have full system visibility
- I want to assign roles (staff/dealer) so permissions are correct

---

## Out-of-Scope Features

The following are explicitly NOT in MVP:
- ❌ B2C public pricing
- ❌ Public account registration
- ❌ Automated shipping calculation
- ❌ Payment gateway integration
- ❌ Email notifications
- ❌ Accounting software integration
- ❌ Multiple brands (currently BOTO only)
- ❌ Bulk import/export
- ❌ Order tracking website for customers
- ❌ Mobile app (responsive web only)

---

## Business Rules

1. **Guests** - Can browse catalog, cannot see prices
2. **Dealers** - Must be authenticated, see wholesale prices, can order on account
3. **Back-Orders** - If stock = 0, dealer can still order (treated as back-order)
4. **No Payment** - Orders placed on account, no payment gateway
5. **Manual Shipping** - Admin adds shipping cost after order submission
6. **Stock Deduction** - Occurs when Admin/Staff confirms the order

---

# 2. System Architecture & Data Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Pages                         │
│                     (Next.js Frontend)                         │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Dealer  │  │  Staff   │  │  Admin   │  │    Guest     │   │
│  │   UI     │  │   UI     │  │   UI     │  │     UI       │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │             │             │               │            │
│       └─────────────┴─────────────┴───────────────┘            │
│                           │                                     │
│                    Next.js App Router                           │
│              (Server Components + Actions)                       │
│                           │                                     │
│              ┌────────────▼────────────┐                       │
│              │   Zustand Cart Store    │  ← Client-side        │
│              │   (No database)         │                       │
│              └────────────┬────────────┘                       │
└───────────────────────────┼─────────────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │     Supabase Edge        │
              │   (Authentication)       │
              └─────────────┬─────────────┘
                            │
              ┌─────────────▼─────────────┐
              │    PostgreSQL Database   │
              │  (Products, Orders,      │
              │   Profiles, OrderItems──────────────────────────) │
              └┘
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant D as Dealer
    participant C as Zustand Cart (Client)
    participant F as Next.js Frontend
    participant A as Supabase Auth
    participant DB as PostgreSQL

    Note over D,F: Guest Flow (No Auth)
    D->>F: Browse Catalog
    F->>DB: GET products
    DB-->>F: Products
    F-->>D: Show Catalog (prices hidden)

    Note over D,F: Dealer Flow (Authenticated)
    D->>F: Login
    F->>A: Authenticate
    A-->>F: Session Token
    F->>DB: GET products
    DB-->>F: Products
    F-->>D: Show Catalog (prices visible)

    D->>F: Search "215/60R16"
    F->>DB: Search products by size
    DB-->>F: Matching products
    F-->>D: Show search results

    D->>F: Add to Cart
    F->>C: Update Zustand store
    C-->>F: Cart updated (client-side)

    D->>F: Checkout (pickup)
    F->>DB: Insert order + order_items
    DB-->>DB: Stock deducted immediately
    DB-->>F: Order created

    F->>F: Generate PDF Invoice
    F-->>D: Download Invoice
```

---

# 3. ERD - Entity Relationship Diagram

```mermaid
erDiagram
    PROFILES ||--o{ ORDERS : places
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : ordered_in

    PROFILES {
        uuid id PK
        text email
        text company_name
        text phone
        text address
        user_role role
        timestamptz created_at
        timestamptz updated_at
    }

    PRODUCTS {
        uuid id PK
        text brand
        text size
        decimal price_aud
        int stock_level
        bool is_active
        timestamptz created_at
        timestamptz updated_at
    }

    ORDERS {
        uuid id PK
        uuid dealer_id FK
        text status
        text shipping_type
        decimal shipping_cost
        decimal subtotal
        decimal total
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
        decimal subtotal
        timestamptz created_at
    }
```

**Note**: Cart is stored client-side in Zustand (not in database)

---

# 4. Data Flow Chart

```mermaid
flowchart TD
    A[Dealer logs in] --> B[Search tyres by size<br/>Trigram search]
    B --> C[View prices & stock]
    C --> D[Add to cart<br/>Zustand (client-side)]
    D --> E[Proceed to checkout]
    E --> F[Select: Pickup or Delivery]
    F --> G[Submit order]
    G --> H[Order + items stored in DB]
    H --> I[Stock deducted IMMEDIATELY<br/>via trigger]
    I --> J[PDF Invoice generated]
    J --> K[Staff reviews order]
    K --> L[Staff adds shipping cost<br/>If delivery]
    L --> M[Staff updates status<br/>pending → confirmed → shipped]
    M --> N[Invoice regenerated<br/>with shipping]

    style A fill:#e1f5fe
    style H fill:#fff3e0
    style I fill:#fce4ec
    style J fill:#e8f5e9
```

---

# 5. Security & RBAC Plan

## Supabase Row Level Security (RLS)

### Products Table
| Operation | Guest | Dealer | Staff | Admin |
|-----------|-------|--------|-------|-------|
| SELECT | ✓ | ✓ | ✓ | ✓ |
| INSERT | ✗ | ✗ | ✓ | ✓ |
| UPDATE | ✗ | ✗ | ✓ | ✓ |
| DELETE | ✗ | ✗ | ✗ | ✓ |

**Note**: Price is visible to all queries; frontend hides it for guests.

### Orders Table
| Operation | Guest | Dealer | Staff | Admin |
|-----------|-------|--------|-------|-------|
| SELECT | ✗ | Own only | All | All |
| INSERT | ✗ | ✓ | ✓ | ✓ |
| UPDATE | ✗ | ✗ | ✓ | ✓ |
| DELETE | ✗ | ✗ | ✗ | ✓ |

### Profiles Table
| Operation | Guest | Dealer | Staff | Admin |
|-----------|-------|--------|-------|-------|
| SELECT | ✗ | Own only | All | All |
| INSERT | ✗ | ✗ | ✗ | ✓ |
| UPDATE | ✗ | Own only | Own only | ✓ |
| DELETE | ✗ | ✗ | ✗ | ✓ |

## Pricing Protection Strategy

- **Database Level**: All users can query products (price column accessible)
- **Frontend Level**: UI conditionally renders price based on auth state
- No special database function needed - simple and transparent

## Stock Deduction Strategy

- Stock is deducted **immediately** when `order_items` are inserted
- This prevents race conditions where multiple orders could exceed stock
- Negative stock indicates back-order (acceptable for MVP)

---

# 6. Technical Stack & Library Checklist

## Core Dependencies

### Frontend Framework
- **Next.js 14** (App Router) - Server components, Server Actions
- **React 18** - UI library

### Styling
- **TailwindCSS** - Utility-first CSS
- **Shadcn-UI** - Component library (built on Radix UI)

### State Management
- **Zustand** - Cart state (client-side, not persisted to DB)

### Data Fetching
- **@supabase/supabase-js** - Supabase client
- **React Server Components** - Server-side data fetching
- **Server Actions** - Form submissions, mutations

### PDF Generation
- **@react-pdf/renderer** - Generate PDF invoices on client

### Form Handling
- **React Hook Form** - Form state
- **Zod** - Schema validation

## Project Structure
```
/app
  /layout.tsx          # Root layout
  /page.tsx            # Home (catalog)
  /login/page.tsx      # Login
  /cart/page.tsx       # Shopping cart (Zustand)
  /checkout/page.tsx   # Checkout
  /orders/page.tsx     # Order history
  /admin
    /products/page.tsx # Product management
    /orders/page.tsx   # Order management
    /users/page.tsx    # User management
/components
  /ui                  # Shadcn components
  /products            # Product-related components
  /cart                # Cart components (Zustand)
  /orders              # Order components
/lib
  /supabase.ts         # Supabase client
  /store.ts            # Zustand store (cart)
  /utils.ts            # Utilities
/types
  /index.ts            # TypeScript types
```

---

# 7. JSON Schema of Extracted Tyre Data

## JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["brand", "size", "price_aud"],
    "properties": {
      "brand": {
        "type": "string",
        "description": "Tyre brand name"
      },
      "size": {
        "type": "string",
        "description": "Tyre size in format W/R/D (e.g., 215/60R16)"
      },
      "price_aud": {
        "type": "number",
        "minimum": 0,
        "description": "Wholesale price in Australian Dollars (including GST)"
      }
    }
  }
}
```

## Sample Extracted Data (49 items)

```json
[
  {"brand": "BOTO", "size": "175/65R14", "price_aud": 37},
  {"brand": "BOTO", "size": "175/65R15", "price_aud": 38},
  {"brand": "BOTO", "size": "175/70R14", "price_aud": 42},
  {"brand": "BOTO", "size": "185/55R15", "price_aud": 46},
  {"brand": "BOTO", "size": "185/60R15", "price_aud": 44},
  {"brand": "BOTO", "size": "185/65R14", "price_aud": 41},
  {"brand": "BOTO", "size": "185/65R15", "price_aud": 45},
  {"brand": "BOTO", "size": "195R15C", "price_aud": 65},
  {"brand": "BOTO", "size": "195/55R15", "price_aud": 46},
  {"brand": "BOTO", "size": "195/60R15", "price_aud": 48},
  {"brand": "BOTO", "size": "195/65R15", "price_aud": 47},
  {"brand": "BOTO", "size": "205/50R17", "price_aud": 57},
  {"brand": "BOTO", "size": "205/55R16", "price_aud": 46},
  {"brand": "BOTO", "size": "205/60R16", "price_aud": 57},
  {"brand": "BOTO", "size": "205/65R15", "price_aud": 53},
  {"brand": "BOTO", "size": "205/65R16", "price_aud": 58},
  {"brand": "BOTO", "size": "205/65R16C", "price_aud": 67},
  {"brand": "BOTO", "size": "215/45R17", "price_aud": 55},
  {"brand": "BOTO", "size": "215/50R17", "price_aud": 59},
  {"brand": "BOTO", "size": "215/55R17", "price_aud": 63},
  {"brand": "BOTO", "size": "215/55R18", "price_aud": 67},
  {"brand": "BOTO", "size": "215/60R16", "price_aud": 55},
  {"brand": "BOTO", "size": "215/60R17", "price_aud": 62},
  {"brand": "BOTO", "size": "215/65R16C", "price_aud": 75},
  {"brand": "BOTO", "size": "215/70R16C", "price_aud": 81},
  {"brand": "BOTO", "size": "225/40R18", "price_aud": 54},
  {"brand": "BOTO", "size": "225/45R18", "price_aud": 62},
  {"brand": "BOTO", "size": "225/50R17", "price_aud": 63},
  {"brand": "BOTO", "size": "225/55R17", "price_aud": 69},
  {"brand": "BOTO", "size": "225/55R18", "price_aud": 71},
  {"brand": "BOTO", "size": "225/60R17", "price_aud": 63},
  {"brand": "BOTO", "size": "225/60R18", "price_aud": 75},
  {"brand": "BOTO", "size": "225/65R16C", "price_aud": 76},
  {"brand": "BOTO", "size": "225/65R17", "price_aud": 72},
  {"brand": "BOTO", "size": "235/35R19", "price_aud": 69},
  {"brand": "BOTO", "size": "235/40R18", "price_aud": 63},
  {"brand": "BOTO", "size": "235/45R17", "price_aud": 63},
  {"brand": "BOTO", "size": "235/45R18", "price_aud": 68},
  {"brand": "BOTO", "size": "235/50R19", "price_aud": 85},
  {"brand": "BOTO", "size": "235/55R18", "price_aud": 70},
  {"brand": "BOTO", "size": "235/60R18", "price_aud": 76},
  {"brand": "BOTO", "size": "235/65R16C", "price_aud": 78},
  {"brand": "BOTO", "size": "235/65R17", "price_aud": 78},
  {"brand": "BOTO", "size": "245/40R18", "price_aud": 70},
  {"brand": "BOTO", "size": "245/45R18", "price_aud": 69},
  {"brand": "BOTO", "size": "245/55R19", "price_aud": 87},
  {"brand": "BOTO", "size": "245/60R18", "price_aud": 86},
  {"brand": "BOTO", "size": "245/65R17", "price_aud": 91},
  {"brand": "BOTO", "size": "245/70R16", "price_aud": 88}
]
```

---

# 8. README.md Structure

```markdown
# SBK Tyre Distributors

B2B Wholesale Tyre Ordering System for Australian dealers.

## Tech Stack

- **Frontend**: Next.js 14, TailwindCSS, Shadcn-UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Hosting**: Cloudflare Pages

## Features

- Product catalog with fast tyre size search
- Wholesale pricing (authenticated dealers only)
- Shopping cart & checkout
- Order management (pickup/delivery)
- PDF invoice generation
- Stock management

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

## Deployment

Deploy to Cloudflare Pages:

1. Connect repo to Cloudflare Pages
2. Build: `npm run build`
3. Output: `.next`
4. Add env vars in Cloudflare dashboard

## Database Schema

See `DOCUMENTATION.md` for full schema.

## License

Proprietary - SBK Tyre Distributors
```

---

# 9. Implementation Roadmap

## Phase 1: Environment Setup
- [x] Supabase project created
- [x] Database schema deployed
- [x] RLS policies configured
- [x] Initial tyre data loaded (49 products)
- [ ] Next.js project initialized
- [ ] Cloudflare Pages account setup

## Phase 2: Authentication
- [ ] Supabase Auth integration
- [ ] Login page with magic link
- [ ] Role-based access control
- [ ] Manual user creation (Admin only)

## Phase 3: Product Catalog
- [ ] Product listing page
- [ ] Fast search by tyre size
- [ ] Product detail view
- [ ] Price hiding for guests

## Phase 4: Shopping Cart
- [ ] Add/remove cart items
- [ ] Quantity adjustment
- [ ] Cart persistence (Supabase)
- [ ] Cart UI components

## Phase 5: Checkout & Orders
- [ ] Checkout form (pickup/delivery)
- [ ] Order creation
- [ ] Order history page
- [ ] Staff order management

## Phase 6: Invoice & Stock
- [ ] PDF invoice generation (react-pdf)
- [ ] Stock auto-deduction on confirm
- [ ] Shipping cost addition
- [ ] Invoice regeneration

## Phase 7: Production
- [ ] Mobile responsive testing
- [ ] Cloudflare Pages deployment
- [ ] Performance optimization
- [ ] Final QA

---

## Supabase Credentials

```
Project URL: https://wuisxibhflkxzltnpucc.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1aXN4aWJoZmxreHpsdG5wdWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTI3MjMsImV4cCI6MjA4ODU2ODcyM30.AxsGuFjZGIXekbvj67a1n06Ky_6d_MnQyy_hf7H5pt4
```

**Database is ready with 49 BOTO tyres loaded.**
