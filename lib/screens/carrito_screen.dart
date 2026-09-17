import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../services/carrito_service.dart';
import '../../widgets/navbar_widget.dart';

class CarritoScreen extends StatelessWidget {
  const CarritoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final carrito = context.watch<CarritoService>();

    return Scaffold(
      appBar: const NavBarWidget(),
      body: carrito.items.isEmpty
          ? const Center(child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.shopping_cart_outlined, size: 80, color: IngenixTheme.secundario),
                SizedBox(height: 16),
                Text('No hay productos en el carrito.', style: TextStyle(color: IngenixTheme.textoSec)),
              ],
            ))
          : Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: carrito.items.length,
                    separatorBuilder: (_, __) => const Divider(),
                    itemBuilder: (_, i) {
                      final item = carrito.items[i];
                      return Row(
                        children: [
                          // Info
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.producto.nombre, style: const TextStyle(fontWeight: FontWeight.w600)),
                                Text(
                                  'Precio: \$${item.producto.precio.toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.')}',
                                  style: const TextStyle(fontSize: 13, color: IngenixTheme.textoSec),
                                ),
                              ],
                            ),
                          ),
                          // Controles cantidad
                          Row(
                            children: [
                              _BtnCantidad(
                                icono: Icons.remove,
                                onTap: () => context.read<CarritoService>().disminuir(item.producto.idProducto),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                child: Text('${item.cantidad}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              ),
                              _BtnCantidad(
                                icono: Icons.add,
                                onTap: () => context.read<CarritoService>().agregar(item.producto),
                              ),
                              const SizedBox(width: 8),
                              _BtnCantidad(
                                icono: Icons.close,
                                color: Colors.red,
                                onTap: () => context.read<CarritoService>().eliminar(item.producto.idProducto),
                              ),
                            ],
                          ),
                        ],
                      );
                    },
                  ),
                ),

                // Total y botón
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: Color(0xFFE0E0E0))),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          Text(
                            '\$${carrito.totalPrecio.toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.')}',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => context.go('/pago'),
                        child: const Text('Proceder al pago'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
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
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: (color ?? IngenixTheme.texto).withOpacity(0.9),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icono, size: 16, color: Colors.white),
      ),
    );
  }
}
