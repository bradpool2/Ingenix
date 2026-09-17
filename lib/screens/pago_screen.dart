import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../services/carrito_service.dart';
import '../widgets/navbar_widget.dart';
import 'package:intl/intl.dart';

class PagoScreen extends StatefulWidget {
  const PagoScreen({super.key});

  @override
  State<PagoScreen> createState() => _PagoScreenState();
}

class _PagoScreenState extends State<PagoScreen> {
  int _paso = 1;
  String _metodo = '';
  final _detalleCtrl = TextEditingController();
  bool _procesando = false;
  String _referencia = '';

  String _formatoMoneda(double valor) => NumberFormat.currency(
    locale: 'es_CO',
    symbol: '\$',
    decimalDigits: 0,
  ).format(valor);

  static const _metodos = [
    {'id': 'Nequi', 'campo': 'telefono', 'label': 'Número de teléfono Nequi'},
    {
      'id': 'Daviplata',
      'campo': 'telefono',
      'label': 'Número de teléfono Daviplata',
    },
    {'id': 'PSE', 'campo': 'cuenta', 'label': 'Número de cuenta bancaria'},
    {'id': 'Tarjeta crédito', 'campo': 'tarjeta', 'label': 'Número de tarjeta'},
    {'id': 'Tarjeta débito', 'campo': 'tarjeta', 'label': 'Número de tarjeta'},
    {'id': 'Efectivo', 'campo': null, 'label': null},
  ];

  @override
  void dispose() {
    _detalleCtrl.dispose();
    super.dispose();
  }

  Future<void> _confirmarPago() async {
    final auth = context.read<AuthService>();
    final carrito = context.read<CarritoService>();

    setState(() => _procesando = true);

    try {
      final res = await http.post(
        Uri.parse('${AppConstants.baseUrl}/venta'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'idUsuario': auth.usuario!.idUsuario,
          'total': carrito.totalPrecio,
          'metodoPago': _metodo,
          'detallePago': _detalleCtrl.text.isEmpty ? null : _detalleCtrl.text,
          'productos': carrito.items.map((i) => i.toJson()).toList(),
        }),
      );

      if (!mounted) return;

      if (res.statusCode == 201) {
        final data = jsonDecode(res.body);
        _referencia = data['referencia'] ?? '';

        final lista = carrito.items
            .map((i) => '• ${i.producto.nombre} x${i.cantidad}')
            .join('\n');

        await showDialog(
          context: context,
          builder: (dialogContext) => AlertDialog(
            title: const Text('✅ ¡Compra exitosa!'),
            content: Text(
              'Has comprado:\n\n$lista\n\nTotal: \$${carrito.totalPrecio.toStringAsFixed(0)}\nReferencia: $_referencia',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Aceptar'),
              ),
            ],
          ),
        );

        if (!mounted) return;
        carrito.vaciar();
        setState(() => _paso = 3);
      } else {
        final data = jsonDecode(res.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              data['message'] ?? data['error'] ?? 'Error al procesar el pago',
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo conectar al servidor'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final carrito = context.watch<CarritoService>();

    return Scaffold(
      appBar: const NavBarWidget(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 480),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: IngenixTheme.principal.withAlpha(77)),
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_paso == 1) _buildResumen(carrito),
                if (_paso == 2) _buildMetodoPago(carrito),
                if (_paso == 3) _buildConfirmacion(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildResumen(CarritoService carrito) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Resumen del pedido',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),
        ...carrito.items.map(
          (item) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.producto.nombre,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    Text(
                      'x${item.cantidad} unidades',
                      style: const TextStyle(
                        fontSize: 12,
                        color: IngenixTheme.textoSec,
                      ),
                    ),
                  ],
                ),
                Text(
                  '\$${item.subtotal.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),
        const Divider(thickness: 2),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Total',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              '\$${carrito.totalPrecio.toStringAsFixed(0)}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: () => setState(() => _paso = 2),
          child: const Text('Continuar al pago'),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () => context.go('/carrito'),
          child: const Text('Volver al carrito'),
        ),
      ],
    );
  }

  Widget _buildMetodoPago(CarritoService carrito) {
    // Obtener info del método seleccionado
    Map<String, dynamic>? metodoInfo;
    if (_metodo.isNotEmpty) {
      metodoInfo = _metodos.firstWhere(
        (m) => m['id'] == _metodo,
        orElse: () => {},
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Método de pago',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 20),
        ..._metodos.map((m) {
          final id = m['id'] as String;
          final activo = _metodo == id;
          return GestureDetector(
            onTap: () => setState(() {
              _metodo = id;
              _detalleCtrl.clear();
            }),
            child: Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: activo
                    ? IngenixTheme.principal.withAlpha(25)
                    : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: activo
                      ? IngenixTheme.principal
                      : const Color(0xFFDDDDDD),
                  width: activo ? 2 : 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: IngenixTheme.texto, width: 2),
                      color: activo ? IngenixTheme.texto : Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  _logoMetodo(id),
                  const SizedBox(width: 10),
                  Text(
                    id,
                    style: TextStyle(
                      fontWeight: activo ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),

        // Campo dinámico según método
        if (metodoInfo != null && metodoInfo['campo'] != null) ...[
          const SizedBox(height: 12),
          Text(
            metodoInfo['label'] as String,
            style: const TextStyle(fontSize: 13, color: IngenixTheme.textoSec),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _detalleCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              hintText: metodoInfo['label'] as String,
            ),
          ),
        ],

        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: IngenixTheme.principal.withAlpha(25),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: IngenixTheme.principal.withAlpha(100)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total a pagar:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(
                _formatoMoneda(carrito.totalPrecio),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _procesando || _metodo.isEmpty ? null : _confirmarPago,
          child: _procesando
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text('Confirmar pago'),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () => setState(() => _paso = 1),
          child: const Text('Volver'),
        ),
      ],
    );
  }

  Widget _logoMetodo(String id) {
    final asset = switch (id) {
      'Nequi' => 'assets/images/nequi.svg',
      'Daviplata' => 'assets/images/daviplata.png',
      'PSE' => 'assets/images/pse.png',
      'Tarjeta crédito' => 'assets/images/TC.png',
      'Tarjeta débito' => 'assets/images/debito.png',
      _ => 'assets/images/dinero.png',
    };

    if (asset.endsWith('.svg')) {
      return SvgPicture.asset(
        asset,
        width: 30,
        height: 24,
        fit: BoxFit.contain,
      );
    }
    return Image.asset(asset, width: 30, height: 24, fit: BoxFit.contain);
  }

  Widget _buildConfirmacion() {
    return Column(
      children: [
        const Icon(Icons.check_circle, size: 80, color: IngenixTheme.principal),
        const SizedBox(height: 16),
        const Text(
          '¡Pago exitoso!',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Tu pedido fue registrado correctamente.',
          textAlign: TextAlign.center,
        ),
        if (_referencia.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            'Referencia: $_referencia',
            style: const TextStyle(color: IngenixTheme.textoSec, fontSize: 13),
          ),
        ],
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => context.go('/home'),
          child: const Text('Volver al inicio'),
        ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () => context.go('/catalogo'),
          child: const Text('Seguir comprando'),
        ),
      ],
    );
  }
}
