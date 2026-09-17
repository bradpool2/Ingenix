import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../services/carrito_service.dart';
import '../../widgets/navbar_widget.dart';

class CarritoScreen extends StatelessWidget {
  const CarritoScreen({super.key});

  String _formatoMoneda(double valor) {
    return NumberFormat.currency(
      locale: 'es_CO',
      symbol: '\$',
      decimalDigits: 0,
    ).format(valor);
  }

  @override
  Widget build(BuildContext context) {
    final carrito = context.watch<CarritoService>();

    return Scaffold(
      appBar: const NavBarWidget(),
      body: carrito.items.isEmpty
          ? const _CarritoVacio()
          : LayoutBuilder(
              builder: (context, constraints) {
                final anchoTarjeta = math
                    .min(constraints.maxWidth - 48, 760)
                    .toDouble();
                final listaProductos = carrito.items.length <= 4
                    ? Column(
                        children: [
                          for (var i = 0; i < carrito.items.length; i++) ...[
                            if (i > 0) const Divider(height: 28),
                            _construirProducto(carrito, i),
                          ],
                        ],
                      )
                    : SizedBox(
                        height: math.min(
                          carrito.items.length * 84.0 +
                              (carrito.items.length - 1) * 28.0,
                          constraints.maxHeight * 0.52,
                        ),
                        child: ListView.separated(
                          itemCount: carrito.items.length,
                          separatorBuilder: (_, __) =>
                              const Divider(height: 28),
                          itemBuilder: (_, i) => _construirProducto(carrito, i),
                        ),
                      );

                return Align(
                  alignment: Alignment.center,
                  child: SizedBox(
                    width: anchoTarjeta,
                    child: Card(
                      margin: EdgeInsets.zero,
                      child: Padding(
                        padding: EdgeInsets.symmetric(
                          horizontal: constraints.maxWidth < 600 ? 18 : 30,
                          vertical: 28,
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                              'Carrito de Compras',
                              style: TextStyle(
                                fontSize: 23,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 28),
                            listaProductos,
                            const Divider(height: 28),
                            Align(
                              alignment: Alignment.centerRight,
                              child: Text(
                                'Total: ${_formatoMoneda(carrito.totalPrecio)}',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(height: 18),
                            Align(
                              alignment: Alignment.center,
                              child: SizedBox(
                                width: 210,
                                child: ElevatedButton(
                                  onPressed: () => context.go('/pago'),
                                  child: const Text('Proceder al pago'),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }

  Widget _construirProducto(CarritoService carrito, int index) {
    final item = carrito.items[index];
    return _ProductoCarrito(
      nombre: item.producto.nombre,
      precio: _formatoMoneda(item.producto.precio),
      cantidad: item.cantidad,
      onDisminuir: () => carrito.disminuir(item.producto.idProducto),
      onAumentar: () => carrito.agregar(item.producto),
      onEliminar: () => carrito.eliminar(item.producto.idProducto),
    );
  }
}

class _CarritoVacio extends StatelessWidget {
  const _CarritoVacio();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Card(
        margin: EdgeInsets.all(24),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 48, vertical: 42),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.shopping_cart_outlined,
                size: 64,
                color: IngenixTheme.secundario,
              ),
              SizedBox(height: 16),
              Text(
                'No hay productos en el carrito.',
                style: TextStyle(color: IngenixTheme.textoSec),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductoCarrito extends StatelessWidget {
  final String nombre;
  final String precio;
  final int cantidad;
  final VoidCallback onDisminuir;
  final VoidCallback onAumentar;
  final VoidCallback onEliminar;

  const _ProductoCarrito({
    required this.nombre,
    required this.precio,
    required this.cantidad,
    required this.onDisminuir,
    required this.onAumentar,
    required this.onEliminar,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.center,
      runSpacing: 16,
      children: [
        SizedBox(
          width: MediaQuery.sizeOf(context).width < 600 ? double.infinity : 330,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(nombre, style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Text(
                'Precio: $precio',
                style: const TextStyle(color: IngenixTheme.textoSec),
              ),
            ],
          ),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _BtnCantidad(icono: Icons.remove, onTap: onDisminuir),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Text(
                '$cantidad',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
            _BtnCantidad(icono: Icons.add, onTap: onAumentar),
            const SizedBox(width: 14),
            _BtnCantidad(
              icono: Icons.close,
              color: IngenixTheme.error,
              onTap: onEliminar,
            ),
          ],
        ),
      ],
    );
  }
}

class _BtnCantidad extends StatelessWidget {
  final IconData icono;
  final VoidCallback onTap;
  final Color? color;
  const _BtnCantidad({required this.icono, required this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color ?? IngenixTheme.principal,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icono, size: 16, color: Colors.white),
      ),
    );
  }
}
