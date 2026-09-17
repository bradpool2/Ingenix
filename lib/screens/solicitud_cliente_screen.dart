import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';
import 'solicitud_cliente_mantenimiento.dart';
import 'solicitud_cliente_venta.dart';

class SolicitudClienteScreen extends StatefulWidget {
  const SolicitudClienteScreen({super.key});

  @override
  State<SolicitudClienteScreen> createState() => _SolicitudClienteScreenState();
}

class _SolicitudClienteScreenState extends State<SolicitudClienteScreen> {
  final _nombreCtrl = TextEditingController();
  final _descripcionCtrl = TextEditingController();
  final _precioCtrl = TextEditingController();
  final _picker = ImagePicker();

  String? _tipo;
  String _urgencia = 'Media';
  String _estadoArticulo = '';
  XFile? _imagen;
  Uint8List? _imagenBytes;
  bool _enviando = false;
  String? _error;
  int? _numeroOrden;
  List<Map<String, dynamic>> _solicitudesRecientes = [];
  bool _cargandoSolicitudes = true;

  @override
  void initState() {
    super.initState();
    _cargarSolicitudesRecientes();
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _descripcionCtrl.dispose();
    _precioCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargarSolicitudesRecientes() async {
    final auth = context.read<AuthService>();
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/api/mis-solicitudes'),
        headers: auth.headers,
      );
      if (!mounted) return;
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _solicitudesRecientes = (data is List ? data : [])
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList();
        });
      }
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() => _cargandoSolicitudes = false);
      }
    }
  }

  void _seleccionarTipo(String tipo) {
    setState(() {
      _tipo = tipo;
      _error = null;
      _numeroOrden = null;
      _nombreCtrl.clear();
      _descripcionCtrl.clear();
      _precioCtrl.clear();
      _imagen = null;
      _imagenBytes = null;
      _urgencia = 'Media';
      _estadoArticulo = '';
    });

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final formContent = tipo == 'mantenimiento'
                ? SolicitudClienteMantenimientoForm(
                    nombreController: _nombreCtrl,
                    descripcionController: _descripcionCtrl,
                    precioController: _precioCtrl,
                    urgencia: _urgencia,
                    imagen: _imagen,
                    imagenBytes: _imagenBytes,
                    onUrgenciaChanged: (value) {
                      setState(() => _urgencia = value);
                      setDialogState(() => _urgencia = value);
                    },
                    onImageTap: () async {
                      final picked = await _picker.pickImage(
                        source: ImageSource.gallery,
                        imageQuality: 80,
                        maxWidth: 1600,
                      );
                      if (picked == null) return;

                      final bytes = await picked.readAsBytes();
                      if (!mounted) return;

                      setState(() {
                        _imagen = picked;
                        _imagenBytes = bytes;
                      });
                      setDialogState(() {
                        _imagen = picked;
                        _imagenBytes = bytes;
                      });
                    },
                    onBack: () {
                      Navigator.of(dialogContext).pop();
                      setState(() {
                        _tipo = null;
                        _error = null;
                      });
                    },
                    onSubmit: () async {
                      Navigator.of(dialogContext).pop();
                      await _enviar();
                    },
                    enviando: _enviando,
                  )
                : SolicitudClienteVentaForm(
                    nombreController: _nombreCtrl,
                    descripcionController: _descripcionCtrl,
                    precioController: _precioCtrl,
                    estadoArticulo: _estadoArticulo,
                    imagen: _imagen,
                    imagenBytes: _imagenBytes,
                    onEstadoChanged: (value) {
                      setState(() => _estadoArticulo = value);
                      setDialogState(() => _estadoArticulo = value);
                    },
                    onImageTap: () async {
                      final picked = await _picker.pickImage(
                        source: ImageSource.gallery,
                        imageQuality: 80,
                        maxWidth: 1600,
                      );
                      if (picked == null) return;

                      final bytes = await picked.readAsBytes();
                      if (!mounted) return;

                      setState(() {
                        _imagen = picked;
                        _imagenBytes = bytes;
                      });
                      setDialogState(() {
                        _imagen = picked;
                        _imagenBytes = bytes;
                      });
                    },
                    onBack: () {
                      Navigator.of(dialogContext).pop();
                      setState(() {
                        _tipo = null;
                        _error = null;
                      });
                    },
                    onSubmit: () async {
                      Navigator.of(dialogContext).pop();
                      await _enviar();
                    },
                    enviando: _enviando,
                  );

            return Dialog(
              insetPadding: const EdgeInsets.all(20),
              backgroundColor: Colors.transparent,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 620),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: formContent,
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _enviar() async {
    final nombre = _nombreCtrl.text.trim();
    final descripcion = _descripcionCtrl.text.trim();

    if (_tipo == null || nombre.isEmpty || descripcion.isEmpty) {
      setState(() => _error = 'Completa los campos obligatorios.');
      return;
    }

    setState(() {
      _enviando = true;
      _error = null;
    });

    final auth = context.read<AuthService>();

    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConstants.baseUrl}/api/venta'),
      )
        ..headers['Authorization'] = 'Bearer ${auth.token}'
        ..fields['tipo'] = _tipo!
        ..fields['nombreArticulo'] = nombre
        ..fields['descripcion'] = descripcion;

      if (_tipo == 'mantenimiento') {
        request.fields['urgencia'] = _urgencia;
      } else {
        if (_estadoArticulo.isNotEmpty) {
          request.fields['estadoArticulo'] = _estadoArticulo;
        }
        if (_precioCtrl.text.trim().isNotEmpty) {
          request.fields['precioEstimado'] = _precioCtrl.text.trim();
        }
      }

      if (_imagen != null) {
        final imagenBytes = _imagenBytes ?? await _imagen!.readAsBytes();
        final nombreArchivo = _imagen!.name.isNotEmpty
            ? _imagen!.name
            : 'imagen_${DateTime.now().millisecondsSinceEpoch}.jpg';
        final extension = nombreArchivo.split('.').last.toLowerCase();
        final tipoImagen = switch (extension) {
          'png' => http.MediaType('image', 'png'),
          'webp' => http.MediaType('image', 'webp'),
          _ => http.MediaType('image', 'jpeg'),
        };
        request.files.add(
          http.MultipartFile.fromBytes(
            'imagen',
            imagenBytes,
            filename: nombreArchivo,
            contentType: tipoImagen,
          ),
        );
      }

      final response = await http.Response.fromStream(await request.send());
      if (!mounted) return;

      Map<String, dynamic> data = {};
      if (response.body.isNotEmpty) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map) {
          data = Map<String, dynamic>.from(decoded);
        }
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        setState(() {
          _numeroOrden = data['numeroOrden'] is int
              ? data['numeroOrden'] as int
              : int.tryParse(data['numeroOrden']?.toString() ?? '');
          _tipo = null;
          _enviando = false;
        });
        await _cargarSolicitudesRecientes();
      } else {
        setState(() {
            _error = data['error']?.toString() ??
              data['message']?.toString() ??
              'No se pudo enviar la solicitud (${response.statusCode}).';
          _enviando = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'No se pudo conectar con el servidor. Intenta de nuevo.';
          _enviando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: Theme.of(context).textTheme.apply(fontFamily: 'Roboto'),
      ),
      child: Scaffold(
        appBar: const NavBarWidget(),
        backgroundColor: IngenixTheme.fondo,
        body: LayoutBuilder(
          builder: (context, constraints) {
            final horizontal = constraints.maxWidth > 900 ? 80.0 : 22.0;
            return SizedBox.expand(
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: horizontal,
                  vertical: 42,
                ),
                child: SingleChildScrollView(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 980),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Nueva solicitud',
                            style: TextStyle(
                              color: IngenixTheme.texto,
                              fontFamily: 'Georgia',
                              fontSize: 38,
                              fontWeight: FontWeight.bold,
                              height: 1.15,
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'Cuéntanos qué necesitas y te contactaremos lo antes posible.',
                            style: TextStyle(
                              color: IngenixTheme.textoSec,
                              fontSize: 15,
                              height: 1.5,
                            ),
                          ),
                          const SizedBox(height: 30),
                          if (_numeroOrden != null)
                            _SuccessBanner(numeroOrden: _numeroOrden!),
                          if (_error != null) ...[
                            _ErrorBanner(message: _error!),
                            const SizedBox(height: 18),
                          ],
                          _TypeSelector(onSelect: _seleccionarTipo),
                          const SizedBox(height: 52),
                          _RecentRequestsSection(
                            items: _solicitudesRecientes,
                            cargando: _cargandoSolicitudes,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _TypeSelector extends StatelessWidget {
  final ValueChanged<String> onSelect;

  const _TypeSelector({required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final stacked = constraints.maxWidth < 560;
        final cards = [
          _TypeCard(
            icon: Icons.build_outlined,
            title: 'Mantenimiento',
            description: 'Reporta un artículo dañado o que necesita reparación.',
            onTap: () => onSelect('mantenimiento'),
          ),
          _TypeCard(
            icon: Icons.sell_outlined,
            title: 'Venta',
            description: 'Ofrece una joya o reloj que quieras vender.',
            onTap: () => onSelect('venta'),
          ),
        ];

        return stacked
            ? Column(
                children: [
                  cards[0],
                  const SizedBox(height: 14),
                  cards[1],
                ],
              )
            : Row(
                children: [
                  Expanded(child: cards[0]),
                  const SizedBox(width: 18),
                  Expanded(child: cards[1]),
                ],
              );
      },
    );
  }
}

class _TypeCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final VoidCallback onTap;

  const _TypeCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: IngenixTheme.blanco,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          constraints: const BoxConstraints(minHeight: 170),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFDCEAE8)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 28, color: IngenixTheme.principal),
              const SizedBox(height: 24),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: IngenixTheme.texto,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.45,
                  color: IngenixTheme.textoSec,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SuccessBanner extends StatelessWidget {
  final int numeroOrden;

  const _SuccessBanner({required this.numeroOrden});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFE6F3EF),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: IngenixTheme.principal),
      ),
      child: Text(
        '¡Solicitud enviada! Tu número de orden es $numeroOrden. Te avisaremos cuando haya novedades.',
        style: const TextStyle(color: IngenixTheme.texto, height: 1.4),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;

  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF9E8E6),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(message, style: const TextStyle(color: IngenixTheme.error)),
    );
  }
}

class _RecentRequestsSection extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  final bool cargando;

  const _RecentRequestsSection({required this.items, required this.cargando});

  @override
  Widget build(BuildContext context) {
    if (cargando) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Mis solicitudes',
          style: TextStyle(
            color: IngenixTheme.texto,
            fontFamily: 'Georgia',
            fontSize: 25,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Aquí podrás consultar el avance de tus solicitudes.',
          style: TextStyle(color: IngenixTheme.textoSec, fontSize: 14),
        ),
        const SizedBox(height: 18),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: IngenixTheme.blanco,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFDCEAE8)),
          ),
          child: items.isEmpty
              ? const Text(
                  'Tus solicitudes aparecerán aquí después de enviarlas.',
                  style: TextStyle(color: IngenixTheme.textoSec),
                )
              : SizedBox(
                  width: double.infinity,
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 700),
                      child: DataTable(
                        columnSpacing: 24,
                        headingTextStyle: const TextStyle(
                          color: IngenixTheme.texto,
                          fontWeight: FontWeight.w700,
                        ),
                        dataTextStyle: const TextStyle(color: IngenixTheme.texto),
                        columns: const [
                          DataColumn(label: Text('Orden')),
                          DataColumn(label: Text('Artículo / detalle')),
                          DataColumn(label: Text('Estado')),
                          DataColumn(label: Text('Fecha')),
                          DataColumn(label: Text('Total')),
                        ],
                        rows: items.map((item) {
                          final estado = item['estado']?.toString() ?? 'Pendiente';
                          final descripcion = (item['servicios'] ?? '').toString();
                          final fecha = (item['fecha_registro'] ?? '').toString();
                          final total = item['total_estimado'] ?? 0;
                          return DataRow(
                            cells: [
                              DataCell(
                                Text(
                                  '#${item['numeroOrden'] ?? item['idSolicitud'] ?? '—'}',
                                ),
                              ),
                              DataCell(
                                Text(descripcion.isEmpty ? '—' : descripcion),
                              ),
                              DataCell(Text(estado)),
                              DataCell(Text(fecha.isEmpty ? '—' : fecha)),
                              DataCell(Text('$total COP')),
                            ],
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ),
        ),
      ],
    );
  }
}
