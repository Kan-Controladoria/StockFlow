import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryClient, apiRequest } from '@/lib/queryClient'
import { useAuth } from '../hooks/useAuth'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { BarcodeScanner } from './BarcodeScanner'
import type { CompartmentWithStock, Product } from '@shared/schema'
import { QrCode, Package, Loader2 } from 'lucide-react'

interface MovementFormProps {
  type: 'ENTRADA' | 'SAIDA'
  compartment: CompartmentWithStock
  onClose: () => void
  onComplete: () => void
}

export function MovementForm({ type, compartment, onClose, onComplete }: MovementFormProps) {
  const [productCode, setProductCode] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Find product by barcode or product code
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['/api/products/search', productCode],
    queryFn: async () => {
      if (!productCode.trim()) return null
      
      try {
        const response = await fetch(`/api/products/search/${encodeURIComponent(productCode)}`)
        if (response.status === 404) {
          return null // Product not found
        }
        if (!response.ok) {
          throw new Error('Failed to search product')
        }
        return await response.json()
      } catch (error) {
        console.error('Error searching product:', error)
        return null
      }
    },
    enabled: !!productCode.trim(),
  })

  useEffect(() => {
    setSelectedProduct(product || null)
  }, [product])

  const movementMutation = useMutation({
    mutationFn: async (data: { productId: string; quantity: number }) => {
      if (!user) throw new Error('Usuário não autenticado')

      // Create movement (backend handles stock update logic)
      const response = await apiRequest('/api/movements', {
        method: 'POST',
        body: {
          user_id: user.id,
          product_id: data.productId,
          compartment_id: compartment.id,
          tipo: type,
          qty: data.quantity,
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao registrar movimento')
      }
      
      return await response.json()
    },
    onSuccess: () => {
      toast({
        title: `${type === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada`,
        description: `${quantity} unidades de ${selectedProduct?.produto}`,
      })
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/compartments'] })
      queryClient.invalidateQueries({ queryKey: ['/api/stock'] })
      queryClient.invalidateQueries({ queryKey: ['/api/movements'] })
      
      onComplete()
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na operação",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProduct) {
      toast({
        title: "Produto não encontrado",
        description: "Verifique o código informado",
        variant: "destructive",
      })
      return
    }

    if (quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero",
        variant: "destructive",
      })
      return
    }

    movementMutation.mutate({
      productId: selectedProduct.id,
      quantity: quantity,
    })
  }

  const handleCodeScanned = (code: string) => {
    setProductCode(code)
    setShowScanner(false)
  }

  if (showScanner) {
    return (
      <BarcodeScanner
        onClose={() => setShowScanner(false)}
        onCodeScanned={handleCodeScanned}
      />
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'ENTRADA' ? 'Entrada' : 'Saída'} de Produto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="productCode">Produto</Label>
            <div className="flex gap-2">
              <Input
                id="productCode"
                placeholder="Código de barras ou código do produto"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="flex-1"
                data-testid="input-product-code"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScanner(true)}
                data-testid="button-scan-code"
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Product Preview */}
          {isLoadingProduct ? (
            <div className="p-3 bg-muted/25 rounded-md flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm">Procurando produto...</span>
            </div>
          ) : selectedProduct ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="font-medium text-foreground">{selectedProduct.produto}</div>
              <div className="text-sm text-muted-foreground">
                {selectedProduct.departamento} • {selectedProduct.categoria}
              </div>
            </div>
          ) : productCode.trim() ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm text-red-600">Produto não encontrado</div>
            </div>
          ) : null}

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              data-testid="input-quantity"
            />
          </div>

          {/* Compartment Info */}
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
            <div className="text-sm text-primary font-medium">
              Compartimento: {compartment.address}
            </div>
          </div>

          {/* Actions */}
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
              disabled={!selectedProduct || movementMutation.isPending}
              data-testid="button-confirm"
            >
              {movementMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
