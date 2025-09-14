import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MovementForm } from './MovementForm'
import type { CompartmentWithStock } from '../types/database'
import { Plus, Minus, Package } from 'lucide-react'

interface CompartmentModalProps {
  compartment: CompartmentWithStock
  onClose: () => void
}

export function CompartmentModal({ compartment, onClose }: CompartmentModalProps) {
  const [showMovementForm, setShowMovementForm] = useState<'ENTRADA' | 'SAIDA' | null>(null)

  const handleMovementComplete = () => {
    setShowMovementForm(null)
    onClose()
  }

  if (showMovementForm) {
    return (
      <MovementForm
        type={showMovementForm}
        compartment={compartment}
        onClose={() => setShowMovementForm(null)}
        onComplete={handleMovementComplete}
      />
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Compartimento {compartment.address}
          </DialogTitle>
          <DialogDescription>
            Corredor {compartment.corredor}, Linha {compartment.linha}, Coluna {compartment.coluna}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] space-y-6">
          {/* Stock List */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center">
              <Package className="mr-2 h-4 w-4" />
              Produtos no Compartimento
            </h4>
            
            {compartment.stock.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 opacity-20 mb-2" />
                <p>Nenhum produto neste compartimento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {compartment.stock.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/25 rounded-md"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {item.products.produto}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.products.codigo_produto} • {item.products.departamento}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground">
                        {item.quantity} unidades
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Atualizado em {new Date(item.updated_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => setShowMovementForm('ENTRADA')}
              data-testid="button-entry"
            >
              <Plus className="mr-2 h-4 w-4" />
              Entrada
            </Button>

            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={() => setShowMovementForm('SAIDA')}
              data-testid="button-exit"
            >
              <Minus className="mr-2 h-4 w-4" />
              Saída
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
