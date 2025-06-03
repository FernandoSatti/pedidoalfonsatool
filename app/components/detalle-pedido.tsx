"use client"

import { ArrowLeft, Clock, CheckCircle, Trash2 } from "lucide-react"
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
import type { Pedido } from "../page"

interface DetallePedidoProps {
  pedido: Pedido
  onVolver: () => void
  onCambiarEstado: (id: string, estado: "transito" | "completado") => void
  onEliminar: (id: string) => void
}

export function DetallePedido({ pedido, onVolver, onCambiarEstado, onEliminar }: DetallePedidoProps) {
  const calcularTotal = () => {
    return pedido.productos.reduce((total, producto) => {
      const unidadesReales = producto.cantidad * producto.unidades
      return total + producto.precio2 * unidadesReales
    }, 0)
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
          <p className="text-muted-foreground">Pedido del {pedido.fecha}</p>
        </div>
        <Badge
          variant="secondary"
          className={pedido.estado === "transito" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}
        >
          {pedido.estado === "transito" ? "En Tránsito" : "Completado"}
        </Badge>
      </div>

      <div className="grid gap-6">
        {/* Información del Pedido */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Información del Pedido</CardTitle>
                <CardDescription>
                  {pedido.productos.length} productos • Total estimado: $
                  {calcularTotal().toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {pedido.estado === "transito" ? (
                  <Button onClick={() => onCambiarEstado(pedido.id, "completado")} className="gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Marcar Completado
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => onCambiarEstado(pedido.id, "transito")} className="gap-2">
                    <Clock className="w-4 h-4" />
                    Marcar En Tránsito
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
