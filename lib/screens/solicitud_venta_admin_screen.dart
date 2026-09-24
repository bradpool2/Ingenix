import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';
import '../widgets/panel_sidebar.dart';

class SolicitudVentaAdminScreen extends StatefulWidget {
  const SolicitudVentaAdminScreen({super.key});

  @override
  State<SolicitudVentaAdminScreen> createState() =>
      _SolicitudVentaAdminScreenState();
}

class _SolicitudVentaAdminScreenState extends State<SolicitudVentaAdminScreen> {
  List<Map<String, dynamic>> _solicitudes = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    if (mounted) setState(() => _error = null);
    try {
      final auth = context.read<AuthService>();
      final respuesta = await http.get(
        Uri.parse('${AppConstants.baseUrl}/solicitudes'),
        headers: auth.headers,
      );
      final datos = respuesta.body.isEmpty ? null : jsonDecode(respuesta.body);
      if (!mounted) return;
      if (respuesta.statusCode == 200 && datos is List) {
        setState(() {
          _solicitudes = datos
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .where(_esVenta)
              .toList();
        });
      } else {
        final mensaje = datos is Map
            ? datos['error'] ?? datos['message']
            : null;
        setState(
          () => _error =
              mensaje?.toString() ?? 'No se pudieron cargar las solicitudes.',
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'No se pudo conectar con el servidor.');
      }
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  bool _esVenta(Map<String, dynamic> solicitud) {
    final tipo = solicitud['tipo']?.toString().trim().toLowerCase();
    return tipo == '4' || tipo == 'venta';
  }

  Future<void> _cambiarEstado(
    Map<String, dynamic> solicitud,
    String estado,
  ) async {
    final id = solicitud['idSolicitud'];
    if (id == null) return;
    final auth = context.read<AuthService>();
    try {
      final respuesta = await http.put(
        Uri.parse('${AppConstants.baseUrl}/solicitudes/$id/estado'),
        headers: auth.headers,
        body: jsonEncode({'estado': estado}),
      );
      if (!mounted) return;
      if (respuesta.statusCode >= 200 && respuesta.statusCode < 300) {
        await _cargar();
      } else {
        _mostrarError(respuesta.body, 'No se pudo actualizar la solicitud.');
      }
    } catch (_) {
      if (mounted) _mostrarMensaje('No se pudo conectar con el servidor.');
    }
  }

  Future<void> _verDetalle(Map<String, dynamic> solicitud) async {
    final id = solicitud['idSolicitud'];
    if (id == null) return;
    try {
      final auth = context.read<AuthService>();
      final respuesta = await http.get(
        Uri.parse('${AppConstants.baseUrl}/solicitudes/$id'),
        headers: auth.headers,
      );
      final datos = respuesta.body.isEmpty ? null : jsonDecode(respuesta.body);
      if (!mounted) return;
      if (respuesta.statusCode == 200 && datos is Map) {
        await showDialog<void>(
          context: context,
          builder: (_) => _VentaDetalleDialog(
            detalle: Map<String, dynamic>.from(datos),
            onGuardarContraoferta: _guardarContraoferta,
            onGuardarPrecioFinal: _guardarPrecioFinal,
          ),
        );
        await _cargar();
      } else {
        _mostrarError(respuesta.body, 'No se pudo cargar el detalle.');
      }
    } catch (_) {
      if (mounted) _mostrarMensaje('No se pudo conectar con el servidor.');
    }
  }

  Future<String?> _guardarContraoferta(
    int id,
    double monto,
    String comentario,
  ) async {
    final auth = context.read<AuthService>();
    try {
      final respuesta = await http.post(
        Uri.parse('${AppConstants.baseUrl}/solicitudes/$id/contraoferta'),
        headers: auth.headers,
        body: jsonEncode({'monto': monto, 'comentario': comentario}),
      );
      if (respuesta.statusCode >= 200 && respuesta.statusCode < 300) {
        return null;
      }
      return _mensajeRespuesta(
        respuesta.body,
        'No se pudo guardar la contraoferta.',
      );
    } catch (_) {
      return 'No se pudo conectar con el servidor.';
    }
  }

  Future<String?> _guardarPrecioFinal(int id, double? precioFinal) async {
    final auth = context.read<AuthService>();
    try {
      final respuesta = await http.put(
        Uri.parse('${AppConstants.baseUrl}/solicitudes/$id/venta'),
        headers: auth.headers,
        body: jsonEncode({'precioFinal': precioFinal}),
      );
      if (respuesta.statusCode >= 200 && respuesta.statusCode < 300) {
        return null;
      }
      return _mensajeRespuesta(
        respuesta.body,
        'No se pudo guardar el precio final.',
      );
    } catch (_) {
      return 'No se pudo conectar con el servidor.';
    }
  }

  String _mensajeRespuesta(String body, String fallback) {
    try {
      final datos = jsonDecode(body);
      if (datos is Map) {
        return (datos['error'] ?? datos['message'] ?? fallback).toString();
      }
    } catch (_) {}
    return fallback;
  }

  void _mostrarError(String body, String fallback) =>
      _mostrarMensaje(_mensajeRespuesta(body, fallback));

  void _mostrarMensaje(String mensaje) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(mensaje)));
  }

  @override
  Widget build(BuildContext context) {
    final contenido = RefreshIndicator(
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text(
            'Solicitudes de venta',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: IngenixTheme.texto,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Revisa las ofertas de los clientes, envía contraofertas y registra el precio final de compra.',
            style: TextStyle(color: IngenixTheme.textoSec),
          ),
          const SizedBox(height: 24),
          if (_cargando)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(48),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_error != null)
            _ErrorState(message: _error!, onRetry: _cargar)
          else if (_solicitudes.isEmpty)
            const _EmptyState()
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: const [
                  DataColumn(label: Text('Orden')),
                  DataColumn(label: Text('Cliente')),
                  DataColumn(label: Text('Artículo / detalle')),
                  DataColumn(label: Text('Fecha')),
                  DataColumn(label: Text('Acciones')),
                ],
                rows: _solicitudes.map(_fila).toList(),
              ),
            ),
        ],
      ),
    );
    return Scaffold(
      appBar: const NavBarWidget(),
      drawer: const Drawer(
        child: SafeArea(
          child: PanelSidebar(activeRoute: '/solicitud-venta-admin'),
        ),
      ),
      backgroundColor: IngenixTheme.fondo,
      body: LayoutBuilder(
        builder: (context, constraints) => constraints.maxWidth > 900
            ? Row(
                children: [
                  const SizedBox(
                    width: 218,
                    child: PanelSidebar(activeRoute: '/solicitud-venta-admin'),
                  ),
                  Expanded(child: contenido),
                ],
              )
            : contenido,
      ),
    );
  }

  DataRow _fila(Map<String, dynamic> solicitud) {
    final estado = solicitud['estado']?.toString() ?? 'Pendiente';
    return DataRow(
      cells: [
        DataCell(
          Text(
            '#${solicitud['numeroOrden'] ?? solicitud['idSolicitud'] ?? '—'}',
          ),
        ),
        DataCell(Text(solicitud['clienteNombre']?.toString() ?? '—')),
        DataCell(
          SizedBox(
            width: 230,
            child: Text(
              solicitud['servicios']?.toString() ?? '—',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),
        DataCell(
          Text(
            _fecha(solicitud['fechaRegistro'] ?? solicitud['fecha_registro']),
          ),
        ),
        DataCell(
          Row(
            children: [
              TextButton(
                onPressed: () => _verDetalle(solicitud),
                child: const Text('Ver detalle'),
              ),
              const SizedBox(width: 8),
              DropdownButton<String>(
                value: _estadosVenta.contains(estado) ? estado : 'Pendiente',
                items: _estadosVenta
                    .map(
                      (item) => DropdownMenuItem(
                        value: item,
                        child: Text(_etiquetaEstado(item)),
                      ),
                    )
                    .toList(),
                onChanged: (valor) {
                  if (valor != null && valor != estado) {
                    _cambiarEstado(solicitud, valor);
                  }
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _fecha(dynamic value) {
    final fecha = DateTime.tryParse(value?.toString() ?? '');
    if (fecha == null) return '—';
    return '${fecha.day.toString().padLeft(2, '0')}/${fecha.month.toString().padLeft(2, '0')}/${fecha.year}';
  }
}

const _estadosVenta = ['Pendiente', 'En revision', 'Aprobado', 'Cancelado'];

String _etiquetaEstado(String estado) => switch (estado) {
  'Pendiente' => 'Recibida',
  'En revision' => 'En revisión de oferta',
  'Aprobado' => 'Oferta aprobada',
  'Cancelado' => 'Oferta rechazada',
  _ => estado,
};

class _VentaDetalleDialog extends StatefulWidget {
  const _VentaDetalleDialog({
    required this.detalle,
    required this.onGuardarContraoferta,
    required this.onGuardarPrecioFinal,
  });
  final Map<String, dynamic> detalle;
  final Future<String?> Function(int id, double monto, String comentario)
  onGuardarContraoferta;
  final Future<String?> Function(int id, double? precioFinal)
  onGuardarPrecioFinal;

  @override
  State<_VentaDetalleDialog> createState() => _VentaDetalleDialogState();
}

class _VentaDetalleDialogState extends State<_VentaDetalleDialog> {
  late final TextEditingController _contraoferta;
  late final TextEditingController _comentario;
  late final TextEditingController _precioFinal;
  bool _guardandoContraoferta = false;
  bool _guardandoPrecio = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _contraoferta = TextEditingController(
      text: widget.detalle['contraoferta']?.toString() ?? '',
    );
    _comentario = TextEditingController(
      text: widget.detalle['comentarioContraoferta']?.toString() ?? '',
    );
    _precioFinal = TextEditingController(
      text: widget.detalle['precioFinal']?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _contraoferta.dispose();
    _comentario.dispose();
    _precioFinal.dispose();
    super.dispose();
  }

  Future<void> _enviarContraoferta() async {
    final monto = double.tryParse(_contraoferta.text.trim());
    if (monto == null || monto < 0) {
      return setState(
        () => _error = 'Ingresa un monto válido para la contraoferta.',
      );
    }
    setState(() {
      _guardandoContraoferta = true;
      _error = null;
    });
    final error = await widget.onGuardarContraoferta(
      widget.detalle['idSolicitud'] as int,
      monto,
      _comentario.text.trim(),
    );
    if (mounted) {
      setState(() {
        _guardandoContraoferta = false;
        _error = error;
      });
    }
  }

  Future<void> _guardarPrecio() async {
    final texto = _precioFinal.text.trim();
    final precio = texto.isEmpty ? null : double.tryParse(texto);
    if (texto.isNotEmpty && (precio == null || precio < 0)) {
      return setState(() => _error = 'Ingresa un precio final válido.');
    }
    setState(() {
      _guardandoPrecio = true;
      _error = null;
    });
    final error = await widget.onGuardarPrecioFinal(
      widget.detalle['idSolicitud'] as int,
      precio,
    );
    if (mounted) {
      setState(() {
        _guardandoPrecio = false;
        _error = error;
      });
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(
      'Solicitud #${widget.detalle['numeroOrden'] ?? widget.detalle['idSolicitud']}',
    ),
    content: SizedBox(
      width: 540,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _dato('Cliente', widget.detalle['clienteNombre']),
            _dato('Artículo', widget.detalle['nombreArticulo']),
            _dato(
              'Descripción',
              widget.detalle['descripcion'] ?? widget.detalle['servicios'],
            ),
            _dato('Estado del artículo', widget.detalle['estadoArticulo']),
            if (_imagenes().isNotEmpty) ...[
              const Divider(height: 24),
              const Text(
                'Imágenes del cliente',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: IngenixTheme.texto,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _imagenes()
                    .map(
                      (url) => ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          _urlImagen(url),
                          width: 150,
                          height: 110,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 150,
                            height: 110,
                            color: Colors.black12,
                            alignment: Alignment.center,
                            child: const Icon(Icons.broken_image_outlined),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ],
            _dato(
              'Precio ofrecido por el cliente',
              _moneda(
                widget.detalle['precioCliente'] ??
                    widget.detalle['precioEstimado'],
              ),
            ),
            const Divider(height: 32),
            const Text(
              'Contraoferta',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: IngenixTheme.texto,
              ),
            ),
            TextField(
              controller: _contraoferta,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Monto propuesto'),
            ),
            TextField(
              controller: _comentario,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Mensaje para el cliente',
                hintText: 'Explica las condiciones de la oferta.',
              ),
            ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: _guardandoContraoferta ? null : _enviarContraoferta,
              child: Text(
                _guardandoContraoferta ? 'Enviando...' : 'Enviar contraoferta',
              ),
            ),
            const Divider(height: 32),
            TextField(
              controller: _precioFinal,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Precio final de compra',
              ),
            ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: _guardandoPrecio ? null : _guardarPrecio,
              child: Text(
                _guardandoPrecio ? 'Guardando...' : 'Guardar precio final',
              ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  _error!,
                  style: const TextStyle(color: IngenixTheme.error),
                ),
              ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cerrar'),
      ),
    ],
  );

  Widget _dato(String etiqueta, dynamic valor) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text('$etiqueta: ${valor ?? '—'}'),
  );

  List<String> _imagenes() {
    final value = widget.detalle['imagenes'];
    if (value is List) {
      return value.map((url) => url.toString()).where((url) => url.isNotEmpty).toList();
    }
    final imagen = widget.detalle['imagen']?.toString() ?? '';
    return imagen.isEmpty ? [] : imagen.split(',').map((url) => url.trim()).toList();
  }

  String _urlImagen(String url) =>
      url.startsWith('http') ? url : '${AppConstants.baseUrl}$url';

  String _moneda(dynamic valor) {
    final numero = num.tryParse(valor?.toString() ?? '');
    return numero == null
        ? 'No especificado'
        : '\$${numero.toStringAsFixed(0)} COP';
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();
  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(48),
    child: Center(
      child: Text(
        'No hay solicitudes de venta para mostrar.',
        style: TextStyle(color: IngenixTheme.textoSec),
      ),
    ),
  );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(48),
    child: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
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
    ),
  );
}
