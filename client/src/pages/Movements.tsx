import { useState, useEffect, useMemo } from "react";
import { useQuery } from '@tanstack/react-query'
import type { MovementWithDetails, Profile, Compartment, Product, CompartmentWithStock } from '@shared/schema'
import { ProductForm } from '../components/ProductForm'
import { CompartmentModal } from '../components/CompartmentModal'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, ArrowUp, ArrowDown, Package, User, Clock, TrendingUp, TrendingDown, Activity, BarChart3, MapPin, Tag, Layers, Filter, Eye } from 'lucide-react'

interface MovementFilters {
  startDate: string
  endDate: string
  type: string
  product: string
  quantityMin: string
  quantityMax: string
  user: string
  compartment: string
  category: string
  subcategory: string
}

interface MovementsSummary {
  totalEntries: number
  totalExits: number
  netMovement: number
  topProducts: Array<{ name: string; total: number; entries: number; exits: number }>
  topCompartments: Array<{ address: string; total: number; entries: number; exits: number }>
}

interface MovementsPageProps {
  onProductClick?: (productId: string, productName: string) => void
  onCompartmentClick?: (compartmentId: string, compartmentAddress: string) => void
}

export function Movements({ onProductClick, onCompartmentClick }: MovementsPageProps = {}) {
  const [filters, setFilters] = useState<MovementFilters>({
    startDate: '',
    endDate: '',
    type: 'all',
    product: '',
    quantityMin: '',
    quantityMax: '',
    user: 'all',
    compartment: 'all',
    category: 'all',
    subcategory: 'all'
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // Modal state management
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string | null>(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCompartmentModal, setShowCompartmentModal] = useState(false)

  // Fetch dropdown options
  const { data: users } = useQuery<Profile[]>({
    queryKey: ['/api/profiles'],
    queryFn: async () => {
      const response = await fetch('/api/profiles')
      if (!response.ok) throw new Error('Failed to fetch profiles')
      return await response.json()
    }
  })

  const { data: compartments } = useQuery<Compartment[]>({
    queryKey: ['/api/compartments'],
    queryFn: async () => {
      const response = await fetch('/api/compartments')
      if (!response.ok) throw new Error('Failed to fetch compartments')
      return await response.json()
    }
  })

  const { data: categories } = useQuery<string[]>({
    queryKey: ['/api/products/categories'],
    queryFn: async () => {
      const response = await fetch('/api/products/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      return await response.json()
    }
  })

  const { data: subcategories } = useQuery<string[]>({
    queryKey: ['/api/products/subcategories', filters.category],
    queryFn: async () => {
      const url = filters.category && filters.category !== 'all' 
        ? `/api/products/subcategories?category=${encodeURIComponent(filters.category)}`
        : '/api/products/subcategories'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch subcategories')
      return await response.json()
    }
  })

  // Query for selected product data
  const { data: selectedProduct } = useQuery({
    queryKey: ['/api/products', selectedProductId],
    queryFn: async (): Promise<Product | null> => {
      if (!selectedProductId) return null
      const response = await fetch(`/api/products/${selectedProductId}`)
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch product')
      }
      return await response.json()
    },
    enabled: !!selectedProductId
  })

  // Query for selected compartment data with stock
  const { data: selectedCompartment } = useQuery({
    queryKey: ['/api/compartments', selectedCompartmentId],
    queryFn: async (): Promise<CompartmentWithStock | null> => {
      if (!selectedCompartmentId) return null
      const response = await fetch(`/api/compartments/${selectedCompartmentId}`)
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch compartment')
      }
      return await response.json()
    },
    enabled: !!selectedCompartmentId
  })

  const { data: movements, isLoading } = useQuery<MovementWithDetails[]>({
    queryKey: ['/api/movements', filters],
    queryFn: async () => {
      // Build query parameters for backend
      const params = new URLSearchParams()

      if (filters.startDate) {
        params.append('startDate', filters.startDate)
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999)
        params.append('endDate', endDate.toISOString())
      }
      if (filters.type && filters.type !== 'all') {
        params.append('type', filters.type)
      }
      if (filters.user && filters.user !== 'all') {
        params.append('userId', filters.user)
      }
      if (filters.compartment && filters.compartment !== 'all') {
        params.append('compartmentId', filters.compartment)
      }

      const url = `/api/movements${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch movements')

      let data = await response.json()

      // Apply client-side filters
      let filteredData = data || []
      
      // Product filter
      if (filters.product.trim()) {
        filteredData = filteredData.filter((movement: any) =>
          movement.products?.produto.toLowerCase().includes(filters.product.toLowerCase()) ||
          movement.products?.codigo_produto.toLowerCase().includes(filters.product.toLowerCase())
        )
      }
      
      // Category filter
      if (filters.category && filters.category !== 'all') {
        filteredData = filteredData.filter((movement: any) =>
          movement.products?.categoria === filters.category
        )
      }
      
      // Subcategory filter
      if (filters.subcategory && filters.subcategory !== 'all') {
        filteredData = filteredData.filter((movement: any) =>
          movement.products?.subcategoria === filters.subcategory
        )
      }
      
      // Quantity filters
      if (filters.quantityMin) {
        const min = parseInt(filters.quantityMin)
        filteredData = filteredData.filter((movement: any) => movement.qty >= min)
      }
      if (filters.quantityMax) {
        const max = parseInt(filters.quantityMax)
        filteredData = filteredData.filter((movement: any) => movement.qty <= max)
      }

      return filteredData
    }
  })

  // Calculate summary data
  const summary: MovementsSummary = useMemo(() => {
    if (!movements) {
      return {
        totalEntries: 0,
        totalExits: 0,
        netMovement: 0,
        topProducts: [],
        topCompartments: []
      }
    }

    const entries = movements.filter(m => m.tipo === 'ENTRADA')
    const exits = movements.filter(m => m.tipo === 'SAIDA')
    
    const totalEntries = entries.reduce((sum, m) => sum + m.qty, 0)
    const totalExits = exits.reduce((sum, m) => sum + m.qty, 0)
    
    // Top products by total movement
    const productStats = new Map()
    movements.forEach(movement => {
      const productName = movement.products?.produto || 'Produto desconhecido'
      const existing = productStats.get(productName) || { total: 0, entries: 0, exits: 0 }
      
      if (movement.tipo === 'ENTRADA') {
        existing.entries += movement.qty
      } else {
        existing.exits += movement.qty
      }
      existing.total += movement.qty
      
      productStats.set(productName, existing)
    })
    
    const topProducts = Array.from(productStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
    
    // Top compartments by total movement
    const compartmentStats = new Map()
    movements.forEach(movement => {
      const address = movement.compartments?.address || 'N/A'
      const existing = compartmentStats.get(address) || { total: 0, entries: 0, exits: 0 }
      
      if (movement.tipo === 'ENTRADA') {
        existing.entries += movement.qty
      } else {
        existing.exits += movement.qty
      }
      existing.total += movement.qty
      
      compartmentStats.set(address, existing)
    })
    
    const topCompartments = Array.from(compartmentStats.entries())
      .map(([address, stats]) => ({ address, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
    
    return {
      totalEntries,
      totalExits,
      netMovement: totalEntries - totalExits,
      topProducts,
      topCompartments
    }
  }, [movements])

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Click handlers for opening modals
  const handleProductClick = (productId: string, productName: string) => {
    setSelectedProductId(productId)
    setShowProductModal(true)
    // Also call the optional external handler if provided
    onProductClick?.(productId, productName)
  }

  const handleCompartmentClick = (compartmentId: string, compartmentAddress: string) => {
    setSelectedCompartmentId(compartmentId)
    setShowCompartmentModal(true)
    // Also call the optional external handler if provided
    onCompartmentClick?.(compartmentId, compartmentAddress)
  }

  // Modal close handlers
  const handleCloseProductModal = () => {
    setShowProductModal(false)
    setSelectedProductId(null)
  }

  const handleCloseCompartmentModal = () => {
    setShowCompartmentModal(false)
    setSelectedCompartmentId(null)
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Movimentações de Estoque</h2>
        <p className="text-muted-foreground mt-1">
          Histórico de entradas e saídas de produtos
        </p>
      </div>

      {/* Summary Cards */}
      {!isLoading && movements && movements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Movements Summary */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center">
                <Activity className="mr-2 h-4 w-4" />
                Resumo de Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <TrendingUp className="mr-1 h-4 w-4" />
                  <span className="text-sm font-medium">Entradas</span>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="text-total-entries">
                  +{summary.totalEntries}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-red-600 dark:text-red-400">
                  <TrendingDown className="mr-1 h-4 w-4" />
                  <span className="text-sm font-medium">Saídas</span>
                </div>
                <span className="text-lg font-bold text-red-600 dark:text-red-400" data-testid="text-total-exits">
                  -{summary.totalExits}
                </span>
              </div>
              <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Saldo</span>
                  <span className={`text-lg font-bold ${
                    summary.netMovement >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`} data-testid="text-net-movement">
                    {summary.netMovement >= 0 ? '+' : ''}{summary.netMovement}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center">
                <BarChart3 className="mr-2 h-4 w-4" />
                Top Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summary.topProducts.slice(0, 3).map((product, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="truncate max-w-[120px] font-medium text-green-700 dark:text-green-300" title={product.name}>
                      {product.name}
                    </span>
                    <span className="font-bold text-green-600 dark:text-green-400" data-testid={`text-top-product-${index}`}>
                      {product.total}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Compartments */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                Top Compartimentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {summary.topCompartments.slice(0, 3).map((compartment, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="font-mono font-medium text-purple-700 dark:text-purple-300">
                      {compartment.address}
                    </span>
                    <span className="font-bold text-purple-600 dark:text-purple-400" data-testid={`text-top-compartment-${index}`}>
                      {compartment.total}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filtros
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              data-testid="button-toggle-advanced-filters"
            >
              <Eye className="mr-2 h-4 w-4" />
              {showAdvancedFilters ? 'Ocultar' : 'Avançados'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                data-testid="input-start-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                data-testid="input-end-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={filters.type} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger data-testid="select-movement-type">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ENTRADA">Entrada</SelectItem>
                  <SelectItem value="SAIDA">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Produto</Label>
              <Input
                id="product"
                placeholder="Nome ou código do produto"
                value={filters.product}
                onChange={(e) => setFilters(prev => ({ ...prev, product: e.target.value }))}
                data-testid="input-product-filter"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantityMin">Qtd. Mínima</Label>
                  <Input
                    id="quantityMin"
                    type="number"
                    placeholder="Min"
                    value={filters.quantityMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, quantityMin: e.target.value }))}
                    data-testid="input-quantity-min"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantityMax">Qtd. Máxima</Label>
                  <Input
                    id="quantityMax"
                    type="number"
                    placeholder="Max"
                    value={filters.quantityMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, quantityMax: e.target.value }))}
                    data-testid="input-quantity-max"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select 
                    value={filters.user} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, user: value }))}
                  >
                    <SelectTrigger data-testid="select-user-filter">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Compartimento</Label>
                  <Select 
                    value={filters.compartment} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, compartment: value }))}
                  >
                    <SelectTrigger data-testid="select-compartment-filter">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {compartments?.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id}>{comp.address}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select 
                    value={filters.category} 
                    onValueChange={(value) => {
                      setFilters(prev => ({ ...prev, category: value, subcategory: 'all' }))
                    }}
                  >
                    <SelectTrigger data-testid="select-category-filter">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subcategoria</Label>
                  <Select 
                    value={filters.subcategory} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, subcategory: value }))}
                    disabled={filters.category === 'all'}
                  >
                    <SelectTrigger data-testid="select-subcategory-filter">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {subcategories?.map((subcategory) => (
                        <SelectItem key={subcategory} value={subcategory}>{subcategory}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Histórico de Movimentações ({movements?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded-md"></div>
                </div>
              ))}
            </div>
          ) : !movements || movements.length === 0 ? (
            <div className="text-center py-12">
              <ArrowUpDown className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Nenhuma movimentação encontrada</h3>
              <p className="mt-2 text-muted-foreground">
                Ajuste os filtros para visualizar as movimentações
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {movements.map((movement: any) => (
                <div
                  key={movement.id}
                  className="flex items-start justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted/25 hover:shadow-md transition-all duration-200 hover:border-primary/20"
                  data-testid={`movement-card-${movement.id}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center shadow-sm
                      ${movement.tipo === 'ENTRADA' 
                        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 border-2 border-green-200 dark:border-green-700' 
                        : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-700'
                      }
                    `}>
                      {movement.tipo === 'ENTRADA' ? (
                        <ArrowUp className="h-6 w-6" />
                      ) : (
                        <ArrowDown className="h-6 w-6" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <button
                          className="font-medium text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                          onClick={() => handleProductClick(movement.product_id, movement.products?.produto || '')}
                          data-testid={`button-product-${movement.id}`}
                        >
                          {movement.products?.produto || 'Produto não encontrado'}
                        </button>
                        <Badge variant={movement.tipo === 'ENTRADA' ? 'default' : 'secondary'} className="shrink-0">
                          {movement.tipo}
                        </Badge>
                      </div>

                      {/* Product Category/Subcategory */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          <Tag className="mr-1 h-3 w-3" />
                          {movement.products?.categoria || 'N/A'}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          <Layers className="mr-1 h-3 w-3" />
                          {movement.products?.subcategoria || 'N/A'}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Package className="mr-1 h-3 w-3" />
                          <span className="truncate">{movement.products?.codigo_produto || 'N/A'}</span>
                        </div>
                        <div className="flex items-center">
                          <User className="mr-1 h-3 w-3" />
                          <span className="truncate">{movement.profiles?.email || 'Usuário desconhecido'}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          <span className="truncate">{formatDateTime(movement.timestamp)}</span>
                        </div>
                      </div>

                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Compartimento:</span>{' '}
                        <button
                          className="font-mono font-medium text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                          onClick={() => handleCompartmentClick(movement.compartment_id, movement.compartments?.address || '')}
                          data-testid={`button-compartment-${movement.id}`}
                        >
                          {movement.compartments?.address || 'N/A'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`
                      text-xl font-bold
                      ${movement.tipo === 'ENTRADA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                    `} data-testid={`text-quantity-${movement.id}`}>
                      {movement.tipo === 'ENTRADA' ? '+' : '-'}{movement.qty}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">unidades</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Modal */}
      {showProductModal && selectedProduct && (
        <ProductForm
          product={selectedProduct}
          onClose={handleCloseProductModal}
        />
      )}

      {/* Compartment Modal */}
      {showCompartmentModal && selectedCompartment && (
        <CompartmentModal
          compartment={selectedCompartment}
          onClose={handleCloseCompartmentModal}
        />
      )}
    </div>
  )
}
