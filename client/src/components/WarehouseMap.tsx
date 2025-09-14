import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CompartmentModal } from './CompartmentModal'
import { BarcodeScanner } from './BarcodeScanner'
import type { CompartmentWithStock } from '../types/database'
import { QrCode, X, MapPin } from 'lucide-react'

interface Filters {
  corridor: string
  row: string
  product: string
}

export function WarehouseMap() {
  const [selectedCompartment, setSelectedCompartment] = useState<CompartmentWithStock | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    corridor: 'all',
    row: 'all',
    product: ''
  })

  // Fetch compartments with stock information
  const { data: compartments, isLoading } = useQuery({
    queryKey: ['/api/compartments', filters],
    queryFn: async () => {
      let query = supabase
        .from('compartments')
        .select(`
          *,
          stock:stock_by_compartment(
            *,
            products(*)
          )
        `)

      if (filters.corridor && filters.corridor !== 'all') {
        query = query.eq('corredor', parseInt(filters.corridor))
      }
      
      if (filters.row && filters.row !== 'all') {
        query = query.eq('linha', filters.row)
      }

      const { data, error } = await query.order('address')
      
      if (error) throw error
      
      let filteredData = data as CompartmentWithStock[]

      // Filter by product if specified
      if (filters.product) {
        filteredData = filteredData.filter(comp =>
          comp.stock.some(s =>
            s.products.produto.toLowerCase().includes(filters.product.toLowerCase()) ||
            s.products.codigo_produto.toLowerCase().includes(filters.product.toLowerCase())
          )
        )
      }

      return filteredData
    }
  })

  const clearFilters = () => {
    setFilters({ corridor: 'all', row: 'all', product: '' })
  }

  const openCompartment = (compartment: CompartmentWithStock) => {
    setSelectedCompartment(compartment)
  }

  const renderCompartmentGrid = (corridor: number) => {
    const corridorCompartments = compartments?.filter(c => c.corredor === corridor) || []
    const rows = ['A', 'B', 'C']
    const columns = Array.from({ length: 10 }, (_, i) => i + 1)

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-foreground flex items-center">
          <MapPin className="mr-2 text-primary" />
          Corredor {corridor}
        </h3>
        
        <div className="space-y-4">
          {rows.map(row => (
            <div key={row} className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Linha {row}</div>
              <div className="grid grid-cols-10 gap-2">
                {columns.map(column => {
                  const address = `${corridor}${row}${column}`
                  const compartment = corridorCompartments.find(c => c.address === address)
                  const stockCount = compartment?.stock.reduce((sum, s) => sum + s.quantity, 0) || 0
                  
                  // Only render if compartment exists (should always exist since all 150 are in DB)
                  if (!compartment) {
                    console.warn(`Compartment ${address} not found in query results`)
                    return null
                  }
                  
                  return (
                    <Button
                      key={address}
                      variant="outline"
                      className={`
                        aspect-square p-0 text-xs font-medium compartment-cell
                        ${stockCount > 0 ? 'compartment-with-stock bg-green-50 border-green-200 hover:bg-green-100' : ''}
                      `}
                      onClick={() => openCompartment(compartment)}
                      data-stock-count={stockCount > 0 ? stockCount : ''}
                      data-testid={`compartment-${address}`}
                    >
                      {address}
                    </Button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="grid grid-cols-10 gap-2">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select 
                value={filters.corridor} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, corridor: value }))}
              >
                <SelectTrigger className="w-full sm:w-48" data-testid="select-corridor">
                  <SelectValue placeholder="Todos os Corredores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Corredores</SelectItem>
                  {[1, 2, 3, 4, 5].map(c => (
                    <SelectItem key={c} value={c.toString()}>Corredor {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.row} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, row: value }))}
              >
                <SelectTrigger className="w-full sm:w-32" data-testid="select-row">
                  <SelectValue placeholder="Todas as Linhas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Linhas</SelectItem>
                  {['A', 'B', 'C'].map(r => (
                    <SelectItem key={r} value={r}>Linha {r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Buscar produto..."
                value={filters.product}
                onChange={(e) => setFilters(prev => ({ ...prev, product: e.target.value }))}
                className="min-w-[200px]"
                data-testid="input-search-product"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => setShowScanner(true)}
                data-testid="button-open-scanner"
              >
                <QrCode className="mr-2 h-4 w-4" />
                Escanear
              </Button>
              
              <Button 
                variant="secondary" 
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warehouse Map */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa do Estoque Aéreo</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-8">
            {(() => {
              // Determine which corridors to show based on filter
              const corridorsToShow = filters.corridor === 'all' 
                ? [1, 2, 3, 4, 5] 
                : [parseInt(filters.corridor)]
              
              return corridorsToShow.map(corridor => (
                <div key={corridor}>
                  {renderCompartmentGrid(corridor)}
                </div>
              ))
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedCompartment && (
        <CompartmentModal
          compartment={selectedCompartment}
          onClose={() => setSelectedCompartment(null)}
        />
      )}

      {showScanner && (
        <BarcodeScanner
          onClose={() => setShowScanner(false)}
          onCodeScanned={(code: string) => {
            setFilters(prev => ({ ...prev, product: code }))
            setShowScanner(false)
          }}
        />
      )}
    </div>
  )
}
