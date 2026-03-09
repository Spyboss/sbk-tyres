'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Package, Truck } from 'lucide-react'

export default function CheckoutPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [shippingType, setShippingType] = useState<'pickup' | 'delivery'>('pickup')
  const [notes, setNotes] = useState('')
  
  const { items, getSubtotal, clearCart } = useCartStore()

  useEffect(() => {
    setMounted(true)
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setUser(session.user)
  }

  const subtotal = getSubtotal()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!user) {
      setError('Please log in to place an order')
      setLoading(false)
      return
    }

    if (items.length === 0) {
      setError('Your cart is empty')
      setLoading(false)
      return
    }

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          dealer_id: user.id,
          status: 'pending',
          shipping_type: shippingType,
          shipping_cost: 0,
          subtotal: subtotal,
          total: subtotal,
          notes: notes || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price_aud,
        subtotal: item.product.price_aud * item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Clear cart and redirect
      clearCart()
      router.push(`/orders?success=true&orderId=${order.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to place order')
      setLoading(false)
    }
  }

  if (!mounted || !user) {
    return null
  }

  if (items.length === 0) {
    router.push('/cart')
    return null
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Type */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Method</CardTitle>
                <CardDescription>Choose how you want to receive your order</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={shippingType}
                  onValueChange={(value) => setShippingType(value as 'pickup' | 'delivery')}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <div className={`border rounded-lg p-4 cursor-pointer ${shippingType === 'pickup' ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value="pickup" id="pickup" className="sr-only" />
                    <label htmlFor="pickup" className="flex items-center gap-3 cursor-pointer">
                      <Package className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Store Pickup</p>
                        <p className="text-sm text-muted-foreground">Collect from our warehouse</p>
                      </div>
                    </label>
                  </div>
                  <div className={`border rounded-lg p-4 cursor-pointer ${shippingType === 'delivery' ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value="delivery" id="delivery" className="sr-only" />
                    <label htmlFor="delivery" className="flex items-center gap-3 cursor-pointer">
                      <Truck className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Delivery</p>
                        <p className="text-sm text-muted-foreground">Ship to your address</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Order Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Any special instructions or notes for this order..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.product.size}</span>
                      <span className="text-muted-foreground"> x {item.quantity}</span>
                    </div>
                    <span>{formatCurrency(item.product.price_aud * item.quantity)}</span>
                  </div>
                ))}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">To be calculated</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Place Order
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
