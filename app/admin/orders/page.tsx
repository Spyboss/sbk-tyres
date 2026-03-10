'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Order, Profile } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Search,
  Eye,
  Plus,
  Minus,
  FileText
} from 'lucide-react'
import { generateInvoice } from '@/lib/invoice/generateInvoice'

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [shippingCost, setShippingCost] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (userRole) {
      fetchOrders()
    }
  }, [userRole, statusFilter])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
      router.push('/catalog')
      return
    }

    setUserRole(profile.role)
  }

  const fetchOrders = async () => {
    let query = supabase
      .from('orders')
      .select('*, dealer:profiles(*)')
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (!error && data) {
      setOrders(data)
    }
    setLoading(false)
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (!error) {
      fetchOrders()
    }
  }

  const updateShippingCost = async (orderId: string) => {
    const cost = parseFloat(shippingCost) || 0
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    const { error } = await supabase
      .from('orders')
      .update({ 
        shipping_cost: cost,
        total: order.subtotal + cost
      })
      .eq('id', orderId)

    if (!error) {
      setShippingCost('')
      fetchOrders()
    }
  }

  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order)
    
    const { data: items } = await supabase
      .from('order_items')
      .select('*, product:products(*)')
      .eq('order_id', order.id)

    if (items) {
      setOrderItems(items)
    }
    setShowDetails(true)
  }

  const downloadInvoice = async (orderId: string) => {
    try {
      setDownloadingId(orderId)
      const { pdfBuffer } = await generateInvoice(orderId)
      const uint8Array = new Uint8Array(pdfBuffer)
      const blob = new Blob([uint8Array], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${orderId.slice(0, 8).toUpperCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading invoice:', error)
      alert('Failed to download invoice')
    } finally {
      setDownloadingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'confirmed':
        return <Badge variant="default">Confirmed</Badge>
      case 'shipped':
        return <Badge variant="default">Shipped</Badge>
      case 'completed':
        return <Badge variant="success">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const dealerName = order.dealer?.company_name?.toLowerCase() || ''
    const orderId = order.id.toLowerCase()
    return dealerName.includes(query) || orderId.includes(query)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Package className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID or dealer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Order ID</th>
                  <th className="text-left py-3 px-2 font-medium">Dealer</th>
                  <th className="text-left py-3 px-2 font-medium">Type</th>
                  <th className="text-left py-3 px-2 font-medium">Total</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="text-left py-3 px-2 font-medium">Date</th>
                  <th className="text-left py-3 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-3 px-2 text-sm">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{order.dealer?.company_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{order.dealer?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {order.shipping_type === 'pickup' ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Package className="h-3 w-3" /> Pickup
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm">
                            <Truck className="h-3 w-3" /> Delivery
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-2">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => viewOrderDetails(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => downloadInvoice(order.id)}
                            disabled={downloadingId === order.id}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Select
                            value={order.status}
                            onValueChange={(status) => updateOrderStatus(order.id, status)}
                          >
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Dealer</p>
                  <p className="font-medium">{selectedOrder.dealer?.company_name}</p>
                  <p className="text-muted-foreground">{selectedOrder.dealer?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Items</p>
                <div className="border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Product</th>
                        <th className="text-right py-2 px-3">Qty</th>
                        <th className="text-right py-2 px-3">Price</th>
                        <th className="text-right py-2 px-3">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2 px-3">
                            <p className="font-medium">{item.product?.brand}</p>
                            <p className="text-muted-foreground">{item.product?.size}</p>
                          </td>
                          <td className="text-right py-2 px-3">{item.quantity}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(item.unit_price)}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Shipping:</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="h-8 w-24"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => updateShippingCost(selectedOrder.id)}
                    disabled={!shippingCost}
                  >
                    Update
                  </Button>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-muted-foreground text-sm">Notes</p>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
