import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { BarChart3, Download, Package, MapPin, TrendingUp } from 'lucide-react'

interface ReportFilters {
  startDate: string
  endDate: string
  corridor: string
  department: string
}

export function Reports() {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    corridor: '',
    department: ''
  })

  // Get summary statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/reports/stats'],
    queryFn: async () => {
      // Get total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      // Get compartments with stock
      const { data: stockData } = await supabase
        .from('stock_by_compartment')
        .select('compartment_id')
      
      const compartmentsWithStock = new Set(stockData?.map(s => s.compartment_id)).size

      // Get monthly movements
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { count: monthlyMovements } = await supabase
        .from('movements')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', thirtyDaysAgo.toISOString())

      return {
        totalProducts: totalProducts || 0,
        compartmentsWithStock,
        monthlyMovements: monthlyMovements || 0
      }
    }
  })

  // Get departments for filter
  const { data: departments } = useQuery({
    queryKey: ['/api/products/departments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('departamento')
        .order('departamento')
      
      const uniqueDepts = Array.from(new Set(data?.map(p => p.departamento))).filter(Boolean)
      return uniqueDepts
    }
  })

  // Get stock report data
  const { data: stockReport, isLoading: isLoadingReport } = useQuery({
    queryKey: ['/api/reports/stock', filters],
    queryFn: async () => {
      let query = supabase
        .from('stock_by_compartment')
        .select(`
          *,
          compartments(*),
          products(*)
        `)

      const { data, error } = await query
      if (error) throw error

      // Filter by corridor and department on client side for simplicity
      let filteredData = data || []
      
      if (filters.corridor) {
        filteredData = filteredData.filter(item => 
          item.compartments.corredor === parseInt(filters.corridor)
        )
      }

      if (filters.department) {
        filteredData = filteredData.filter(item => 
          item.products.departamento === filters.department
        )
      }

      return filteredData
    }
  })

  const exportToCSV = () => {
    if (!stockReport) return

    const csvHeader = 'Compartimento,Corredor,Linha,Coluna,Produto,Código,Departamento,Categoria,Quantidade\n'
    const csvData = stockReport.map(item => 
      [
        item.compartments.address,
        item.compartments.corredor,
        item.compartments.linha,
        item.compartments.coluna,
        item.products.produto,
        item.products.codigo_produto,
        item.products.departamento,
        item.products.categoria,
        item.quantity
      ].join(',')
    ).join('\n')

    const csvContent = csvHeader + csvData
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `relatorio-estoque-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const generateReport = () => {
    // Trigger refetch with current filters
    // This is handled automatically by the query key dependency
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Relatórios de Estoque</h2>
        <p className="text-muted-foreground mt-1">
          Análise e relatórios detalhados do estoque aéreo
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <Label>Corredor</Label>
              <Select 
                value={filters.corridor} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, corridor: value }))}
              >
                <SelectTrigger data-testid="select-corridor">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {[1, 2, 3, 4, 5].map(c => (
                    <SelectItem key={c} value={c.toString()}>Corredor {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select 
                value={filters.department} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {departments?.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                className="w-full"
                onClick={generateReport}
                data-testid="button-generate-report"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produtos Cadastrados</p>
                <p className="text-2xl font-bold text-primary">{stats?.totalProducts || 0}</p>
              </div>
              <Package className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compartimentos com Estoque</p>
                <p className="text-2xl font-bold text-green-600">{stats?.compartmentsWithStock || 0}</p>
              </div>
              <MapPin className="h-8 w-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Movimentações (30 dias)</p>
                <p className="text-2xl font-bold text-amber-600">{stats?.monthlyMovements || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Relatório de Estoque Atual</CardTitle>
            <Button 
              variant="secondary"
              onClick={exportToCSV}
              disabled={!stockReport || stockReport.length === 0}
              data-testid="button-export-csv"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingReport ? (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mx-auto mb-4"></div>
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-3 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          ) : !stockReport || stockReport.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum dado encontrado</h3>
              <p className="mt-2 text-muted-foreground">
                Ajuste os filtros para visualizar os dados do estoque
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {stockReport.length} registros de estoque
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Compartimento</th>
                      <th className="text-left p-2 font-medium">Produto</th>
                      <th className="text-left p-2 font-medium">Departamento</th>
                      <th className="text-right p-2 font-medium">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockReport.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/25">
                        <td className="p-2 font-mono text-sm">{item.compartments.address}</td>
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{item.products.produto}</div>
                            <div className="text-sm text-muted-foreground">{item.products.codigo_produto}</div>
                          </div>
                        </td>
                        <td className="p-2 text-sm">{item.products.departamento}</td>
                        <td className="p-2 text-right font-medium">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
