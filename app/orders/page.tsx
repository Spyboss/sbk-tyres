'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Order } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Eye, CheckCircle, Truck, XCircle, FileText } from 'lucide-react'
import { generateInvoice } from '@/lib/invoice/generateInvoice'

function OrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const successOrderId = searchParams.get('success')
  const orderId = searchParams.get('orderId')

  useEffect(() => {
    setMounted(true)
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setUser(session.user)
  }

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('dealer_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data)
    }
    setLoading(false)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Package className="h-4 w-4" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'shipped':
        return <Truck className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
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

  if (!mounted) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Package className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">My Orders</h1>
        <Link href="/catalog">
          <Button>New Order</Button>
        </Link>
      </div>

      {successOrderId && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                Order placed successfully! Order ID: {orderId}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No orders yet</p>
            <p className="text-muted-foreground mb-4">
              Start by browsing our catalogue
            </p>
            <Link href="/catalog">
              <Button>Browse Catalog</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    {getStatusBadge(order.status)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadInvoice(order.id)}
                    disabled={downloadingId === order.id}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    {downloadingId === order.id ? 'Generating...' : 'Download Invoice'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Items</p>
                    <p className="font-medium">{order.shipping_type === 'pickup' ? 'Store Pickup' : 'Delivery'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Subtotal</p>
                    <p className="font-medium">{formatCurrency(order.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Shipping</p>
                    <p className="font-medium">
                      {order.shipping_cost > 0 
                        ? formatCurrency(order.shipping_cost)
                        : 'TBD'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-bold">{formatCurrency(order.total)}</p>
                  </div>
                </div>
                {order.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Notes:</span> {order.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Package className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}
