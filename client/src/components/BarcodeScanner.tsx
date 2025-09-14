import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Camera, CameraOff } from 'lucide-react'

interface BarcodeScannerProps {
  onClose: () => void
  onCodeScanned: (code: string) => void
}

export function BarcodeScanner({ onClose, onCodeScanned }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    return () => {
      // Cleanup camera stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Try to use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      setStream(mediaStream)
      setIsScanning(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast({
        title: "Erro de câmera",
        description: "Não foi possível acessar a câmera. Digite o código manualmente.",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsScanning(false)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      onCodeScanned(manualCode.trim())
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Escaneamento de Código</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Preview */}
          <div className="relative aspect-video bg-black rounded-md overflow-hidden">
            {isScanning ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-16 border-2 border-green-500 rounded-md animate-pulse"></div>
                </div>
                
                <Button
                  className="absolute top-2 right-2"
                  variant="secondary"
                  size="sm"
                  onClick={stopCamera}
                  data-testid="button-stop-camera"
                >
                  <CameraOff className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white">
                <Camera className="h-12 w-12 opacity-50 mb-4" />
                <p className="text-sm opacity-75 mb-4 text-center px-4">
                  Clique no botão abaixo para ativar a câmera
                </p>
                <Button onClick={startCamera} data-testid="button-start-camera">
                  <Camera className="mr-2 h-4 w-4" />
                  Ativar Câmera
                </Button>
              </div>
            )}
          </div>

          {/* Manual Input */}
          <div className="space-y-3">
            <div className="text-center text-sm text-muted-foreground">
              ou digite manualmente
            </div>
            
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <Input
                placeholder="Digite o código de barras"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                data-testid="input-manual-code"
              />
              
              <div className="flex gap-2">
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
                  disabled={!manualCode.trim()}
                  data-testid="button-confirm-code"
                >
                  Confirmar
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
