import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';
import '../widgets/panel_sidebar.dart';

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
  String _filter = 'Todos';
  String _search = '';
  bool _executing = false;
  Map<String, dynamic>? _detail;
  final _searchController = TextEditingController();
  final _locationController = TextEditingController();
  final _noteController = TextEditingController();
  String _reviewState = 'Pendiente';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _locationController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final auth = context.read<AuthService>();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/solicitudes/almacenado'),
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

  Future<void> _runAutomaticStorage() async {
    setState(() => _executing = true);
    try {
      final auth = context.read<AuthService>();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/solicitudes/almacenado/ejecutar'),
        headers: auth.headers,
      );
      final body = response.body.isNotEmpty ? jsonDecode(response.body) : {};
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(body['error'] ?? 'No se pudo ejecutar el almacenado.');
      }
      if (mounted) setState(() => _error = body['message']?.toString());
      await _load();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _executing = false);
    }
  }

  void _openDetail(Map<String, dynamic> item) {
    setState(() {
      _detail = item;
      _locationController.text = item['ubicacion']?.toString() ?? '';
      _noteController.text = item['nota']?.toString() ?? '';
      _reviewState = item['estadoRevision']?.toString() ?? 'Pendiente';
    });
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Ficha de inventario #${item['numeroOrden'] ?? item['idSolicitud']}',
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: _reviewState,
                items: const ['Pendiente', 'En revisión', 'Listo para publicar']
                    .map(
                      (value) =>
                          DropdownMenuItem(value: value, child: Text(value)),
                    )
                    .toList(),
                onChanged: (value) =>
                    setState(() => _reviewState = value ?? 'Pendiente'),
                decoration: const InputDecoration(
                  labelText: 'Estado de revisión',
                ),
              ),
              TextField(
                controller: _locationController,
                decoration: const InputDecoration(
                  labelText: 'Ubicación física',
                ),
              ),
              TextField(
                controller: _noteController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Notas internas'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
          FilledButton(
            onPressed: _saveDetail,
            child: const Text('Guardar ficha'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveDetail() async {
    final id = _detail?['idSolicitud'];
    if (id == null) return;
    final auth = context.read<AuthService>();
    final response = await http.put(
      Uri.parse('${AppConstants.baseUrl}/solicitudes/$id/almacenado'),
      headers: {...auth.headers, 'Content-Type': 'application/json'},
      body: jsonEncode({
        'ubicacion': _locationController.text.trim(),
        'nota': _noteController.text.trim(),
        'estadoRevision': _reviewState,
      }),
    );
    if (!mounted) return;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      setState(() => _detail = null);
      Navigator.of(context).pop();
      await _load();
    } else {
      setState(() => _error = 'No se pudo guardar la ficha.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.trim().toLowerCase();
    final visible = _items.where((item) {
      final text = '${item['numeroOrden'] ?? ''} ${item['servicios'] ?? ''}'
          .toLowerCase();
      final review = item['estadoRevision']?.toString() ?? 'Pendiente';
      return text.contains(query) && (_filter == 'Todos' || review == _filter);
    }).toList();
    final rows = visible
        .map<DataRow>(
          (item) => DataRow(
            cells: [
              DataCell(
                Text('#${item['numeroOrden'] ?? item['idSolicitud'] ?? '-'}'),
              ),
              DataCell(
                Text(item['fechaRegistro']?.toString().split('T').first ?? '-'),
              ),
              DataCell(Text(item['servicios']?.toString() ?? '-')),
              DataCell(Text(item['estadoRevision']?.toString() ?? 'Pendiente')),
              DataCell(
                TextButton(
                  onPressed: () => _openDetail(item),
                  child: const Text('Ver ficha'),
                ),
              ),
            ],
          ),
        )
        .toList();
    return Scaffold(
      appBar: const NavBarWidget(),
      drawer: const Drawer(
        child: SafeArea(
          child: PanelSidebar(activeRoute: '/solicitudes-almacenadas'),
        ),
      ),
      backgroundColor: IngenixTheme.fondo,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth > 900;
          final content = RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 36),
              children: [
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  runSpacing: 12,
                  children: [
                    const Text(
                      'Solicitudes almacenadas',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: IngenixTheme.texto,
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: _executing ? null : _runAutomaticStorage,
                      icon: const Icon(Icons.auto_awesome, size: 17),
                      label: Text(
                        _executing ? 'Archivando...' : 'Ejecutar automático',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _searchController,
                      onChanged: (value) => setState(() => _search = value),
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search),
                        hintText: 'Buscar por orden o producto',
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: DropdownButton<String>(
                        value: _filter,
                        items:
                            [
                                  'Todos',
                                  'Pendiente',
                                  'En revisión',
                                  'Listo para publicar',
                                ]
                                .map(
                                  (value) => DropdownMenuItem(
                                    value: value,
                                    child: Text(value),
                                  ),
                                )
                                .toList(),
                        onChanged: (value) =>
                            setState(() => _filter = value ?? 'Todos'),
                      ),
                    ),
                  ],
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
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: DataTable(
                      columns: const [
                        DataColumn(label: Text('Orden')),
                        DataColumn(label: Text('Fecha')),
                        DataColumn(label: Text('Servicios')),
                        DataColumn(label: Text('Revisión')),
                        DataColumn(label: Text('Acciones')),
                      ],
                      rows: rows,
                    ),
                  ),
              ],
            ),
          );
          return wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(
                      width: 218,
                      child: PanelSidebar(
                        activeRoute: '/solicitudes-almacenadas',
                      ),
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
