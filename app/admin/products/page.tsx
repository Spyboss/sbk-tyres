'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types'
import { formatCurrency } from '@/lib/utils'
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
  Package, 
  Search,
  Plus,
  Pencil,
  Save
} from 'lucide-react'

export default function AdminProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    size: '',
    price_aud: '',
    stock_level: '',
  })

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (userRole) {
      fetchProducts()
    }
  }, [userRole])

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

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('size')

    if (!error && data) {
      setProducts(data)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({ brand: '', size: '', price_aud: '', stock_level: '' })
  }

  const handleAddProduct = async () => {
    const { error } = await supabase
      .from('products')
      .insert({
        brand: formData.brand,
        size: formData.size,
        price_aud: parseFloat(formData.price_aud),
        stock_level: parseInt(formData.stock_level) || 0,
      })

    if (!error) {
      fetchProducts()
      setShowAddDialog(false)
      resetForm()
    }
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return

    const { error } = await supabase
      .from('products')
      .update({
        brand: formData.brand,
        size: formData.size,
        price_aud: parseFloat(formData.price_aud),
        stock_level: parseInt(formData.stock_level) || 0,
      })
      .eq('id', editingProduct.id)

    if (!error) {
      fetchProducts()
      setEditingProduct(null)
      resetForm()
    }
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      brand: product.brand,
      size: product.size,
      price_aud: product.price_aud.toString(),
      stock_level: product.stock_level.toString(),
    })
  }

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      product.brand.toLowerCase().includes(query) ||
      product.size.toLowerCase().includes(query)
    )
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Products / Inventory</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="e.g. BOTO"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Input
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      placeholder="e.g. 215/60R16"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (AUD)</Label>
                    <Input
                      type="number"
                      value={formData.price_aud}
                      onChange={(e) => setFormData({ ...formData, price_aud: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Level</Label>
                    <Input
                      type="number"
                      value={formData.stock_level}
                      onChange={(e) => setFormData({ ...formData, stock_level: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProduct}>
                  Add Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by brand or size..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Brand</th>
                  <th className="text-left py-3 px-2 font-medium">Size</th>
                  <th className="text-right py-3 px-2 font-medium">Price</th>
                  <th className="text-right py-3 px-2 font-medium">Stock</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="text-left py-3 px-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No products found
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="py-3 px-2">
                        <Badge variant="outline">{product.brand}</Badge>
                      </td>
                      <td className="py-3 px-2 font-medium">{product.size}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(product.price_aud)}</td>
                      <td className="py-3 px-2 text-right">{product.stock_level}</td>
                      <td className="py-3 px-2">
                        {product.stock_level === 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : product.stock_level < 10 ? (
                          <Badge variant="warning">Low Stock</Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <Input
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (AUD)</Label>
                <Input
                  type="number"
                  value={formData.price_aud}
                  onChange={(e) => setFormData({ ...formData, price_aud: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Level</Label>
                <Input
                  type="number"
                  value={formData.stock_level}
                  onChange={(e) => setFormData({ ...formData, stock_level: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProduct}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
