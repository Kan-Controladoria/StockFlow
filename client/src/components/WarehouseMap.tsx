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

  // Fetch real compartments from database
  const { data: realCompartments } = useQuery({
    queryKey: ['/api/real-compartments'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('compartments')
          .select('*')
        
        if (error) {
          console.warn('Compartments query error:', error)
          return []
        }
        
        return data || []
      } catch (error) {
        console.warn('Compartments query failed:', error)
        return []
      }
    }
  })

  // Generate static warehouse grid using real IDs when available
  const generateCompartmentsGrid = () => {
    const compartments: CompartmentWithStock[] = []
    
    for (let corredor = 1; corredor <= 5; corredor++) {
      for (const linha of ['A', 'B', 'C']) {
        for (let coluna = 1; coluna <= 10; coluna++) {
          const address = `${corredor}${linha}${coluna}`
          
          // Find real compartment or create placeholder
          const realComp = realCompartments?.find((c: any) => c.address === address)
          
          compartments.push({
            id: (realComp as any)?.id || `placeholder-${address}`,
            address,
            corredor,
            linha,
            coluna,
            created_at: (realComp as any)?.created_at || new Date().toISOString(),
            stock: []
          })
        }
      }
    }
    
    return compartments
  }

  // Fetch stock data separately to populate the static grid
  const { data: stockData } = useQuery({
    queryKey: ['/api/stock'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('stock_by_compartment')
          .select(`
            *,
            compartments(*),
            products(*)
          `)
        
        if (error) {
          console.warn('Stock query error:', error)
          return []
        }
        
        return data || []
      } catch (error) {
        console.warn('Stock query failed:', error)
        return []
      }
    }
  })

  // Combine grid with stock data
  const compartments = generateCompartmentsGrid().map(gridComp => {
    // Find stock for this compartment
    const compStock = stockData?.filter((stock: any) => 
      stock.compartments?.address === gridComp.address
    ) || []
    
    return {
      ...gridComp,
      stock: compStock.map((s: any) => ({
        id: s.id,
        compartment_id: s.compartment_id,
        product_id: s.product_id,
        quantity: s.quantity,
        created_at: s.created_at,
        updated_at: s.updated_at,
        products: s.products
      }))
    }
  })

  const clearFilters = () => {
    setFilters({ corridor: 'all', row: 'all', product: '' })
  }

  const openCompartment = (compartment: CompartmentWithStock) => {
    setSelectedCompartment(compartment)
  }

  const renderCompartmentGrid = (corridor: number) => {
    const rows = ['A', 'B', 'C']
    const columns = Array.from({ length: 10 }, (_, i) => i + 1)
    
    // Filter compartments by corridor (always render all)
    const corridorCompartments = compartments.filter(c => c.corredor === corridor)

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
                  
                  // Always render compartment (static grid)
                  return (
                    <Button
                      key={address}
                      variant="outline"
                      className={`
                        aspect-square p-0 text-xs font-medium compartment-cell transition-colors
                        ${stockCount > 0 
                          ? 'compartment-with-stock bg-green-50 border-green-200 hover:bg-green-100 text-green-800' 
                          : 'hover:bg-muted/50'
                        }
                      `}
                      onClick={() => {
                        // Only allow clicks on real compartments (not placeholders)
                        if (compartment && !compartment.id.startsWith('placeholder-')) {
                          openCompartment(compartment)
                        }
                      }}
                      disabled={!compartment || compartment.id.startsWith('placeholder-')}
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

  // Apply filters to determine which compartments to show
  const filteredCompartments = compartments.filter(comp => {
    // Filter by corridor
    if (filters.corridor !== 'all' && comp.corredor !== parseInt(filters.corridor)) {
      return false
    }
    
    // Filter by row
    if (filters.row !== 'all' && comp.linha !== filters.row) {
      return false
    }
    
    // Filter by product
    if (filters.product.trim()) {
      const hasMatchingProduct = comp.stock.some(s =>
        s.products?.produto.toLowerCase().includes(filters.product.toLowerCase()) ||
        s.products?.codigo_produto.toLowerCase().includes(filters.product.toLowerCase())
      )
      return hasMatchingProduct
    }
    
    return true
  })

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
              
              // If product filter is active, only show corridors that have matching products
              const corridorsWithData = filters.product.trim() 
                ? corridorsToShow.filter(corridor => 
                    filteredCompartments.some(comp => comp.corredor === corridor)
                  )
                : corridorsToShow
              
              if (corridorsWithData.length === 0 && filters.product.trim()) {
                return (
                  <div className="text-center py-12">
                    <MapPin className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum produto encontrado</h3>
                    <p className="mt-2 text-muted-foreground">
                      Não há produtos com "{filters.product}" nos compartimentos
                    </p>
                  </div>
                )
              }
              
              return corridorsWithData.map(corridor => (
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
