import { useState } from 'react'
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "./lib/queryClient"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/LoginForm'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { MobileNav } from './components/MobileNav'
import { Dashboard } from './pages/Dashboard'
import { Products } from './pages/Products'
import { Reports } from './pages/Reports'
import { Movements } from './pages/Movements'

function AppContent() {
  const { user, loading } = useAuth()
  const [currentView, setCurrentView] = useState('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'products':
        return <Products />
      case 'reports':
        return <Reports />
      case 'movements':
        return <Movements />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        
        <main className="flex-1 overflow-auto">
          {renderCurrentView()}
        </main>
      </div>

      <MobileNav currentView={currentView} onViewChange={setCurrentView} />
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
