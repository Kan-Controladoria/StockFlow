import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ArrowUpDown, ArrowUp, ArrowDown, Package, User, Clock } from 'lucide-react'

interface MovementFilters {
  startDate: string
  endDate: string
  type: string
  product: string
}

export function Movements() {
  const [filters, setFilters] = useState<MovementFilters>({
    startDate: '',
    endDate: '',
    type: 'all',
    product: ''
  })

  const { data: movements, isLoading } = useQuery({
    queryKey: ['/api/movements', filters],
    queryFn: async () => {
      let query = supabase
        .from('movements')
        .select(`
          *,
          products(*),
          compartments(*),
          profiles(email)
        `)
        .order('timestamp', { ascending: false })

      // Apply date filters
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate)
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('timestamp', endDate.toISOString())
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('tipo', filters.type)
      }

      const { data, error } = await query.limit(100) // Limit for performance
      if (error) throw error

      // Filter by product name on client side for simplicity
      let filteredData = data || []
      if (filters.product.trim()) {
        filteredData = filteredData.filter((movement: any) =>
          movement.products?.produto.toLowerCase().includes(filters.product.toLowerCase()) ||
          movement.products?.codigo_produto.toLowerCase().includes(filters.product.toLowerCase())
        )
      }

      return filteredData
    }
  })

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Movimentações de Estoque</h2>
        <p className="text-muted-foreground mt-1">
          Histórico de entradas e saídas de produtos
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowUpDown className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-muted/25 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${movement.tipo === 'ENTRADA' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
                    `}>
                      {movement.tipo === 'ENTRADA' ? (
                        <ArrowUp className="h-5 w-5" />
                      ) : (
                        <ArrowDown className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-foreground">
                          {movement.products?.produto || 'Produto não encontrado'}
                        </h4>
                        <Badge variant={movement.tipo === 'ENTRADA' ? 'default' : 'secondary'}>
                          {movement.tipo}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Package className="mr-1 h-3 w-3" />
                          {movement.products?.codigo_produto || 'N/A'}
                        </div>
                        <div className="flex items-center">
                          <User className="mr-1 h-3 w-3" />
                          {movement.profiles?.email || 'Usuário desconhecido'}
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatDateTime(movement.timestamp)}
                        </div>
                      </div>

                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Compartimento:</span>{' '}
                        <span className="font-mono font-medium">
                          {movement.compartments?.address || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`
                      text-lg font-bold
                      ${movement.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}
                    `}>
                      {movement.tipo === 'ENTRADA' ? '+' : '-'}{movement.qty}
                    </div>
                    <div className="text-xs text-muted-foreground">unidades</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
