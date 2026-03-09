import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'admin' | 'staff' | 'dealer'

export interface Profile {
  id: string
  email: string
  company_name: string | null
  phone: string | null
  address: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  brand: string
  size: string
  price_aud: number
  stock_level: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  dealer_id: string
  status: 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled'
  shipping_type: 'pickup' | 'delivery'
  shipping_cost: number
  subtotal: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
  dealer?: Profile
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
  product?: Product
}

export interface CartItem {
  product: Product
  quantity: number
}
