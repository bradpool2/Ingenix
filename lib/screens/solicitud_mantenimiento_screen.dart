import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';
import '../widgets/panel_sidebar.dart';

class SolicitudMantenimientoScreen extends StatefulWidget {
  const SolicitudMantenimientoScreen({super.key});

  @override
  State<SolicitudMantenimientoScreen> createState() =>
      _SolicitudMantenimientoScreenState();
}

class _SolicitudMantenimientoScreenState
    extends State<SolicitudMantenimientoScreen> {
  int _step = 0;
  String _order = '';
  String _type = '';
  String _subtype = '';
  final Set<String> _damage = {};
  final Set<String> _services = {};
  final Map<String, double> _parts = {};
  bool _saving = false;
  bool _summaryOpen = true;

  static const damageOptions = <String, Map<String, List<String>>>{
    'reloj': {
      'Exterior': [
        'Vidrio rayado o roto',
        'Caja golpeada',
        'Corona rota o floja',
        'Tapa trasera dañada',
      ],
      'Correa / pulso': [
        'Correa desgastada',
        'Cierre roto',
        'Eslabones sueltos',
      ],
      'Funcionamiento': [
        'No enciende / sin movimiento',
        'Atrasa o adelanta',
        'Agujas sueltas o caídas',
      ],
    },
    'joyeria': {
      'Estructura': [
        'Pieza rota o partida',
        'Soldadura débil',
        'Deformación visible',
      ],
      'Acabado': [
        'Baño desgastado',
        'Opacidad / falta de brillo',
        'Manchas o corrosión',
      ],
      'Accesorios': [
        'Piedra suelta o perdida',
        'Cierre dañado',
        'Engaste flojo',
      ],
    },
  };

  static const serviceOptions = <String, Map<String, Map<String, int>>>{
    'reloj': {
      'Exterior': {
        'Cambio de vidrio/cristal': 25000,
        'Enderezado de caja': 15000,
        'Cambio de corona': 12000,
        'Cambio de tapa trasera': 10000,
      },
      'Correa / pulso': {
        'Cambio de correa': 20000,
        'Reparación de cierre': 8000,
        'Cambio de eslabones': 6000,
      },
      'Funcionamiento': {
        'Cambio de pila': 5000,
        'Ajuste de hora': 2000,
        'Reparación de agujas': 18000,
        'Limpieza de mecanismo': 30000,
        'Cambio de mecanismo completo': 80000,
      },
    },
    'joyeria': {
      'Estructura': {
        'Soldadura': 20000,
        'Enderezado': 15000,
        'Reparación de pieza rota': 25000,
      },
      'Acabado': {
        'Baño en oro/plata': 35000,
        'Pulido y brillo': 15000,
        'Limpieza química': 12000,
      },
      'Accesorios': {
        'Cambio de piedra': 30000,
        'Reparación de cierre': 8000,
        'Ajuste de engaste': 12000,
      },
    },
  };

  final _partNames = const [
    'Cristal / vidrio',
    'Correa / pulso',
    'Módulo interno completo',
    'Corona / botón',
  ];
  final _subtypes = const {
    'reloj': ['De pulso', 'De bolsillo', 'De pared', 'Despertador'],
    'joyeria': ['Anillo', 'Cadena', 'Pulsera', 'Aretes', 'Dije'],
  };

  double get _total =>
      _services.fold(0, (sum, name) {
        for (final group in serviceOptions[_type]!.values) {
          if (group.containsKey(name)) return sum + group[name]!;
        }
        return sum;
      }) +
      _parts.values.fold(0, (sum, value) => sum + value);

  bool get _complete =>
      _order.trim().isNotEmpty &&
      _type.isNotEmpty &&
      _subtype.isNotEmpty &&
      _damage.isNotEmpty &&
      _services.isNotEmpty;

  void _toggle(Set<String> values, String value) {
    setState(
      () => values.contains(value) ? values.remove(value) : values.add(value),
    );
  }

  void _setOrder(String value) {
    setState(() => _order = value);
  }

  Future<void> _save() async {
    if (!_complete) return;
    setState(() => _saving = true);
    final auth = context.read<AuthService>();
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/solicitudes'),
        headers: auth.headers,
        body: jsonEncode({
          'orden': _order.trim(),
          'tipo': _type,
          'subtipo': _subtype,
          'danos': _damage.toList(),
          'services': _services
              .map((name) => {'nombre': name, 'precio': _servicePrice(name)})
              .toList(),
          'piezas': _parts,
          'total': _total,
          'fecha': _date(),
        }),
      );
      if (!mounted) return;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Solicitud guardada correctamente')),
        );
        context.go('/solicitud-cliente');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_message(response.body)),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo conectar con el servidor'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  int _servicePrice(String name) {
    for (final group in serviceOptions[_type]!.values) {
      if (group.containsKey(name)) return group[name]!;
    }
    return 0;
  }

  String _date() {
    final now = DateTime.now();
    return '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}';
  }

  String _message(String body) {
    try {
      return (jsonDecode(body) as Map)['error']?.toString() ??
          'No se pudo guardar la solicitud.';
    } catch (_) {
      return 'No se pudo guardar la solicitud.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const NavBarWidget(),
      drawer: const Drawer(
        child: SafeArea(
          child: PanelSidebar(activeRoute: '/solicitud-mantenimiento'),
        ),
      ),
      backgroundColor: IngenixTheme.fondo,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth > 900;
          final content = SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: wide ? 40 : 20,
              vertical: 36,
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1040),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Solicitud de mantenimiento',
                      style: TextStyle(
                        fontFamily: 'Georgia',
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                        color: IngenixTheme.texto,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Registra el diagnóstico, los servicios y las piezas necesarias.',
                      style: TextStyle(color: IngenixTheme.textoSec),
                    ),
                    const SizedBox(height: 28),
                    _StepBar(
                      current: _step,
                      onTap: (step) => setState(() => _step = step),
                    ),
                    const SizedBox(height: 16),
                    _content(),
                    const SizedBox(height: 20),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        if (_step > 0) ...[
                          OutlinedButton(
                            onPressed: () => setState(() => _step--),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(100, 44),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                              ),
                            ),
                            child: const Text('Atrás'),
                          ),
                          const SizedBox(width: 12),
                        ],
                        if (_step < 5)
                          FilledButton(
                            onPressed: () => setState(() => _step++),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(112, 44),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                              ),
                            ),
                            child: const Text('Siguiente'),
                          ),
                        if (_step == 5)
                          FilledButton(
                            onPressed: _saving || !_complete ? null : _save,
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(150, 44),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                              ),
                            ),
                            child: Text(
                              _saving ? 'Guardando...' : 'Guardar solicitud',
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
          return wide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(
                      width: 218,
                      child: PanelSidebar(
                        activeRoute: '/solicitud-mantenimiento',
                      ),
                    ),
                    Expanded(
                      child: Stack(
                        children: [
                          Positioned.fill(child: content),
                          if (!_summaryOpen)
                            Positioned(
                              top: 10,
                              right: 18,
                              child: _SummaryToggle(
                                open: false,
                                onTap: () =>
                                    setState(() => _summaryOpen = true),
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (_summaryOpen)
                      SizedBox(
                        width: 255,
                        child: _SummaryPanel(
                          order: _order,
                          type: _type,
                          subtype: _subtype,
                          damage: _damage,
                          services: _services,
                          parts: _parts,
                          total: _total,
                          onClose: () => setState(() => _summaryOpen = false),
                        ),
                      ),
                  ],
                )
              : Stack(
                  children: [
                    content,
                    Positioned(
                      top: 12,
                      right: 14,
                      child: Builder(
                        builder: (context) => IconButton.filledTonal(
                          tooltip: 'Ver resumen',
                          icon: const Icon(Icons.tune),
                          onPressed: () => showModalBottomSheet<void>(
                            context: context,
                            isScrollControlled: true,
                            builder: (_) => SizedBox(
                              height: MediaQuery.sizeOf(context).height * .72,
                              child: _SummaryPanel(
                                order: _order,
                                type: _type,
                                subtype: _subtype,
                                damage: _damage,
                                services: _services,
                                parts: _parts,
                                total: _total,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                );
        },
      ),
    );
  }

  Widget _content() {
    switch (_step) {
      case 0:
        return _StepPanel(
          title: 'Número de orden',
          subtitle: 'Ingresa el número de orden del cliente',
          child: TextField(
            onChanged: _setOrder,
            decoration: const InputDecoration(hintText: 'Ej: ORD-2024-001'),
          ),
        );
      case 1:
        return _classification();
      case 2:
        return _selectionStep(
          'Daños encontrados',
          'Marca todo lo que observas',
          damageOptions[_type] ?? {},
          _damage,
          false,
        );
      case 3:
        return _servicesStep();
      case 4:
        return _partsStep();
      default:
        return _summary();
    }
  }

  Widget _classification() => _StepPanel(
    title: '¿Qué entró al taller?',
    subtitle: 'Selecciona el tipo de producto',
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: ['reloj', 'joyeria']
              .map(
                (type) => _Choice(
                  label: type == 'reloj' ? 'Reloj' : 'Joyería',
                  icon: type == 'reloj'
                      ? Icons.watch_outlined
                      : Icons.diamond_outlined,
                  selected: _type == type,
                  onTap: () => setState(() {
                    _type = type;
                    _subtype = '';
                    _damage.clear();
                    _services.clear();
                  }),
                ),
              )
              .toList(),
        ),
        if (_type.isNotEmpty) ...[
          const SizedBox(height: 22),
          const Text(
            'Subtipo',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: IngenixTheme.texto,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _subtypes[_type]!
                .map(
                  (item) => _Choice(
                    label: item,
                    selected: _subtype == item,
                    onTap: () => setState(() => _subtype = item),
                  ),
                )
                .toList(),
          ),
        ],
      ],
    ),
  );

  Widget _selectionStep(
    String title,
    String subtitle,
    Map<String, List<String>> groups,
    Set<String> selected,
    bool unused,
  ) {
    return _StepPanel(
      title: title,
      subtitle: subtitle,
      child: groups.isEmpty
          ? const Text(
              'Selecciona primero el tipo de producto en la pestaña 2.',
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: groups.entries
                  .map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            entry.key,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              color: IngenixTheme.texto,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: entry.value
                                .map(
                                  (item) => FilterChip(
                                    label: Text(item),
                                    selected: selected.contains(item),
                                    onSelected: (_) => _toggle(selected, item),
                                    selectedColor: IngenixTheme.principal,
                                    backgroundColor: Colors.white,
                                    side: BorderSide(
                                      color: selected.contains(item)
                                          ? IngenixTheme.principal
                                          : const Color(0xFFD7E4E2),
                                    ),
                                    showCheckmark: false,
                                    labelStyle: const TextStyle(
                                      color: IngenixTheme.texto,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _servicesStep() {
    return _StepPanel(
      title: 'Servicios de mano de obra',
      subtitle: 'Selecciona los servicios a realizar',
      child: _type.isEmpty
          ? const Text(
              'Selecciona primero el tipo de producto en la pestaña 2.',
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: serviceOptions[_type]!.entries
                  .map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 22),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            entry.key,
                            style: const TextStyle(
                              fontSize: 11,
                              letterSpacing: 1.1,
                              fontWeight: FontWeight.w700,
                              color: IngenixTheme.textoSec,
                            ),
                          ),
                          const SizedBox(height: 10),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final columns = constraints.maxWidth >= 700
                                  ? 3
                                  : constraints.maxWidth >= 430
                                  ? 2
                                  : 1;
                              final width =
                                  (constraints.maxWidth -
                                      ((columns - 1) * 10)) /
                                  columns;
                              return Wrap(
                                spacing: 10,
                                runSpacing: 10,
                                children: entry.value.entries.map((service) {
                                  final selected = _services.contains(
                                    service.key,
                                  );
                                  return SizedBox(
                                    width: width,
                                    child: _ServiceCard(
                                      name: service.key,
                                      price: service.value,
                                      selected: selected,
                                      onTap: () =>
                                          _toggle(_services, service.key),
                                    ),
                                  );
                                }).toList(),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
    );
  }

  Widget _partsStep() {
    return _StepPanel(
      title: 'Piezas a reemplazar',
      subtitle: 'Marca las piezas e ingresa su precio en COP',
      child: Column(
        children: _partNames.map((name) {
          final selected = _parts.containsKey(name);
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: selected ? const Color(0xFFF1F8F6) : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: selected
                    ? IngenixTheme.principal
                    : const Color(0xFFD7E4E2),
              ),
            ),
            child: Row(
              children: [
                Checkbox(
                  value: selected,
                  onChanged: (value) {
                    setState(() {
                      if (value == true) {
                        _parts[name] = 0;
                      } else {
                        _parts.remove(name);
                      }
                    });
                  },
                ),
                Expanded(child: Text(name)),
                SizedBox(
                  width: 150,
                  child: TextField(
                    enabled: selected,
                    keyboardType: TextInputType.number,
                    onChanged: (value) => setState(
                      () => _parts[name] = double.tryParse(value) ?? 0,
                    ),
                    decoration: const InputDecoration(
                      hintText: 'Precio COP',
                      isDense: true,
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _summary() {
    return _StepPanel(
      title: 'Resumen del diagnóstico',
      subtitle: 'Revisa todo antes de finalizar',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              final wide = constraints.maxWidth >= 600;
              final details = [
                _SummaryInfo(
                  label: 'Orden',
                  value: _order.isEmpty ? '—' : _order,
                ),
                _SummaryInfo(
                  label: 'Producto',
                  value: _type.isEmpty
                      ? '—'
                      : '${_type == 'joyeria' ? 'Joyería' : 'Reloj'}${_subtype.isEmpty ? '' : ' — $_subtype'}',
                ),
                _SummaryInfo(
                  label: 'Daños encontrados',
                  value: _damage.isEmpty ? 'Ninguno' : _damage.join(', '),
                ),
              ];
              return wide
                  ? Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: details
                          .map(
                            (detail) => Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(right: 18),
                                child: detail,
                              ),
                            ),
                          )
                          .toList(),
                    )
                  : Column(
                      children: details
                          .map(
                            (detail) => Padding(
                              padding: const EdgeInsets.only(bottom: 14),
                              child: detail,
                            ),
                          )
                          .toList(),
                    );
            },
          ),
          const SizedBox(height: 22),
          const Text(
            'Servicios seleccionados',
            style: TextStyle(
              color: IngenixTheme.texto,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          if (_services.isEmpty)
            const Text(
              'Ninguno',
              style: TextStyle(color: IngenixTheme.textoSec),
            )
          else
            ..._services.map(
              (name) =>
                  _SummaryServiceRow(name: name, price: _servicePrice(name)),
            ),
          if (_parts.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text(
              'Piezas',
              style: TextStyle(
                color: IngenixTheme.texto,
                fontWeight: FontWeight.w700,
              ),
            ),
            ..._parts.entries.map(
              (part) =>
                  _SummaryServiceRow(name: part.key, price: part.value.toInt()),
            ),
          ],
          const Divider(height: 28),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total estimado',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
              Text(
                '\$${_total.toStringAsFixed(0)} COP',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StepBar extends StatelessWidget {
  final int current;
  final ValueChanged<int> onTap;
  const _StepBar({required this.current, required this.onTap});
  @override
  Widget build(BuildContext context) {
    const labels = [
      'Orden',
      'Clasificación',
      'Daños',
      'Servicios',
      'Piezas',
      'Resumen',
    ];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(
          6,
          (index) => Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text('${index + 1}. ${labels[index]}'),
              selected: current == index,
              onSelected: (_) => onTap(index),
              selectedColor: IngenixTheme.principal,
              backgroundColor: Colors.white,
              side: BorderSide(
                color: current == index
                    ? IngenixTheme.principal
                    : const Color(0xFFD7E4E2),
              ),
              showCheckmark: false,
              labelStyle: const TextStyle(
                color: IngenixTheme.texto,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final String name;
  final int price;
  final bool selected;
  final VoidCallback onTap;

  const _ServiceCard({
    required this.name,
    required this.price,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFFEAF5F2) : Colors.white,
      borderRadius: BorderRadius.circular(9),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(9),
        child: Container(
          constraints: const BoxConstraints(minHeight: 58),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(9),
            border: Border.all(
              color: selected
                  ? IngenixTheme.principal
                  : const Color(0xFFC8D8D6),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: IngenixTheme.texto,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '\$$price COP',
                style: const TextStyle(
                  color: IngenixTheme.texto,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryInfo extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryInfo({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            color: IngenixTheme.textoSec,
            fontSize: 10,
            letterSpacing: 1.1,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          value,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: IngenixTheme.texto, fontSize: 13),
        ),
      ],
    );
  }
}

class _SummaryServiceRow extends StatelessWidget {
  final String name;
  final int price;

  const _SummaryServiceRow({required this.name, required this.price});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFE5EEEC))),
      ),
      child: Row(
        children: [
          Expanded(child: Text(name, style: const TextStyle(fontSize: 13))),
          Text('\$$price COP', style: const TextStyle(fontSize: 13)),
        ],
      ),
    );
  }
}

class _SummaryToggle extends StatelessWidget {
  final bool open;
  final VoidCallback onTap;

  const _SummaryToggle({required this.open, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return IconButton.filledTonal(
      tooltip: open ? 'Ocultar resumen' : 'Mostrar resumen',
      icon: Icon(open ? Icons.chevron_right : Icons.chevron_left),
      onPressed: onTap,
    );
  }
}

class _SummaryPanel extends StatelessWidget {
  final String order;
  final String type;
  final String subtype;
  final Set<String> damage;
  final Set<String> services;
  final Map<String, double> parts;
  final double total;
  final VoidCallback? onClose;

  const _SummaryPanel({
    required this.order,
    required this.type,
    required this.subtype,
    required this.damage,
    required this.services,
    required this.parts,
    required this.total,
    this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final product = type.isEmpty
        ? '—'
        : '${type == 'joyeria' ? 'Joyería' : 'Reloj'}${subtype.isEmpty ? '' : ' — $subtype'}';
    return Material(
      color: Colors.white,
      elevation: 3,
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 16, 18, 22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Resumen rápido',
                      style: TextStyle(
                        color: IngenixTheme.texto,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  if (onClose != null)
                    _SummaryToggle(open: true, onTap: onClose!),
                ],
              ),
              const SizedBox(height: 18),
              const _SummaryLabel('Orden'),
              _SummaryValue(order.isEmpty ? '—' : order),
              const _SummaryLabel('Producto'),
              _SummaryValue(product),
              const _SummaryLabel('Daños'),
              _SummaryValue(
                damage.isEmpty ? 'Ninguno marcado' : damage.join(', '),
              ),
              const _SummaryLabel('Servicios'),
              _SummaryValue(
                services.isEmpty ? 'Ninguno seleccionado' : services.join(', '),
              ),
              const _SummaryLabel('Piezas'),
              _SummaryValue(
                parts.isEmpty ? 'Ninguna seleccionada' : parts.keys.join(', '),
              ),
              const SizedBox(height: 18),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 11,
                ),
                decoration: BoxDecoration(
                  color: IngenixTheme.principal.withValues(alpha: .14),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Total estimado',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      '\$${total.toStringAsFixed(0)} COP',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryLabel extends StatelessWidget {
  final String text;
  const _SummaryLabel(this.text);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 14, bottom: 5),
    child: Text(
      text.toUpperCase(),
      style: const TextStyle(
        color: IngenixTheme.textoSec,
        fontSize: 10,
        letterSpacing: 1.2,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

class _SummaryValue extends StatelessWidget {
  final String text;
  const _SummaryValue(this.text);

  @override
  Widget build(BuildContext context) => Text(
    text,
    maxLines: 5,
    overflow: TextOverflow.ellipsis,
    style: const TextStyle(color: IngenixTheme.textoSec, fontSize: 12),
  );
}

class _StepPanel extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;
  const _StepPanel({
    required this.title,
    required this.subtitle,
    required this.child,
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(26),
      decoration: BoxDecoration(
        color: IngenixTheme.blanco,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDCEAE8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w700,
              color: IngenixTheme.texto,
            ),
          ),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(color: IngenixTheme.textoSec)),
          const SizedBox(height: 24),
          child,
        ],
      ),
    );
  }
}

class _Choice extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool selected;
  final VoidCallback onTap;
  const _Choice({
    required this.label,
    this.icon,
    required this.selected,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? IngenixTheme.principal : Colors.white,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected
                  ? IngenixTheme.principal
                  : const Color(0xFFD7E4E2),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 18,
                  color: selected ? IngenixTheme.texto : IngenixTheme.principal,
                ),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: TextStyle(
                  color: IngenixTheme.texto,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
