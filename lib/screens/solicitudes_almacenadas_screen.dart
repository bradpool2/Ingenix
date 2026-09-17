import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';

class SolicitudesAlmacenadasScreen extends StatefulWidget {
  const SolicitudesAlmacenadasScreen({super.key});
  @override
  State<SolicitudesAlmacenadasScreen> createState() =>
      _SolicitudesAlmacenadasScreenState();
}

class _SolicitudesAlmacenadasScreenState
    extends State<SolicitudesAlmacenadasScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String? _error;
  String _filter = 'Todas';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final auth = context.read<AuthService>();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/api/mis-solicitudes'),
        headers: auth.headers,
      );
      if (response.statusCode == 200 && mounted) {
        final data = jsonDecode(response.body);
        setState(
          () => _items = (data is List ? data : [])
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList(),
        );
      } else if (mounted) {
        final body = response.body.isNotEmpty ? jsonDecode(response.body) : {};
        setState(
          () => _error =
              body['error']?.toString() ??
              body['message']?.toString() ??
              'No se pudieron cargar tus solicitudes.',
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'No se pudo conectar con el servidor.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = _filter == 'Todas'
        ? _items
        : _items.where((item) => item['estado'] == _filter).toList();
    return Scaffold(
      appBar: const NavBarWidget(),
      backgroundColor: IngenixTheme.fondo,
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 36),
          children: [
            const Text(
              'Solicitudes almacenadas',
              style: TextStyle(
                fontFamily: 'Georgia',
                fontSize: 34,
                fontWeight: FontWeight.bold,
                color: IngenixTheme.texto,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Consulta el estado y los detalles de tus solicitudes.',
              style: TextStyle(color: IngenixTheme.textoSec),
            ),
            const SizedBox(height: 24),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children:
                    [
                          'Todas',
                          'Pendiente',
                          'En proceso',
                          'Terminado',
                          'Entregado',
                          'Cancelado',
                        ]
                        .map(
                          (state) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(state),
                              selected: _filter == state,
                              onSelected: (_) =>
                                  setState(() => _filter = state),
                            ),
                          ),
                        )
                        .toList(),
              ),
            ),
            const SizedBox(height: 20),
            if (_loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_error != null)
              _ErrorState(message: _error!, onRetry: _load)
            else if (visible.isEmpty)
              const _EmptyState()
            else
              ...visible.map((item) => _requestCard(item)),
          ],
        ),
      ),
    );
  }

  Widget _requestCard(Map<String, dynamic> item) {
    final state = item['estado']?.toString() ?? 'Pendiente';
    final order = item['numeroOrden'] ?? item['idSolicitud'] ?? '—';
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDCEAE8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Orden #$order',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: IngenixTheme.texto,
                  ),
                ),
              ),
              _StatusBadge(state: state),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Servicios: ${item['servicios'] ?? '—'}',
            style: const TextStyle(color: IngenixTheme.textoSec),
          ),
          const SizedBox(height: 6),
          Text(
            'Fecha: ${item['fecha_registro'] ?? item['fecha'] ?? '—'}',
            style: const TextStyle(color: IngenixTheme.textoSec, fontSize: 13),
          ),
          const SizedBox(height: 6),
          Text(
            'Total: \$${item['total_estimado'] ?? 0} COP',
            style: const TextStyle(
              color: IngenixTheme.texto,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String state;
  const _StatusBadge({required this.state});
  @override
  Widget build(BuildContext context) {
    final color = state == 'Terminado' || state == 'Entregado'
        ? Colors.green
        : state == 'Cancelado'
        ? Colors.red
        : state == 'En proceso'
        ? Colors.orange
        : IngenixTheme.textoSec;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        state,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();
  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(40),
    child: Center(
      child: Text(
        'Aún no tienes solicitudes registradas.',
        style: TextStyle(color: IngenixTheme.textoSec),
      ),
    ),
  );
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(40),
    child: Column(
      children: [
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(color: IngenixTheme.error),
        ),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
      ],
    ),
  );
}
