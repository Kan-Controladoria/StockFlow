import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ProductForm } from '../components/ProductForm'
import type { Product } from '@shared/schema'
import { Plus, FileUp, Edit, Trash2, Loader2, Package } from 'lucide-react'

export function Products() {
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/products', searchTerm],
    queryFn: async () => {
      const url = searchTerm.trim() 
        ? `/api/products?search=${encodeURIComponent(searchTerm)}`
        : '/api/products'
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch products')
      return await response.json()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/products/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete product')
      }
    },
    onSuccess: () => {
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso.",
      })
      queryClient.invalidateQueries({ queryKey: ['/api/products'] })
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message.includes('foreign key') 
          ? "Não é possível excluir um produto com movimentações."
          : "Erro interno. Tente novamente.",
        variant: "destructive",
      })
    },
  })

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDelete = async (product: Product) => {
    if (window.confirm(`Tem certeza que deseja excluir "${product.produto}"?`)) {
      deleteMutation.mutate(product.id)
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingProduct(null)
  }

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string
        const lines = csv.split('\n').filter(line => line.trim())
        const header = lines[0].toLowerCase()
        
        // Validate CSV header
        const requiredColumns = ['codigo_barras', 'codigo_produto', 'produto', 'departamento', 'categoria', 'subcategoria']
        const hasValidHeader = requiredColumns.every(col => header.includes(col))
        
        if (!hasValidHeader) {
          throw new Error('Formato de CSV inválido. Verifique o cabeçalho.')
        }

        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          return {
            codigo_barras: values[0],
            codigo_produto: values[1], 
            produto: values[2],
            departamento: values[3],
            categoria: values[4],
            subcategoria: values[5],
          }
        }).filter(item => item.codigo_barras && item.produto)

        if (data.length === 0) {
          throw new Error('Nenhum produto válido encontrado no arquivo.')
        }

        // Import products - create each product individually
        let successCount = 0
        for (const product of data) {
          try {
            const response = await apiRequest('/api/products', {
              method: 'POST',
              body: product
            })
            if (response.ok) {
              successCount++
            }
          } catch (error) {
            // Continue with next product if one fails
            console.warn('Failed to import product:', product, error)
          }
        }
        
        if (successCount === 0) {
          throw new Error('Nenhum produto foi importado com sucesso.')
        }

        toast({
          title: "Importação concluída",
          description: `${successCount} de ${data.length} produtos importados com sucesso.`,
        })

        queryClient.invalidateQueries({ queryKey: ['/api/products'] })
        setShowImport(false)
      } catch (error: any) {
        toast({
          title: "Erro na importação",
          description: error.message,
          variant: "destructive",
        })
      }
    }
    
    reader.readAsText(file)
    event.target.value = '' // Reset input
  }

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Produtos</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie o catálogo de produtos do supermercado
          </p>
        </div>
        
        <div className="flex gap-2 mt-4 lg:mt-0">
          <Button 
            onClick={() => setShowForm(true)}
            data-testid="button-add-product"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid="input-csv-file"
            />
            <Button variant="secondary">
              <FileUp className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <Input
            placeholder="Buscar produtos por nome, código de barras ou código do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
            data-testid="input-search-products"
          />
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos ({products?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!products || products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum produto encontrado</h3>
              <p className="mt-2 text-muted-foreground">
                {searchTerm ? 'Tente uma busca diferente' : 'Comece adicionando um novo produto'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código de Barras</TableHead>
                    <TableHead>Código Produto</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">
                        {product.codigo_barras}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {product.codigo_produto}
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.produto}
                      </TableCell>
                      <TableCell>{product.departamento}</TableCell>
                      <TableCell>{product.categoria}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            data-testid={`button-edit-${product.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${product.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleCloseForm}
        />
      )}
    </div>
  )
}
