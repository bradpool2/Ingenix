import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../services/carrito_service.dart';

class CarritoPlegableScreen extends StatelessWidget {
  final VoidCallback? onClose;

  const CarritoPlegableScreen({super.key, this.onClose});

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

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 360),
      child: Padding(
        padding: const EdgeInsets.only(top: 86),
        child: DefaultTextStyle.merge(
          style: const TextStyle(
            color: IngenixTheme.texto,
            decoration: TextDecoration.none,
          ),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
            decoration: BoxDecoration(
              color: IngenixTheme.blanco,
              borderRadius: BorderRadius.circular(12),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x26000000),
                  blurRadius: 18,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: carrito.items.isEmpty
                ? const _CarritoPlegableVacio()
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Mi Carrito',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 17,
                          color: IngenixTheme.texto,
                          decoration: TextDecoration.none,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxHeight: 300),
                        child: ListView.separated(
                          shrinkWrap: true,
                          itemCount: carrito.items.length,
                          separatorBuilder: (_, __) =>
                              const Divider(height: 20),
                          itemBuilder: (_, index) {
                            final item = carrito.items[index];
                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.producto.nombre,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          color: IngenixTheme.texto,
                                          decoration: TextDecoration.none,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Cantidad: ${item.cantidad}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: IngenixTheme.textoSec,
                                          decoration: TextDecoration.none,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                SizedBox(
                                  width: 108,
                                  child: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    alignment: Alignment.centerRight,
                                    child: Text(
                                      _formatoMoneda(item.subtotal),
                                      maxLines: 1,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: IngenixTheme.texto,
                                        decoration: TextDecoration.none,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                      const Divider(height: 24),
                      Row(
                        children: [
                          const Text(
                            'Total:',
                            style: TextStyle(
                              fontSize: 14,
                              color: IngenixTheme.texto,
                              decoration: TextDecoration.none,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: SizedBox(
                              height: 22,
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.centerRight,
                                child: Text(
                                  _formatoMoneda(carrito.totalPrecio),
                                  maxLines: 1,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: IngenixTheme.texto,
                                    decoration: TextDecoration.none,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: ElevatedButton(
                          onPressed: () {
                            onClose?.call();
                            context.go('/carrito');
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: IngenixTheme.principal,
                            foregroundColor: IngenixTheme.texto,
                            textStyle: const TextStyle(
                              decoration: TextDecoration.none,
                            ),
                          ),
                          child: const Text('Ver carrito'),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

class _CarritoPlegableVacio extends StatelessWidget {
  const _CarritoPlegableVacio();

  @override
  Widget build(BuildContext context) {
    return const Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'Mi Carrito',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 18,
            height: 1.2,
            color: IngenixTheme.texto,
            decoration: TextDecoration.none,
            fontWeight: FontWeight.bold,
          ),
        ),
        SizedBox(height: 18),
        Text(
          'Tu carrito está vacío',
          textAlign: TextAlign.center,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 14,
            height: 1.2,
            color: IngenixTheme.textoSec,
            decoration: TextDecoration.none,
          ),
        ),
      ],
    );
  }
}
