import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/queryClient'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import type { Product } from '@shared/schema'
import { Loader2 } from 'lucide-react'

interface ProductFormProps {
  product?: Product | null
  onClose: () => void
}

export function ProductForm({ product, onClose }: ProductFormProps) {
  const [formData, setFormData] = useState({
    codigo_barras: '',
    codigo_produto: '',
    produto: '',
    departamento: '',
    categoria: '',
    subcategoria: '',
  })
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (product) {
      setFormData({
        codigo_barras: product.codigo_barras,
        codigo_produto: product.codigo_produto,
        produto: product.produto,
        departamento: product.departamento,
        categoria: product.categoria,
        subcategoria: product.subcategoria,
      })
    }
  }, [product])

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (product && product.id) {
        // Update existing product
        const response = await apiRequest(`/api/products/${product.id}`, {
          method: 'PUT',
          body: data
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update product')
        }
        
        return await response.json()
      } else {
        // Create new product
        const response = await apiRequest('/api/products', {
          method: 'POST',
          body: data
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create product')
        }
        
        return await response.json()
      }
    },
    onSuccess: () => {
      toast({
        title: product ? "Produto atualizado" : "Produto criado",
        description: `${formData.produto} foi ${product ? 'atualizado' : 'criado'} com sucesso.`,
      })
      
      queryClient.invalidateQueries({ queryKey: ['/api/products'] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Mutation error:', error)
      const message = error.message?.includes('duplicate key') 
        ? 'Código de barras ou código do produto já existe'
        : `Erro ao salvar produto: ${error.message || 'Erro desconhecido'}`
      
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const requiredFields = ['codigo_barras', 'codigo_produto', 'produto', 'departamento', 'categoria', 'subcategoria']
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData].trim())
    
    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }
    
    mutation.mutate(formData)
  }

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar' : 'Adicionar'} Produto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[75vh] pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo_barras">Código de Barras *</Label>
              <Input
                id="codigo_barras"
                placeholder="7891000053508"
                value={formData.codigo_barras}
                onChange={handleChange('codigo_barras')}
                required
                data-testid="input-barcode"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo_produto">Código do Produto *</Label>
              <Input
                id="codigo_produto"
                placeholder="COCA001"
                value={formData.codigo_produto}
                onChange={handleChange('codigo_produto')}
                required
                data-testid="input-product-code"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="produto">Nome do Produto *</Label>
            <Input
              id="produto"
              placeholder="Coca-Cola 350ml"
              value={formData.produto}
              onChange={handleChange('produto')}
              required
              data-testid="input-product-name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departamento">Departamento *</Label>
              <Input
                id="departamento"
                placeholder="Bebidas"
                value={formData.departamento}
                onChange={handleChange('departamento')}
                required
                data-testid="input-department"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Input
                id="categoria"
                placeholder="Refrigerantes"
                value={formData.categoria}
                onChange={handleChange('categoria')}
                required
                data-testid="input-category"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategoria">Subcategoria *</Label>
              <Input
                id="subcategoria"
                placeholder="Cola"
                value={formData.subcategoria}
                onChange={handleChange('subcategoria')}
                required
                data-testid="input-subcategory"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              className="flex-1"
              disabled={mutation.isPending}
              data-testid="button-save"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
