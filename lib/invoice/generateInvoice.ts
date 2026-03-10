import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { InvoiceTemplate } from './InvoiceTemplate'

export async function generateInvoice(orderId: string) {
  const supabase = await createClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      dealer:profiles(*)
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found')
  }

  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      *,
      product:products(brand, size, price_aud)
    `)
    .eq('order_id', orderId)

  if (itemsError || !orderItems) {
    throw new Error('Failed to fetch order items')
  }

  const subtotal = orderItems.reduce((sum, item) => {
    return sum + (item.product.price_aud * item.quantity)
  }, 0)

  const grandTotal = subtotal + (order.shipping_cost || 0)

  const invoiceData = {
    orderId: order.id,
    dealerName: order.dealer?.company_name || 'Unknown Dealer',
    dealerEmail: order.dealer?.email || 'No email',
    orderDate: order.created_at,
    shippingType: order.shipping_type,
    items: orderItems.map((item) => ({
      brand: item.product.brand,
      size: item.product.size,
      quantity: item.quantity,
      unitPrice: item.product.price_aud,
      lineTotal: item.product.price_aud * item.quantity,
    })),
    subtotal,
    shippingCost: order.shipping_cost || 0,
    grandTotal,
  }

  const pdfBuffer = await renderToBuffer(InvoiceTemplate({ data: invoiceData }))

  return {
    pdfBuffer,
    order,
  }
}
