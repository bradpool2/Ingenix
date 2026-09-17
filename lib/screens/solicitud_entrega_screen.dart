import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';

class SolicitudEntregaScreen extends StatefulWidget {
  const SolicitudEntregaScreen({super.key});
  @override
  State<SolicitudEntregaScreen> createState() => _SolicitudEntregaScreenState();
}

class _SolicitudEntregaScreenState extends State<SolicitudEntregaScreen> {
  List<Map<String, dynamic>> _items = [];
  bool _loading = true;
  String _filter = 'Pendiente';
  String _search = '';
  final _searchController = TextEditingController();

  final _adminStates = const [
    'Pendiente',
    'En proceso',
    'Terminado',
    'En revision',
    'Aprobado',
    'Entregado',
    'Cancelado',
  ];
  final _workerStates = const ['Pendiente', 'En proceso', 'Terminado'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final auth = context.read<AuthService>();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/solicitudes'),
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
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _changeState(Map<String, dynamic> item, String state) async {
    final id = item['idSolicitud'];
    if (id == null) return;
    final auth = context.read<AuthService>();
    final response = await http.put(
      Uri.parse('${AppConstants.baseUrl}/solicitudes/$id/estado'),
      headers: {...auth.headers, 'Content-Type': 'application/json'},
      body: jsonEncode({'estado': state}),
    );
    if (!mounted) return;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      await _load();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo cambiar el estado'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().usuario;
    final isAdmin = user?.esAdmin ?? false;
    final states = isAdmin ? _adminStates : _workerStates;
    final filtered = _items.where((item) {
      final stateMatch = item['estado'] == _filter;
      final query = _search.trim().toLowerCase();
      final text =
          '${item['numeroOrden'] ?? ''} ${item['idSolicitud'] ?? ''} ${item['servicios'] ?? ''}'
              .toLowerCase();
      return stateMatch && (query.isEmpty || text.contains(query));
    }).toList();

    return Scaffold(
      appBar: const NavBarWidget(),
      backgroundColor: IngenixTheme.fondo,
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 36),
        children: [
          const Text(
            'Solicitud de entrega',
            style: TextStyle(
              fontFamily: 'Georgia',
              fontSize: 34,
              fontWeight: FontWeight.bold,
              color: IngenixTheme.texto,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Busca una orden o filtra las solicitudes por estado.',
            style: TextStyle(color: IngenixTheme.textoSec),
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  onChanged: (value) => setState(() => _search = value),
                  decoration: const InputDecoration(
                    hintText: 'Número de orden',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              IconButton(
                onPressed: () {
                  _searchController.clear();
                  setState(() => _search = '');
                },
                icon: const Icon(Icons.clear),
                tooltip: 'Limpiar',
              ),
            ],
          ),
          const SizedBox(height: 16),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: states.map((state) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(state),
                    selected: _filter == state,
                    onSelected: (_) => setState(() => _filter = state),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 22),
          if (_loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: CircularProgressIndicator(),
              ),
            )
          else if (filtered.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(40),
                child: Text(
                  'No hay solicitudes en estado "$_filter".',
                  style: const TextStyle(color: IngenixTheme.textoSec),
                ),
              ),
            )
          else
            ...filtered.map(
              (item) => _DeliveryCard(
                item: item,
                isAdmin: isAdmin,
                allowedStates: states,
                onChange: (state) => _changeState(item, state),
              ),
            ),
        ],
      ),
    );
  }
}

class _DeliveryCard extends StatelessWidget {
  final Map<String, dynamic> item;
  final bool isAdmin;
  final List<String> allowedStates;
  final ValueChanged<String> onChange;
  const _DeliveryCard({
    required this.item,
    required this.isAdmin,
    required this.allowedStates,
    required this.onChange,
  });
  @override
  Widget build(BuildContext context) {
    final state = item['estado']?.toString() ?? 'Pendiente';
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
                  'Orden #${item['numeroOrden'] ?? item['idSolicitud'] ?? '—'}',
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
          _line('Urgencia', item['urgencia'] ?? 'Media'),
          _line('Cliente', item['clienteNombre'] ?? '—'),
          _line(
            'Técnico asignado',
            item['tecnicoNombre'] ?? item['tecnicoAsignado'] ?? '—',
          ),
          _line('Fecha', item['fecha_registro'] ?? item['fecha'] ?? '—'),
          _line('Servicios', item['servicios'] ?? '—'),
          _line('Total', '\$${item['total_estimado'] ?? 0} COP'),
          if (state != 'Entregado' && state != 'Cancelado') ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: allowedStates.contains(state)
                  ? state
                  : allowedStates.first,
              decoration: const InputDecoration(
                labelText: 'Cambiar estado',
                isDense: true,
              ),
              items: allowedStates
                  .map(
                    (option) =>
                        DropdownMenuItem(value: option, child: Text(option)),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null && value != state) onChange(value);
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _line(String label, dynamic value) => Padding(
    padding: const EdgeInsets.only(bottom: 5),
    child: Text(
      '$label: ${value ?? '—'}',
      style: const TextStyle(color: IngenixTheme.textoSec, fontSize: 13),
    ),
  );
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
