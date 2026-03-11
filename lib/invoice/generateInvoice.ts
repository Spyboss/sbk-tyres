import { jsPDF } from 'jspdf'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function generateInvoice(orderId: string): Promise<Uint8Array> {
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

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('SBK Tyre Distributors', margin, y)
  
  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Quality Tyres & Wheels', margin, y)
  
  y += 10
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth - margin, 28, { align: 'right' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${orderId.slice(0, 8).toUpperCase()}`, pageWidth - margin, 36, { align: 'right' })

  y = 50
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Order Information', margin, y)
  y += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Order ID: ${orderId.slice(0, 8).toUpperCase()}`, margin, y)
  y += 5
  doc.text(`Order Date: ${new Date(order.created_at).toLocaleDateString('en-AU')}`, margin, y)
  y += 5
  doc.text(`Delivery Type: ${order.shipping_type === 'pickup' ? 'Store Pickup' : 'Delivery'}`, margin, y)
  
  const rightCol = pageWidth / 2 + 10
  y = 50
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To', rightCol, y)
  y += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Dealer: ${order.dealer?.company_name || 'Unknown'}`, rightCol, y)
  y += 5
  doc.text(`Email: ${order.dealer?.email || 'N/A'}`, rightCol, y)

  y += 15
  
  const tableTop = y
  const colWidths = [50, 35, 25, 35, 35]
  const colPositions = [margin]
  for (let i = 1; i < colWidths.length; i++) {
    colPositions.push(colPositions[i - 1] + colWidths[i - 1])
  }
  
  doc.setFillColor(243, 244, 246)
  doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F')
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const headers = ['Brand', 'Size', 'Qty', 'Unit Price', 'Line Total']
  headers.forEach((header, i) => {
    doc.text(header, colPositions[i] + 2, y + 5.5)
  })
  
  y += 10
  doc.setFont('helvetica', 'normal')
  
  orderItems.forEach((item) => {
    const lineTotal = item.product.price_aud * item.quantity
    doc.text(item.product.brand.substring(0, 20), colPositions[0] + 2, y + 4)
    doc.text(item.product.size, colPositions[1] + 2, y + 4)
    doc.text(String(item.quantity), colPositions[2] + 2, y + 4)
    doc.text(`$${item.product.price_aud.toFixed(2)}`, colPositions[3] + 2, y + 4)
    doc.text(`$${lineTotal.toFixed(2)}`, colPositions[4] + 2, y + 4)
    y += 8
  })

  doc.setDrawColor(229, 231, 235)
  doc.line(margin, tableTop, pageWidth - margin, tableTop)
  doc.line(margin, y, pageWidth - margin, y)

  y += 10
  
  const totalsX = pageWidth - margin - 60
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', totalsX, y)
  doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
  
  y += 6
  doc.text('Shipping:', totalsX, y)
  doc.text(order.shipping_cost > 0 ? `$${order.shipping_cost.toFixed(2)}` : 'TBD', pageWidth - margin, y, { align: 'right' })
  
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Grand Total:', totalsX, y)
  doc.text(`$${grandTotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })

  y += 20
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' })

  const arrayBuffer = doc.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
}
