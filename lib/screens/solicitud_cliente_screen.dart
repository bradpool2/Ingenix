import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';

class SolicitudClienteScreen extends StatefulWidget {
  const SolicitudClienteScreen({super.key});

  @override
  State<SolicitudClienteScreen> createState() => _SolicitudClienteScreenState();
}

class _SolicitudClienteScreenState extends State<SolicitudClienteScreen> {
  final _nombreCtrl = TextEditingController();
  final _descripcionCtrl = TextEditingController();
  final _estadoCtrl = TextEditingController();
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
    _estadoCtrl.dispose();
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
      _estadoCtrl.clear();
      _precioCtrl.clear();
      _imagen = null;
      _imagenBytes = null;
      _urgencia = 'Media';
      _estadoArticulo = '';
    });
  }

  Future<void> _seleccionarImagen() async {
    final picked = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
      maxWidth: 1600,
    );

    if (picked == null || !mounted) return;

    final bytes = await picked.readAsBytes();
    if (!mounted) return;

    setState(() {
      _imagen = picked;
      _imagenBytes = bytes;
    });
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
      final request =
          http.MultipartRequest(
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
        request.files.add(
          http.MultipartFile.fromBytes(
            'imagen',
            imagenBytes,
            filename: _imagen!.name.isNotEmpty
                ? _imagen!.name
                : 'imagen_${DateTime.now().millisecondsSinceEpoch}.jpg',
          ),
        );
      }

      final response = await http.Response.fromStream(await request.send());
      if (!mounted) return;
      final data = response.body.isEmpty
          ? <String, dynamic>{}
          : jsonDecode(response.body) as Map<String, dynamic>;

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
          _error =
              data['error']?.toString() ??
              data['message']?.toString() ??
              'No se pudo enviar la solicitud.';
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
            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: horizontal,
                vertical: 42,
              ),
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
                      if (_tipo == null)
                        _TypeSelector(onSelect: _seleccionarTipo)
                      else
                        Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 600),
                            child: _RequestForm(
                              tipo: _tipo!,
                              nombreController: _nombreCtrl,
                              descripcionController: _descripcionCtrl,
                              estadoController: _estadoCtrl,
                              precioController: _precioCtrl,
                              urgencia: _urgencia,
                              estadoArticulo: _estadoArticulo,
                              imagen: _imagen,
                              imagenBytes: _imagenBytes,
                              enviando: _enviando,
                              onUrgenciaChanged: (value) =>
                                  setState(() => _urgencia = value),
                              onEstadoChanged: (value) =>
                                  setState(() => _estadoArticulo = value),
                              onImageTap: _seleccionarImagen,
                              onBack: () => setState(() {
                                _tipo = null;
                                _error = null;
                              }),
                              onSubmit: _enviar,
                            ),
                          ),
                        ),
                      const SizedBox(height: 52),
                      _RecentRequestsSection(
                        items: _solicitudesRecientes,
                        cargando: _cargandoSolicitudes,
                      ),
                    ],
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
            description:
                'Reporta un artículo dañado o que necesita reparación.',
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
            ? Column(children: [cards[0], const SizedBox(height: 14), cards[1]])
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

class _RequestForm extends StatelessWidget {
  final String tipo;
  final TextEditingController nombreController;
  final TextEditingController descripcionController;
  final TextEditingController estadoController;
  final TextEditingController precioController;
  final String urgencia;
  final String estadoArticulo;
  final XFile? imagen;
  final Uint8List? imagenBytes;
  final bool enviando;
  final ValueChanged<String> onUrgenciaChanged;
  final ValueChanged<String> onEstadoChanged;
  final VoidCallback onImageTap;
  final VoidCallback onBack;
  final VoidCallback onSubmit;

  const _RequestForm({
    required this.tipo,
    required this.nombreController,
    required this.descripcionController,
    required this.estadoController,
    required this.precioController,
    required this.urgencia,
    required this.estadoArticulo,
    required this.imagen,
    required this.imagenBytes,
    required this.enviando,
    required this.onUrgenciaChanged,
    required this.onEstadoChanged,
    required this.onImageTap,
    required this.onBack,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final isSale = tipo == 'venta';
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        color: IngenixTheme.blanco,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDCEAE8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                isSale ? Icons.sell_outlined : Icons.build_outlined,
                color: IngenixTheme.principal,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  isSale ? 'Solicitud de venta' : 'Solicitud de mantenimiento',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: IngenixTheme.texto,
                  ),
                ),
              ),
              TextButton(onPressed: onBack, child: const Text('Cambiar tipo')),
            ],
          ),
          const SizedBox(height: 26),
          _FormField(
            label: isSale
                ? '¿Qué producto quieres vender?'
                : '¿Qué artículo necesita mantenimiento?',
            help: isSale
                ? 'Ejemplo: Cadena de oro 18k, reloj Citizen automático.'
                : 'Ejemplo: Reloj Casio dorado, anillo de plata con piedra.',
            controller: nombreController,
            hint: isSale ? 'Nombre del producto' : 'Nombre del artículo',
          ),
          const SizedBox(height: 20),
          _FormField(
            label: isSale ? 'Describe el producto' : 'Cuéntanos qué le pasa',
            help: isSale
                ? 'Material, peso aproximado, marca, año o cualquier detalle relevante.'
                : 'Describe el daño o lo que necesitas que revisemos. Mientras más detalle, mejor.',
            controller: descripcionController,
            hint: isSale
                ? 'Describe el producto'
                : 'Ej: Se le cayó la correa y la pila ya no funciona.',
            maxLines: 4,
          ),
          const SizedBox(height: 20),
          if (isSale) ...[
            const _FieldLabel(text: '¿Cómo está el artículo?'),
            const SizedBox(height: 10),
            _ChoiceChips(
              values: const ['Excelente', 'Bueno', 'Regular', 'Malo'],
              selected: estadoArticulo,
              onSelect: onEstadoChanged,
            ),
            const SizedBox(height: 20),
            _FormField(
              label: 'Precio que esperas recibir (opcional)',
              help:
                  'Es solo una referencia, nuestro equipo te confirmará el valor final.',
              controller: precioController,
              hint: 'Ej: 150000',
              keyboardType: TextInputType.number,
            ),
          ] else ...[
            const _FieldLabel(text: '¿Qué tan urgente es?'),
            const SizedBox(height: 10),
            _ChoiceChips(
              values: const ['Baja', 'Media', 'Alta'],
              selected: urgencia,
              onSelect: onUrgenciaChanged,
              highlightLast: true,
            ),
          ],
          const SizedBox(height: 24),
          _ImagePickerBox(
            imagen: imagen,
            imagenBytes: imagenBytes,
            onTap: onImageTap,
          ),
          const SizedBox(height: 28),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton(
                onPressed: enviando ? null : onBack,
                child: const Text('Volver'),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: enviando ? null : onSubmit,
                style: FilledButton.styleFrom(
                  backgroundColor: IngenixTheme.texto,
                  foregroundColor: IngenixTheme.blanco,
                ),
                child: enviando
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Enviar solicitud'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FormField extends StatelessWidget {
  final String label;
  final String help;
  final String hint;
  final TextEditingController controller;
  final int maxLines;
  final TextInputType keyboardType;

  const _FormField({
    required this.label,
    required this.help,
    required this.controller,
    required this.hint,
    this.maxLines = 1,
    this.keyboardType = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FieldLabel(text: label),
        const SizedBox(height: 5),
        Text(
          help,
          style: const TextStyle(
            color: IngenixTheme.textoSec,
            fontSize: 12,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 9),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Color(0xFFC9D6D2)),
            filled: true,
            fillColor: const Color(0xFF4D4B4A),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 14,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFFB7D8CF)),
            ),
            alignLabelWithHint: true,
          ),
        ),
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel({required this.text});
  @override
  Widget build(BuildContext context) => Text(
    text,
    style: const TextStyle(
      color: IngenixTheme.texto,
      fontSize: 14,
      fontWeight: FontWeight.w700,
    ),
  );
}

class _ChoiceChips extends StatelessWidget {
  final List<String> values;
  final String selected;
  final ValueChanged<String> onSelect;
  final bool highlightLast;

  const _ChoiceChips({
    required this.values,
    required this.selected,
    required this.onSelect,
    this.highlightLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: values.map((value) {
        final active = value == selected;
        return GestureDetector(
          onTap: () => onSelect(value),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            decoration: BoxDecoration(
              color: active
                  ? const Color(0xFFB7D8CF)
                  : const Color(0xFFF5FAF9),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: active
                    ? const Color(0xFF8CB6AF)
                    : const Color(0xFFDCEAE8),
              ),
            ),
            child: Text(
              value,
              style: const TextStyle(
                color: IngenixTheme.texto,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _ImagePickerBox extends StatelessWidget {
  final XFile? imagen;
  final Uint8List? imagenBytes;
  final VoidCallback onTap;
  const _ImagePickerBox({
    required this.imagen,
    required this.imagenBytes,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget preview;

    if (imagenBytes != null) {
      preview = Image.memory(
        imagenBytes!,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
      );
    } else if (imagen != null && !kIsWeb) {
      preview = Image.file(
        File(imagen!.path),
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
      );
    } else {
      preview = const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.image_outlined, size: 30, color: IngenixTheme.principal),
          SizedBox(height: 8),
          Text(
            'Toca aquí para explorar tus archivos',
            style: TextStyle(color: IngenixTheme.textoSec, fontSize: 13),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _FieldLabel(text: 'Foto del artículo (opcional)'),
        const SizedBox(height: 5),
        const Text(
          'Una foto ayuda a entender mejor tu solicitud, pero no es obligatoria.',
          style: TextStyle(color: IngenixTheme.textoSec, fontSize: 12),
        ),
        const SizedBox(height: 10),
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            height: 130,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFF5FAF9),
              border: Border.all(color: IngenixTheme.principal),
              borderRadius: BorderRadius.circular(10),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(9),
              child: preview,
            ),
          ),
        ),
      ],
    );
  }
}

class _SuccessBanner extends StatelessWidget {
  final int numeroOrden;
  const _SuccessBanner({required this.numeroOrden});
  @override
  Widget build(BuildContext context) => Container(
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

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: const Color(0xFFF9E8E6),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(message, style: const TextStyle(color: IngenixTheme.error)),
  );
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
              : SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
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
      ],
    );
  }
}
