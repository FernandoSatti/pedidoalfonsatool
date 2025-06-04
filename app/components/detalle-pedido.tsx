"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Clock, CheckCircle, Trash2, Calendar, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import type { Pedido } from "../page"

interface DetallePedidoProps {
  pedido: Pedido
  onVolver: () => void
  onCambiarEstado: (id: string, estado: "transito" | "completado") => void
  onEliminar: (id: string) => void
}

export function DetallePedido({ pedido, onVolver, onCambiarEstado, onEliminar }: DetallePedidoProps) {
  const [animando, setAnimando] = useState<"completado" | "transito" | null>(null)
  const [estadoLocal, setEstadoLocal] = useState(pedido.estado)
  const { toast } = useToast()

  // Actualizar estado local cuando cambie el pedido
  useEffect(() => {
    setEstadoLocal(pedido.estado)
  }, [pedido.estado])

  const calcularTotal = () => {
    return pedido.productos.reduce((total, producto) => {
      const unidadesReales = producto.cantidad * producto.unidades
      return total + producto.precio2 * unidadesReales
    }, 0)
  }

  const handleCambiarEstado = (estado: "transito" | "completado") => {
    setAnimando(estado)
    setEstadoLocal(estado) // Cambiar inmediatamente el estado local

    // Llamar a la función después de un breve retraso para la animación
    setTimeout(() => {
      onCambiarEstado(pedido.id, estado)
      setAnimando(null)
    }, 600)
  }

  const copiarPedido = async () => {
    try {
      const textoPedido = pedido.productos.map((p) => p.linea_original).join("\n")
      await navigator.clipboard.writeText(textoPedido)
      toast({
        title: "📋 Copiado",
        description: "Pedido copiado al portapapeles",
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo copiar el pedido",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onVolver} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{pedido.proveedor}</h1>
          <p className="text-muted-foreground">Pedido del {pedido.fecha_pedido}</p>
        </div>
        <Button variant="outline" onClick={copiarPedido} className="gap-2">
          <Copy className="w-4 h-4" />
          Copiar Pedido
        </Button>
        <Badge
          variant="secondary"
          className={estadoLocal === "transito" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}
        >
          {estadoLocal === "transito" ? "En Tránsito" : "Completado"}
        </Badge>
      </div>

      <div className="grid gap-6">
        {/* Información del Pedido */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Información del Pedido</CardTitle>
                <CardDescription className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de pedido: {pedido.fecha_pedido}
                  </div>
                  {pedido.fecha_estimada_llegada && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Clock className="w-4 h-4" />
                      Llegada estimada: {pedido.fecha_estimada_llegada}
                      {pedido.dias_estimados && ` (${pedido.dias_estimados} días)`}
                    </div>
                  )}
                  <div>
                    {pedido.productos.length} productos • Total estimado: $
                    {calcularTotal().toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </div>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {estadoLocal === "transito" ? (
                  <Button
                    onClick={() => handleCambiarEstado("completado")}
                    className={`gap-2 transition-all duration-500 ${
                      animando === "completado" ? "bg-green-500 scale-105" : ""
                    }`}
                    disabled={animando !== null}
                  >
                    <CheckCircle className={`w-4 h-4 ${animando === "completado" ? "animate-ping" : ""}`} />
                    {animando === "completado" ? "¡Completado!" : "Marcar Completado"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleCambiarEstado("transito")}
                    className={`gap-2 transition-all duration-500 ${
                      animando === "transito" ? "bg-orange-500 text-white scale-105" : ""
                    }`}
                    disabled={animando !== null}
                  >
                    <Clock className={`w-4 h-4 ${animando === "transito" ? "animate-spin" : ""}`} />
                    {animando === "transito" ? "¡En Tránsito!" : "Marcar En Tránsito"}
                  </Button>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. El pedido será eliminado permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onEliminar(pedido.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Lista de Productos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pedido.productos.map((producto, index) => (
                <div key={index}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">
                        {producto.cantidad}x{producto.unidades} {producto.nombre}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Precio por unidad: ${producto.precio2} • {producto.cantidad} cajas × {producto.unidades}{" "}
                        unidades
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        $
                        {(producto.precio2 * (producto.cantidad * producto.unidades)).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {producto.cantidad * producto.unidades} unidades
                      </div>
                    </div>
                  </div>
                  {index < pedido.productos.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Estimado:</span>
              <span>${calcularTotal().toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Texto Original del Pedido */}
        <Card>
          <CardHeader>
            <CardTitle>Texto Original</CardTitle>
            <CardDescription>Formato original del pedido para referencia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {pedido.productos.map((p) => p.linea_original).join("\n")}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
