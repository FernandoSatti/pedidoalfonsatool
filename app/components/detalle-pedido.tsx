"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Clock, CheckCircle, Trash2, Calendar, Copy, X, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import type { Pedido, Producto } from "../page"

interface DetallePedidoProps {
  pedido: Pedido
  onVolver: () => void
  onCambiarEstado: (id: string, estado: "transito" | "completado") => void
  onEliminar: (id: string) => void
  onActualizar?: () => void
}

export function DetallePedido({ pedido, onVolver, onCambiarEstado, onEliminar, onActualizar }: DetallePedidoProps) {
  const [animando, setAnimando] = useState<"completado" | "transito" | null>(null)
  const [estadoLocal, setEstadoLocal] = useState(pedido.estado)
  const [productos, setProductos] = useState<Producto[]>(pedido.productos)
  const [editandoFecha, setEditandoFecha] = useState(false)
  const [nuevaFechaPedido, setNuevaFechaPedido] = useState(
    new Date(pedido.fecha_pedido.split("/").reverse().join("-")).toISOString().split("T")[0],
  )
  const [diasEstimados, setDiasEstimados] = useState(pedido.dias_estimados || "")
  const { toast } = useToast()

  // Actualizar estado local cuando cambie el pedido
  useEffect(() => {
    setEstadoLocal(pedido.estado)
    setProductos(pedido.productos)
  }, [pedido.estado, pedido.productos])

  const calcularTotal = () => {
    return productos.reduce((total, producto) => {
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
      const textoPedido = productos.map((p) => p.linea_original).join("\n")
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

  const actualizarFecha = async () => {
    try {
      let fechaEstimadaLlegada = null
      if (diasEstimados) {
        const fechaPedido = new Date(nuevaFechaPedido)
        fechaEstimadaLlegada = new Date(fechaPedido.getTime() + Number(diasEstimados) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      }

      const { error } = await supabase
        .from("pedidos")
        .update({
          fecha_pedido: nuevaFechaPedido,
          dias_estimados: diasEstimados ? Number(diasEstimados) : null,
          fecha_estimada_llegada: fechaEstimadaLlegada,
        })
        .eq("id", pedido.id)

      if (error) throw error

      toast({
        title: "✅ Fecha actualizada",
        description: "La fecha del pedido ha sido actualizada",
      })

      setEditandoFecha(false)
      if (onActualizar) {
        onActualizar()
      }
    } catch (error) {
      console.error("Error actualizando fecha:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar la fecha",
        variant: "destructive",
      })
    }
  }

  const reestablecerFaltanteEnProveedorOriginal = async (producto: Producto) => {
    try {
      // Buscar faltantes resueltos con el mismo nombre para encontrar el proveedor original
      const { data: faltantesResueltos, error: errorBusqueda } = await supabase
        .from("productos_faltantes")
        .select("*")
        .eq("nombre", producto.nombre)
        .eq("resuelto", true)
        .order("updated_at", { ascending: false })

      if (errorBusqueda) throw errorBusqueda

      let proveedorOriginal = pedido.proveedor // Por defecto usar el proveedor del pedido

      // Si encontramos faltantes resueltos, usar el proveedor del más reciente
      if (faltantesResueltos && faltantesResueltos.length > 0) {
        proveedorOriginal = faltantesResueltos[0].proveedor
      }

      // Buscar si existe un faltante activo con el mismo nombre y proveedor original
      const { data: faltanteExistente, error: errorBusquedaActivo } = await supabase
        .from("productos_faltantes")
        .select("*")
        .eq("nombre", producto.nombre)
        .eq("proveedor", proveedorOriginal)
        .eq("resuelto", false)
        .single()

      if (errorBusquedaActivo && errorBusquedaActivo.code !== "PGRST116") {
        throw errorBusquedaActivo
      }

      if (faltanteExistente) {
        // Si existe, aumentar la cantidad
        const nuevaCantidad = faltanteExistente.cantidad + producto.cantidad
        await supabase.from("productos_faltantes").update({ cantidad: nuevaCantidad }).eq("id", faltanteExistente.id)
      } else {
        // Si no existe, crear uno nuevo en el proveedor original
        await supabase.from("productos_faltantes").insert({
          nombre: producto.nombre,
          cantidad: producto.cantidad,
          unidades: producto.unidades,
          proveedor: proveedorOriginal,
          precio: producto.precio2,
        })
      }

      toast({
        title: "🔄 Faltante reestablecido",
        description: `Producto reestablecido en faltantes de ${proveedorOriginal}`,
      })
    } catch (error) {
      console.error("Error reestableciendo faltante:", error)
    }
  }

  const eliminarProducto = async (productoId: string, producto: Producto) => {
    try {
      // Eliminar el producto de la base de datos
      const { error } = await supabase.from("productos").delete().eq("id", productoId)

      if (error) throw error

      // Reestablecer en faltantes del proveedor original
      await reestablecerFaltanteEnProveedorOriginal(producto)

      // Actualizar la lista local
      setProductos(productos.filter((p) => p.id !== productoId))

      toast({
        title: "🗑️ Producto eliminado",
        description: "Producto eliminado y reestablecido en faltantes",
      })

      // Actualizar la vista principal si se proporciona la función
      if (onActualizar) {
        onActualizar()
      }
    } catch (error) {
      console.error("Error eliminando producto:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive",
      })
    }
  }

  const cancelarPedidoCompleto = async () => {
    try {
      // Reestablecer todos los productos en faltantes de sus proveedores originales
      for (const producto of productos) {
        await reestablecerFaltanteEnProveedorOriginal(producto)
      }

      // Eliminar el pedido
      onEliminar(pedido.id)
    } catch (error) {
      console.error("Error cancelando pedido:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo cancelar el pedido completamente",
        variant: "destructive",
      })
    }
  }

  const calcularFechaEstimada = () => {
    if (!diasEstimados) return null
    const fecha = new Date(nuevaFechaPedido)
    fecha.setDate(fecha.getDate() + Number(diasEstimados))
    return fecha.toLocaleDateString("es-AR")
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
                    <Dialog open={editandoFecha} onOpenChange={setEditandoFecha}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Edit className="w-3 h-3" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Fecha del Pedido</DialogTitle>
                          <DialogDescription>
                            Modifica la fecha del pedido y los días estimados de llegada
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="nueva-fecha">Nueva Fecha del Pedido</Label>
                            <Input
                              id="nueva-fecha"
                              type="date"
                              value={nuevaFechaPedido}
                              onChange={(e) => setNuevaFechaPedido(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="dias-estimados">Días estimados de llegada (opcional)</Label>
                            <Input
                              id="dias-estimados"
                              type="number"
                              placeholder="Ej: 15"
                              value={diasEstimados}
                              onChange={(e) => setDiasEstimados(e.target.value)}
                            />
                            {diasEstimados && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Llegada estimada: {calcularFechaEstimada()}
                              </p>
                            )}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditandoFecha(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={actualizarFecha}>Actualizar Fecha</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {pedido.fecha_estimada_llegada && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Clock className="w-4 h-4" />
                      Llegada estimada: {pedido.fecha_estimada_llegada}
                      {pedido.dias_estimados && ` (${pedido.dias_estimados} días)`}
                    </div>
                  )}
                  <div>
                    {productos.length} productos • Total estimado: $
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
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Cancelar Pedido
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cancelar pedido completo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará todo el pedido y reestablecerá todos los productos en la lista de
                        faltantes de sus proveedores originales. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={cancelarPedidoCompleto}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cancelar Pedido
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
              {productos.map((producto, index) => (
                <div key={producto.id || index}>
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
                    <div className="flex items-center gap-2">
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
                      {producto.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <X className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará "{producto.nombre}" del pedido y se reestablecerá en la lista de faltantes
                                de su proveedor original.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => eliminarProducto(producto.id!, producto)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  {index < productos.length - 1 && <Separator className="mt-4" />}
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
                {productos.map((p) => p.linea_original).join("\n")}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
