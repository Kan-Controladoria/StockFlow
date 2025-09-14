import { Button } from '@/components/ui/button'
import { LayoutGrid, Package, BarChart3, ArrowUpDown } from 'lucide-react'

interface MobileNavProps {
  currentView: string
  onViewChange: (view: string) => void
}

export function MobileNav({ currentView, onViewChange }: MobileNavProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Mapa', icon: LayoutGrid },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'movements', label: 'Movimento', icon: ArrowUpDown },
  ]

  return (
    <nav className="lg:hidden bg-card border-t border-border px-4 py-2">
      <div className="flex justify-around">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={`flex flex-col items-center py-2 px-3 h-auto ${
                currentView === item.id ? 'text-primary' : 'text-muted-foreground'
              }`}
              onClick={() => onViewChange(item.id)}
              data-testid={`mobile-nav-${item.id}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
