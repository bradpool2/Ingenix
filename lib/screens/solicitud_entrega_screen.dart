import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';
import '../widgets/panel_sidebar.dart';

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
          () => _items = (data is List ? data : []).whereType<Map>().map((
            item,
          ) {
            final request = Map<String, dynamic>.from(item);
            // PostgreSQL convierte los alias sin comillas a minúsculas.
            // Se normalizan aquí para que la vista siempre use las mismas claves.
            request['idSolicitud'] ??= request['idsolicitud'];
            request['numeroOrden'] ??= request['numeroorden'];
            request['tecnicoAsignado'] ??= request['tecnico_asignado'];
            request['tecnicoNombre'] ??= request['nombretecnico'];
            return request;
          }).toList(),
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
    final payload = <String, dynamic>{'estado': state};
    if (item['estado'] == 'Pendiente' && state == 'En proceso') {
      payload['tecnico_asignado'] = auth.usuario?.nombre;
    }
    final response = await http.put(
      Uri.parse('${AppConstants.baseUrl}/solicitudes/$id/estado'),
      headers: {...auth.headers, 'Content-Type': 'application/json'},
      body: jsonEncode(payload),
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
      drawer: const Drawer(
        child: SafeArea(child: PanelSidebar(activeRoute: '/solicitud-entrega')),
      ),
      backgroundColor: IngenixTheme.fondo,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth > 900;
          final content = Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: ListView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 44,
                ),
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x14000000),
                          blurRadius: 22,
                          offset: Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Solicitud de entrega',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
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
                                onChanged: (value) =>
                                    setState(() => _search = value),
                                decoration: const InputDecoration(
                                  hintText: 'Número de orden',
                                  prefixIcon: Icon(Icons.search),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            SizedBox(
                              height: 48,
                              child: ElevatedButton(
                                onPressed: () => setState(() {}),
                                style: ElevatedButton.styleFrom(
                                  minimumSize: Size.zero,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 20,
                                  ),
                                ),
                                child: const Text('Buscar'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: states.map((state) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(state),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: _filter == state
                                        ? Colors.white.withValues(alpha: .35)
                                        : IngenixTheme.principal.withValues(
                                            alpha: .2,
                                          ),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    '${_items.where((item) => item['estado'] == state).length}',
                                    style: const TextStyle(fontSize: 10),
                                  ),
                                ),
                              ],
                            ),
                            selected: _filter == state,
                            selectedColor: IngenixTheme.principal,
                            backgroundColor: Colors.white,
                            side: const BorderSide(
                              color: IngenixTheme.secundario,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6),
                            ),
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
                    LayoutBuilder(
                      builder: (context, gridConstraints) {
                        final columns = gridConstraints.maxWidth >= 680
                            ? 3
                            : gridConstraints.maxWidth >= 450
                            ? 2
                            : 1;
                        final cardWidth =
                            (gridConstraints.maxWidth - (14 * (columns - 1))) /
                            columns;
                        return Wrap(
                          spacing: 14,
                          runSpacing: 14,
                          children: filtered
                              .map(
                                (item) => SizedBox(
                                  width: cardWidth,
                                  child: _DeliveryCard(
                                    item: item,
                                    isAdmin: isAdmin,
                                    onChange: (state) =>
                                        _changeState(item, state),
                                  ),
                                ),
                              )
                              .toList(),
                        );
                      },
                    ),
                ],
              ),
            ),
          );
          return wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(
                      width: 218,
                      child: PanelSidebar(activeRoute: '/solicitud-entrega'),
                    ),
                    Expanded(child: content),
                  ],
                )
              : content;
        },
      ),
    );
  }
}

class _DeliveryCard extends StatelessWidget {
  final Map<String, dynamic> item;
  final bool isAdmin;
  final ValueChanged<String> onChange;
  const _DeliveryCard({
    required this.item,
    required this.isAdmin,
    required this.onChange,
  });
  @override
  Widget build(BuildContext context) {
    final state = item['estado']?.toString() ?? 'Pendiente';
    final savedTotal = item['total_estimado'];
    final savedValue = num.tryParse(savedTotal?.toString() ?? '');
    final priceInDetail = RegExp(
      r'Precio estimado:\s*\$\s*([\d.,]+)',
    ).firstMatch(item['servicios']?.toString() ?? '');
    final total = savedValue != null && savedValue > 0
        ? savedTotal
        : priceInDetail?.group(1) ?? 0;
    String? actionLabel;
    String? nextState;
    IconData? actionIcon;
    if (!isAdmin) {
      switch (state) {
        case 'Pendiente':
          actionLabel = 'Tomar solicitud';
          nextState = 'En proceso';
          actionIcon = Icons.assignment_turned_in_outlined;
        case 'En proceso':
          actionLabel = 'Marcar como terminado';
          nextState = 'Terminado';
          actionIcon = Icons.task_alt_outlined;
        case 'Terminado':
          actionLabel = 'Enviar a revisión';
          nextState = 'En revision';
          actionIcon = Icons.send_outlined;
      }
    }
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD9E7E5)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0F263B39),
            blurRadius: 14,
            offset: Offset(0, 6),
          ),
        ],
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
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: IngenixTheme.texto,
                  ),
                ),
              ),
              _StatusBadge(state: state),
            ],
          ),
          const SizedBox(height: 10),
          _line('Urgencia', item['urgencia'] ?? 'Media'),
          _line('Cliente', item['clienteNombre'] ?? '—'),
          _line(
            'Técnico asignado',
            item['tecnicoNombre'] ?? item['tecnicoAsignado'] ?? '—',
          ),
          _line('Fecha', item['fecha_registro'] ?? item['fecha'] ?? '—'),
          _line('Servicios', item['servicios'] ?? '—'),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 3),
            child: Divider(height: 1, color: Color(0xFFE5EEEE)),
          ),
          _line('Total', '\$$total COP'),
          if (actionLabel != null) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 38,
              child: ElevatedButton.icon(
                onPressed: () => onChange(nextState!),
                icon: Icon(actionIcon, size: 16),
                label: Text(actionLabel),
                style: ElevatedButton.styleFrom(
                  minimumSize: Size.zero,
                  elevation: 0,
                  foregroundColor: IngenixTheme.texto,
                  textStyle: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
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
      style: const TextStyle(color: IngenixTheme.textoSec, fontSize: 12),
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
