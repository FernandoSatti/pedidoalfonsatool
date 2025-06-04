"use client"

import { useState, useEffect } from "react"
import { Plus, Package, Clock, CheckCircle, RefreshCw, AlertTriangle, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { NuevoPedido } from "./components/nuevo-pedido"
import { DetallePedido } from "./components/detalle-pedido"
import { ProductosFaltantes } from "./components/productos-faltantes"
import { supabase } from "@/lib/supabase"

export interface Producto {
  id?: string
  cantidad: number
  unidades: number
  nombre: string
  precio1: number
  precio2: number
  linea_original: string
}

export interface Pedido {
  id: string
  proveedor: string
  fecha: string
  fecha_pedido: string
  fecha_estimada_llegada?: string | null
  dias_estimados?: number | null
  productos: Producto[]
  estado: "transito" | "completado"
  created_at?: string
  updated_at?: string
}

export interface ProductoFaltante {
  id: string
  nombre: string
  cantidad: number
  unidades: number
  proveedor: string
  fecha_registro: string
  precio: number | null
  resuelto: boolean
}

const PROVEEDORES = {
  europa: {
    nombre: "Europa",
    subProveedores: [
      "Aconcagua",
      "Campari",
      "Cepas Argentinas",
      "Coca Cola",
      "Dellepiane",
      "Fratelli Branca",
      "La Rural",
      "Las Perdices",
      "Mani King",
      "Millan",
      "Norton",
      "Pascual Toso",
      "Pernord Ricard",
      "Salentein",
      "Zuccardi",
    ],
  },
  independientes: [
    "Speed VM",
    "Gin Merle",
    "Coffico",
    "Berlin",
    "Liquid Point",
    "Corral de Palos",
    "Full Bazar",
    "Full Escabio",
  ],
}

export default function PedidosManager() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [faltantes, setFaltantes] = useState<ProductoFaltante[]>([])
  const [mostrarNuevoPedido, setMostrarNuevoPedido] = useState(false)
  const [mostrarFaltantes, setMostrarFaltantes] = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null)
  const [cargando, setCargando] = useState(true)
  const { toast } = useToast()

  // Cargar pedidos de la base de datos
  const cargarPedidos = async () => {
    try {
      setCargando(true)

      // Obtener pedidos con sus productos
      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedidos")
        .select(`
          *,
          productos (*)
        `)
        .order("created_at", { ascending: false })

      if (pedidosError) throw pedidosError

      // Transformar los datos al formato esperado
      const pedidosFormateados: Pedido[] =
        pedidosData?.map((pedido) => ({
          id: pedido.id,
          proveedor: pedido.proveedor,
          fecha: new Date(pedido.fecha).toLocaleDateString("es-AR"),
          fecha_pedido: new Date(pedido.fecha_pedido).toLocaleDateString("es-AR"),
          fecha_estimada_llegada: pedido.fecha_estimada_llegada
            ? new Date(pedido.fecha_estimada_llegada).toLocaleDateString("es-AR")
            : null,
          dias_estimados: pedido.dias_estimados,
          estado: pedido.estado as "transito" | "completado",
          productos: pedido.productos || [],
          created_at: pedido.created_at,
          updated_at: pedido.updated_at,
        })) || []

      setPedidos(pedidosFormateados)
    } catch (error) {
      console.error("Error cargando pedidos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "destructive",
      })
    } finally {
      setCargando(false)
    }
  }

  // Cargar productos faltantes
  const cargarFaltantes = async () => {
    try {
      const { data, error } = await supabase
        .from("productos_faltantes")
        .select("*")
        .eq("resuelto", false)
        .order("fecha_registro", { ascending: false })

      if (error) throw error

      const faltantesFormateados: ProductoFaltante[] =
        data?.map((faltante) => ({
          ...faltante,
          fecha_registro: new Date(faltante.fecha_registro).toLocaleDateString("es-AR"),
        })) || []

      setFaltantes(faltantesFormateados)
    } catch (error) {
      console.error("Error cargando faltantes:", error)
    }
  }

  useEffect(() => {
    cargarPedidos()
    cargarFaltantes()
  }, [])

  const agregarPedido = async (nuevoPedido: Omit<Pedido, "id" | "created_at" | "updated_at">) => {
    try {
      // Calcular fecha estimada de llegada si se proporcionaron días
      let fechaEstimadaLlegada = null
      if (nuevoPedido.dias_estimados) {
        const fechaPedido = new Date(nuevoPedido.fecha_pedido)
        fechaEstimadaLlegada = new Date(fechaPedido.getTime() + nuevoPedido.dias_estimados * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      }

      // Insertar el pedido
      const { data: pedidoData, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          proveedor: nuevoPedido.proveedor,
          fecha_pedido: nuevoPedido.fecha_pedido,
          fecha_estimada_llegada: fechaEstimadaLlegada,
          dias_estimados: nuevoPedido.dias_estimados,
          estado: nuevoPedido.estado,
        })
        .select()
        .single()

      if (pedidoError) throw pedidoError

      // Verificar y descontar productos faltantes
      for (const producto of nuevoPedido.productos) {
        await verificarYDescontarFaltantes(producto)
      }

      // Insertar los productos
      const productosParaInsertar = nuevoPedido.productos.map((producto) => ({
        pedido_id: pedidoData.id,
        cantidad: producto.cantidad,
        unidades: producto.unidades,
        nombre: producto.nombre,
        precio1: producto.precio1,
        precio2: producto.precio2,
        linea_original: producto.linea_original,
      }))

      const { error: productosError } = await supabase.from("productos").insert(productosParaInsertar)

      if (productosError) throw productosError

      toast({
        title: "✅ Éxito",
        description: "Pedido guardado correctamente",
      })

      setMostrarNuevoPedido(false)
      cargarPedidos()
      cargarFaltantes()
    } catch (error) {
      console.error("Error guardando pedido:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo guardar el pedido",
        variant: "destructive",
      })
    }
  }

  const verificarYDescontarFaltantes = async (producto: Producto) => {
    try {
      // Buscar productos faltantes con el mismo nombre
      const { data: faltantesData, error } = await supabase
        .from("productos_faltantes")
        .select("*")
        .eq("nombre", producto.nombre)
        .eq("resuelto", false)
        .order("fecha_registro", { ascending: true })

      if (error) throw error

      let cantidadRestante = producto.cantidad * producto.unidades

      for (const faltante of faltantesData || []) {
        if (cantidadRestante <= 0) break

        const cantidadFaltante = faltante.cantidad * faltante.unidades

        if (cantidadRestante >= cantidadFaltante) {
          // Marcar como resuelto completamente
          await supabase.from("productos_faltantes").update({ resuelto: true }).eq("id", faltante.id)

          cantidadRestante -= cantidadFaltante

          toast({
            title: "🎉 Faltante resuelto",
            description: `Se resolvió: ${faltante.cantidad}x${faltante.unidades} ${faltante.nombre}`,
          })
        } else {
          // Reducir la cantidad del faltante
          const nuevaCantidadTotal = cantidadFaltante - cantidadRestante
          const nuevaCantidad = Math.ceil(nuevaCantidadTotal / faltante.unidades)

          await supabase.from("productos_faltantes").update({ cantidad: nuevaCantidad }).eq("id", faltante.id)

          cantidadRestante = 0

          toast({
            title: "📉 Faltante reducido",
            description: `Se redujo el faltante de ${faltante.nombre}`,
          })
        }
      }
    } catch (error) {
      console.error("Error verificando faltantes:", error)
    }
  }

  const cambiarEstadoPedido = async (id: string, nuevoEstado: "transito" | "completado") => {
    try {
      const { error } = await supabase.from("pedidos").update({ estado: nuevoEstado }).eq("id", id)

      if (error) throw error

      // Animación de éxito
      toast({
        title: "🎉 Estado actualizado",
        description: `Pedido marcado como ${nuevoEstado === "transito" ? "en tránsito" : "completado"}`,
      })

      cargarPedidos()
    } catch (error) {
      console.error("Error actualizando estado:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar el estado del pedido",
        variant: "destructive",
      })
    }
  }

  const eliminarPedido = async (id: string) => {
    try {
      const { error } = await supabase.from("pedidos").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "🗑️ Pedido eliminado",
        description: "Pedido eliminado correctamente",
      })

      setPedidoSeleccionado(null)
      cargarPedidos()
    } catch (error) {
      console.error("Error eliminando pedido:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo eliminar el pedido",
        variant: "destructive",
      })
    }
  }

  const pedidosEnTransito = pedidos.filter((p) => p.estado === "transito")
  const pedidosCompletados = pedidos.filter((p) => p.estado === "completado")

  const buscarProductosDuplicados = (productos: Producto[]) => {
    const duplicados: Array<{ producto: Producto; pedidoOrigen: Pedido }> = []

    productos.forEach((producto) => {
      pedidos.forEach((pedido) => {
        pedido.productos.forEach((prodExistente) => {
          if (prodExistente.nombre.toLowerCase() === producto.nombre.toLowerCase()) {
            duplicados.push({
              producto: prodExistente,
              pedidoOrigen: pedido,
            })
          }
        })
      })
    })

    return duplicados
  }

  if (pedidoSeleccionado) {
    return (
      <DetallePedido
        pedido={pedidoSeleccionado}
        onVolver={() => setPedidoSeleccionado(null)}
        onCambiarEstado={cambiarEstadoPedido}
        onEliminar={eliminarPedido}
      />
    )
  }

  if (mostrarNuevoPedido) {
    return (
      <NuevoPedido
        proveedores={PROVEEDORES}
        onGuardar={agregarPedido}
        onCancelar={() => setMostrarNuevoPedido(false)}
        buscarDuplicados={buscarProductosDuplicados}
        faltantes={faltantes}
      />
    )
  }

  if (mostrarFaltantes) {
    return (
      <ProductosFaltantes
        faltantes={faltantes}
        proveedores={PROVEEDORES}
        onVolver={() => setMostrarFaltantes(false)}
        onActualizar={() => {
          cargarFaltantes()
          cargarPedidos()
        }}
      />
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
          <p className="text-muted-foreground mt-2">Administra tus pedidos desde cualquier dispositivo</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open("https://alfonsa-tools-modern.vercel.app/", "_blank")}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Volver al Inicio
          </Button>
          <Button variant="outline" onClick={cargarPedidos} disabled={cargando} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => setMostrarFaltantes(true)} className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Faltantes ({faltantes.length})
          </Button>
          <Button onClick={() => setMostrarNuevoPedido(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Pedido
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pedidosEnTransito.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{pedidosCompletados.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Faltantes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{faltantes.length}</div>
          </CardContent>
        </Card>
      </div>

      {cargando ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Cargando pedidos...</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="transito" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transito" className="gap-2">
              <Clock className="w-4 h-4" />
              En Tránsito ({pedidosEnTransito.length})
            </TabsTrigger>
            <TabsTrigger value="completados" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Completados ({pedidosCompletados.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transito" className="space-y-4">
            {pedidosEnTransito.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No hay pedidos en tránsito</p>
                </CardContent>
              </Card>
            ) : (
              pedidosEnTransito.map((pedido) => (
                <Card key={pedido.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader onClick={() => setPedidoSeleccionado(pedido)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{pedido.proveedor}</CardTitle>
                        <CardDescription>
                          Pedido: {pedido.fecha_pedido} • {pedido.productos.length} productos
                          {pedido.fecha_estimada_llegada && (
                            <span className="block text-blue-600">
                              Llegada estimada: {pedido.fecha_estimada_llegada}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        En Tránsito
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completados" className="space-y-4">
            {pedidosCompletados.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No hay pedidos completados</p>
                </CardContent>
              </Card>
            ) : (
              pedidosCompletados.map((pedido) => (
                <Card key={pedido.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader onClick={() => setPedidoSeleccionado(pedido)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{pedido.proveedor}</CardTitle>
                        <CardDescription>
                          Pedido: {pedido.fecha_pedido} • {pedido.productos.length} productos
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Completado
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
