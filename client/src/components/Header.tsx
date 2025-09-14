import { useAuth } from '../hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Warehouse, LogOut } from 'lucide-react'

export function Header() {
  const { profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="bg-card border-b border-border px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Warehouse className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Super Kan</h1>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {profile?.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
