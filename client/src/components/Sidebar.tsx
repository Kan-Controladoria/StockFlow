import { Button } from '@/components/ui/button'
import { LayoutGrid, Package, BarChart3, ArrowUpDown } from 'lucide-react'

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Mapa de Estoque', icon: LayoutGrid },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'movements', label: 'Movimentações', icon: ArrowUpDown },
  ]

  return (
    <aside className="w-64 bg-card border-r border-border hidden lg:block">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant={currentView === item.id ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => onViewChange(item.id)}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}
