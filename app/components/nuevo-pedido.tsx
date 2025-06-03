"use client"

import { useState } from "react"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Pedido, Producto } from "../page"

interface NuevoPedidoProps {
  proveedores: {
    europa: {
      nombre: string
      subProveedores: string[]
    }
    independientes: string[]
  }
  onGuardar: (pedido: Omit<Pedido, "id" | "fecha" | "created_at" | "updated_at">) => void
  onCancelar: () => void
  buscarDuplicados: (productos: Producto[]) => Array<{ producto: Producto; pedidoOrigen: Pedido }>
}

export function NuevoPedido({ proveedores, onGuardar, onCancelar, buscarDuplicados }: NuevoPedidoProps) {
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("")
  const [subProveedorSeleccionado, setSubProveedorSeleccionado] = useState("")
  const [textoPedido, setTextoPedido] = useState("")
  const [productos, setProductos] = useState<Producto[]>([])
  const [duplicados, setDuplicados] = useState<Array<{ producto: Producto; pedidoOrigen: Pedido }>>([])
  const [error, setError] = useState("")

  const parsearProductos = (texto: string): Producto[] => {
    const lineas = texto
      .trim()
      .split("\n")
      .filter((linea) => linea.trim())
    const productosParseados: Producto[] = []

    lineas.forEach((linea) => {
      // Regex para capturar: cantidad x unidades NOMBRE precio1/precio2
      const regex = /^(\d+)[xX](\d+)\s+(.+?)\s+\$?([\d,]+\.?\d*)\/([\d,]+\.?\d*)$/
      const match = linea.trim().match(regex)

      if (match) {
        productosParseados.push({
          cantidad: Number.parseInt(match[1]),
          unidades: Number.parseInt(match[2]),
          nombre: match[3].trim(),
          precio1: Number.parseFloat(match[4].replace(",", "")),
          precio2: Number.parseFloat(match[5].replace(",", "")),
          linea_original: linea.trim(),
        })
      }
    })

    return productosParseados
  }

  const procesarPedido = () => {
    if (!textoPedido.trim()) {
      setError("Debe ingresar los productos del pedido")
      return
    }

    const productosParseados = parsearProductos(textoPedido)

    if (productosParseados.length === 0) {
      setError("No se pudieron procesar los productos. Verifique el formato.")
      return
    }

    setProductos(productosParseados)

    // Buscar duplicados
    const duplicadosEncontrados = buscarDuplicados(productosParseados)
    setDuplicados(duplicadosEncontrados)

    setError("")
  }

  const guardarPedido = () => {
    if (!proveedorSeleccionado) {
      setError("Debe seleccionar un proveedor")
      return
    }

    if (productos.length === 0) {
      setError("Debe procesar los productos primero")
      return
    }

    const nombreProveedor =
      proveedorSeleccionado === "europa" ? `${subProveedorSeleccionado} (Europa)` : proveedorSeleccionado

    onGuardar({
      proveedor: nombreProveedor,
      productos,
      estado: "transito",
    })
  }

  const todosLosProveedores = [
    ...proveedores.europa.subProveedores.map((p) => ({ value: p, label: `${p} (Europa)`, grupo: "europa" })),
    ...proveedores.independientes.map((p) => ({ value: p, label: p, grupo: "independiente" })),
  ]

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onCancelar} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Pedido</h1>
          <p className="text-muted-foreground">Ingrese los detalles del pedido</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Selección de Proveedor */}
        <Card>
          <CardHeader>
            <CardTitle>Proveedor</CardTitle>
            <CardDescription>Seleccione el proveedor para este pedido</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={proveedorSeleccionado}
              onValueChange={(value) => {
                setProveedorSeleccionado(value)
                // Si es Europa, también guardamos el sub-proveedor
                const proveedor = todosLosProveedores.find((p) => p.value === value)
                if (proveedor?.grupo === "europa") {
                  setSubProveedorSeleccionado(value)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                <div className="font-semibold px-2 py-1 text-sm text-muted-foreground">Europa</div>
                {proveedores.europa.subProveedores.map((proveedor) => (
                  <SelectItem key={proveedor} value={proveedor}>
                    {proveedor} (Europa)
                  </SelectItem>
                ))}
                <div className="font-semibold px-2 py-1 text-sm text-muted-foreground mt-2">Independientes</div>
                {proveedores.independientes.map((proveedor) => (
                  <SelectItem key={proveedor} value={proveedor}>
                    {proveedor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Ingreso de Productos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
            <CardDescription>
              Pegue la lista de productos en el formato: cantidad x unidades NOMBRE $precio1/precio2
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="productos">Lista de Productos</Label>
              <Textarea
                id="productos"
                placeholder="Ejemplo:&#10;4x12 PETACA LICOR PIÑA COLADA AMERICANN CLUB $1708.20/1256.24&#10;5x6 LAS PERDICES CABERNET SUAV 750CC $4771.99/5160.91"
                value={textoPedido}
                onChange={(e) => setTextoPedido(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <Button onClick={procesarPedido} disabled={!textoPedido.trim()}>
              Procesar Productos
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Productos Procesados */}
        {productos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Productos Procesados ({productos.length})</CardTitle>
              <CardDescription>Revise los productos antes de guardar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {productos.map((producto, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="font-mono text-sm">
                      {producto.cantidad}x{producto.unidades} {producto.nombre}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Precio unitario: ${producto.precio2} • Total unidades: {producto.cantidad * producto.unidades}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advertencia de Duplicados */}
        {duplicados.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">USTED YA PIDIÓ Y ESTÁ REPITIENDO EL PRODUCTO:</div>
              {duplicados.map((dup, index) => (
                <div key={index} className="mb-1">
                  {dup.producto.cantidad}x{dup.producto.unidades} {dup.producto.nombre} ${dup.producto.precio1}/$
                  {dup.producto.precio2}
                  <span className="text-sm"> (pedido en {dup.pedidoOrigen.proveedor})</span>
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Botones de Acción */}
        {productos.length > 0 && (
          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button onClick={guardarPedido}>Guardar Pedido</Button>
          </div>
        )}
      </div>
    </div>
  )
}
