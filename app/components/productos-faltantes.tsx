"use client"

import { useState } from "react"
import { ArrowLeft, Plus, Trash2, AlertTriangle, ChevronRight, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import type { ProductoFaltante } from "../page"

interface ProductosFaltantesProps {
  faltantes: ProductoFaltante[]
  proveedores: {
    europa: {
      nombre: string
      subProveedores: string[]
    }
    independientes: string[]
  }
  onVolver: () => void
  onActualizar: () => void
}

export function ProductosFaltantes({ faltantes, proveedores, onVolver, onActualizar }: ProductosFaltantesProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string | null>(null)
  const [nuevoFaltante, setNuevoFaltante] = useState({
    nombre: "",
    cantidad: "",
    unidades: "",
    proveedor: "",
    precio: "",
  })
  const [textoFaltantes, setTextoFaltantes] = useState("")
  const [proveedorLista, setProveedorLista] = useState("")
  const [faltantesProcesados, setFaltantesProcesados] = useState<
    Array<{
      nombre: string
      cantidad: number
      unidades: number
      proveedor: string
      precio?: number
    }>
  >([])
  const { toast } = useToast()

  // Agrupar faltantes por proveedor
  const faltantesPorProveedor = faltantes.reduce(
    (acc, faltante) => {
      if (!acc[faltante.proveedor]) {
        acc[faltante.proveedor] = []
      }
      acc[faltante.proveedor].push(faltante)
      return acc
    },
    {} as Record<string, ProductoFaltante[]>,
  )

  const agregarFaltante = async () => {
    try {
      if (!nuevoFaltante.nombre || !nuevoFaltante.cantidad || !nuevoFaltante.unidades || !nuevoFaltante.proveedor) {
        toast({
          title: "❌ Error",
          description: "Todos los campos son obligatorios",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("productos_faltantes").insert({
        nombre: nuevoFaltante.nombre,
        cantidad: Number.parseInt(nuevoFaltante.cantidad),
        unidades: Number.parseInt(nuevoFaltante.unidades),
        proveedor: nuevoFaltante.proveedor,
        precio: nuevoFaltante.precio ? Number.parseFloat(nuevoFaltante.precio) : null,
      })

      if (error) throw error

      toast({
        title: "✅ Éxito",
        description: "Producto faltante agregado correctamente",
      })

      setNuevoFaltante({
        nombre: "",
        cantidad: "",
        unidades: "",
        proveedor: "",
        precio: "",
      })
      setMostrarFormulario(false)
      onActualizar()
    } catch (error) {
      console.error("Error agregando faltante:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo agregar el producto faltante",
        variant: "destructive",
      })
    }
  }

  const eliminarFaltante = async (id: string) => {
    try {
      const { error } = await supabase.from("productos_faltantes").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "🗑️ Eliminado",
        description: "Producto faltante eliminado correctamente",
      })

      onActualizar()
    } catch (error) {
      console.error("Error eliminando faltante:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo eliminar el producto faltante",
        variant: "destructive",
      })
    }
  }

  const parsearFaltantes = (texto: string) => {
    const lineas = texto
      .trim()
      .split("\n")
      .filter((linea) => linea.trim())
    const faltantesParsed: Array<{
      nombre: string
      cantidad: number
      unidades: number
      proveedor: string
      precio?: number
    }> = []

    lineas.forEach((linea) => {
      // Regex para capturar: cantidad x unidades NOMBRE precio1/precio2
      const regex = /^(\d+)[xX](\d+)\s+(.+?)(?:\s+\$?([\d,]+\.?\d*)(?:\/([\d,]+\.?\d*))?)?$/
      const match = linea.trim().match(regex)

      if (match) {
        faltantesParsed.push({
          cantidad: Number.parseInt(match[1]),
          unidades: Number.parseInt(match[2]),
          nombre: match[3].trim(),
          proveedor: proveedorLista,
          precio: match[5] ? Number.parseFloat(match[5].replace(",", "")) : undefined,
        })
      }
    })

    return faltantesParsed
  }

  const procesarFaltantes = () => {
    if (!textoFaltantes.trim() || !proveedorLista) {
      toast({
        title: "❌ Error",
        description: "Debe ingresar los productos y seleccionar un proveedor",
        variant: "destructive",
      })
      return
    }

    const faltantesParsed = parsearFaltantes(textoFaltantes)

    if (faltantesParsed.length === 0) {
      toast({
        title: "❌ Error",
        description: "No se pudieron procesar los productos. Verifique el formato.",
        variant: "destructive",
      })
      return
    }

    setFaltantesProcesados(faltantesParsed)

    toast({
      title: "✅ Procesados",
      description: `Se procesaron ${faltantesParsed.length} productos faltantes`,
    })
  }

  const guardarFaltantesMasivos = async () => {
    try {
      if (faltantesProcesados.length === 0) {
        toast({
          title: "❌ Error",
          description: "No hay productos para guardar",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("productos_faltantes").insert(faltantesProcesados)

      if (error) throw error

      toast({
        title: "✅ Éxito",
        description: `Se guardaron ${faltantesProcesados.length} productos faltantes`,
      })

      setTextoFaltantes("")
      setProveedorLista("")
      setFaltantesProcesados([])
      onActualizar()
    } catch (error) {
      console.error("Error guardando faltantes:", error)
      toast({
        title: "❌ Error",
        description: "No se pudieron guardar los productos faltantes",
        variant: "destructive",
      })
    }
  }

  const todosLosProveedores = [
    ...proveedores.europa.subProveedores.map((p) => `${p} (Europa)`),
    ...proveedores.independientes,
  ]

  // Si hay un proveedor seleccionado, mostrar sus productos
  if (proveedorSeleccionado) {
    const faltantesDelProveedor = faltantesPorProveedor[proveedorSeleccionado] || []

    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setProveedorSeleccionado(null)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Volver a Proveedores
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{proveedorSeleccionado}</h1>
            <p className="text-muted-foreground">
              {faltantesDelProveedor.length} productos faltantes de este proveedor
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {faltantesDelProveedor.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">No hay productos faltantes de este proveedor</p>
              </CardContent>
            </Card>
          ) : (
            faltantesDelProveedor.map((faltante) => (
              <Card key={faltante.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {faltante.cantidad}x{faltante.unidades} {faltante.nombre}
                      </CardTitle>
                      <CardDescription>
                        Registrado: {faltante.fecha_registro}
                        {faltante.precio && <span> • Precio: ${faltante.precio}</span>}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        {faltante.cantidad * faltante.unidades} unidades
                      </Badge>
                      <Button variant="destructive" size="icon" onClick={() => eliminarFaltante(faltante.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  // Vista principal: lista de proveedores
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onVolver} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Productos Faltantes</h1>
          <p className="text-muted-foreground">Gestiona los productos que no estaban disponibles</p>
        </div>
        <Button onClick={() => setMostrarFormulario(!mostrarFormulario)} className="gap-2">
          <Plus className="w-4 h-4" />
          Agregar Faltante
        </Button>
      </div>

      <Tabs defaultValue="proveedores" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="proveedores" className="gap-2">
            <Package className="w-4 h-4" />
            Por Proveedor
          </TabsTrigger>
          <TabsTrigger value="masivo" className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar Masivamente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proveedores">
          {/* Formulario para agregar faltante individual */}
          {mostrarFormulario && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Agregar Producto Faltante</CardTitle>
                <CardDescription>
                  Registra un producto que no estaba disponible en el momento del pedido
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre">Nombre del Producto</Label>
                    <Input
                      id="nombre"
                      value={nuevoFaltante.nombre}
                      onChange={(e) => setNuevoFaltante({ ...nuevoFaltante, nombre: e.target.value })}
                      placeholder="Ej: LAS PERDICES MALBEC 750CC"
                    />
                  </div>

                  <div>
                    <Label htmlFor="proveedor">Proveedor</Label>
                    <Select
                      value={nuevoFaltante.proveedor}
                      onValueChange={(value) => setNuevoFaltante({ ...nuevoFaltante, proveedor: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {todosLosProveedores.map((proveedor) => (
                          <SelectItem key={proveedor} value={proveedor}>
                            {proveedor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cantidad">Cantidad (cajas)</Label>
                    <Input
                      id="cantidad"
                      type="number"
                      value={nuevoFaltante.cantidad}
                      onChange={(e) => setNuevoFaltante({ ...nuevoFaltante, cantidad: e.target.value })}
                      placeholder="Ej: 5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="unidades">Unidades por caja</Label>
                    <Input
                      id="unidades"
                      type="number"
                      value={nuevoFaltante.unidades}
                      onChange={(e) => setNuevoFaltante({ ...nuevoFaltante, unidades: e.target.value })}
                      placeholder="Ej: 6"
                    />
                  </div>

                  <div>
                    <Label htmlFor="precio">Precio (opcional)</Label>
                    <Input
                      id="precio"
                      type="number"
                      step="0.01"
                      value={nuevoFaltante.precio}
                      onChange={(e) => setNuevoFaltante({ ...nuevoFaltante, precio: e.target.value })}
                      placeholder="Ej: 1256.24"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setMostrarFormulario(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={agregarFaltante}>Agregar Faltante</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de proveedores con faltantes */}
          <div className="space-y-4">
            {Object.keys(faltantesPorProveedor).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No hay productos faltantes registrados</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(faltantesPorProveedor).map(([proveedor, faltantesProveedor]) => (
                <Card key={proveedor} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader onClick={() => setProveedorSeleccionado(proveedor)}>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg">{proveedor}</CardTitle>
                        <CardDescription>
                          {faltantesProveedor.length} productos faltantes •{" "}
                          {faltantesProveedor.reduce((total, f) => total + f.cantidad * f.unidades, 0)} unidades totales
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          {faltantesProveedor.length} productos
                        </Badge>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="masivo">
          <Card>
            <CardHeader>
              <CardTitle>Agregar Faltantes Masivamente</CardTitle>
              <CardDescription>
                Pegue la lista de productos faltantes en el formato: cantidad x unidades NOMBRE $precio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="proveedor-lista">Proveedor</Label>
                <Select value={proveedorLista} onValueChange={setProveedorLista}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {todosLosProveedores.map((proveedor) => (
                      <SelectItem key={proveedor} value={proveedor}>
                        {proveedor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="faltantes-texto">Lista de Productos Faltantes</Label>
                <Textarea
                  id="faltantes-texto"
                  placeholder="Ejemplo:&#10;4x12 PETACA LICOR PIÑA COLADA AMERICANN CLUB $1256.24&#10;5x6 LAS PERDICES CABERNET SUAV 750CC $5160.91"
                  value={textoFaltantes}
                  onChange={(e) => setTextoFaltantes(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <Button onClick={procesarFaltantes} disabled={!textoFaltantes.trim() || !proveedorLista}>
                Procesar Faltantes
              </Button>

              {/* Productos Procesados */}
              {faltantesProcesados.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Productos Procesados ({faltantesProcesados.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {faltantesProcesados.map((faltante, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="font-mono text-sm">
                          {faltante.cantidad}x{faltante.unidades} {faltante.nombre}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Proveedor: {faltante.proveedor}
                          {faltante.precio && ` • Precio: $${faltante.precio}`}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button onClick={guardarFaltantesMasivos}>Guardar Todos los Faltantes</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
