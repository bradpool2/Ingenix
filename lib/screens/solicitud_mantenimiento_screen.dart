import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';

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

  static const damageOptions = <String, Map<String, List<String>>>{
    'reloj': {
      'Exterior': ['Vidrio rayado o roto', 'Caja golpeada', 'Corona rota o floja', 'Tapa trasera dañada'],
      'Correa / pulso': ['Correa desgastada', 'Cierre roto', 'Eslabones sueltos'],
      'Funcionamiento': ['No enciende / sin movimiento', 'Atrasa o adelanta', 'Agujas sueltas o caídas'],
    },
    'joyeria': {
      'Estructura': ['Pieza rota o partida', 'Soldadura débil', 'Deformación visible'],
      'Acabado': ['Baño desgastado', 'Opacidad / falta de brillo', 'Manchas o corrosión'],
      'Accesorios': ['Piedra suelta o perdida', 'Cierre dañado', 'Engaste flojo'],
    },
  };

  static const serviceOptions = <String, Map<String, Map<String, int>>>{
    'reloj': {
      'Exterior': {'Cambio de vidrio/cristal': 25000, 'Enderezado de caja': 15000, 'Cambio de corona': 12000, 'Cambio de tapa trasera': 10000},
      'Correa / pulso': {'Cambio de correa': 20000, 'Reparación de cierre': 8000, 'Cambio de eslabones': 6000},
      'Funcionamiento': {'Cambio de pila': 5000, 'Ajuste de hora': 2000, 'Reparación de agujas': 18000, 'Limpieza de mecanismo': 30000, 'Cambio de mecanismo completo': 80000},
    },
    'joyeria': {
      'Estructura': {'Soldadura': 20000, 'Enderezado': 15000, 'Reparación de pieza rota': 25000},
      'Acabado': {'Baño en oro/plata': 35000, 'Pulido y brillo': 15000, 'Limpieza química': 12000},
      'Accesorios': {'Cambio de piedra': 30000, 'Reparación de cierre': 8000, 'Ajuste de engaste': 12000},
    },
  };

  final _partNames = const ['Cristal / vidrio', 'Correa / pulso', 'Módulo interno completo', 'Corona / botón'];
  final _subtypes = const {
    'reloj': ['De pulso', 'De bolsillo', 'De pared', 'Despertador'],
    'joyeria': ['Anillo', 'Cadena', 'Pulsera', 'Aretes', 'Dije'],
  };

  double get _total => _services.fold(0, (sum, name) {
        for (final group in serviceOptions[_type]!.values) {
          if (group.containsKey(name)) return sum + group[name]!;
        }
        return sum;
      }) + _parts.values.fold(0, (sum, value) => sum + value);

  bool get _complete =>
      _order.trim().isNotEmpty && _type.isNotEmpty && _subtype.isNotEmpty && _damage.isNotEmpty && _services.isNotEmpty;

  void _toggle(Set<String> values, String value) {
    setState(() => values.contains(value) ? values.remove(value) : values.add(value));
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
          'services': _services.map((name) => {'nombre': name, 'precio': _servicePrice(name)}).toList(),
          'piezas': _parts,
          'total': _total,
          'fecha': _date(),
        }),
      );
      if (!mounted) return;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Solicitud guardada correctamente')));
        context.go('/solicitud-cliente');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_message(response.body)), backgroundColor: Colors.red));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo conectar con el servidor'), backgroundColor: Colors.red));
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
    try { return (jsonDecode(body) as Map)['error']?.toString() ?? 'No se pudo guardar la solicitud.'; } catch (_) { return 'No se pudo guardar la solicitud.'; }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const NavBarWidget(),
      backgroundColor: IngenixTheme.fondo,
      body: LayoutBuilder(builder: (context, constraints) {
        final wide = constraints.maxWidth > 900;
        return SingleChildScrollView(
          padding: EdgeInsets.symmetric(horizontal: wide ? 80 : 20, vertical: 36),
          child: Center(child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 1040), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Solicitud de mantenimiento', style: TextStyle(fontFamily: 'Georgia', fontSize: 36, fontWeight: FontWeight.bold, color: IngenixTheme.texto)),
            const SizedBox(height: 8),
            const Text('Registra el diagnóstico, los servicios y las piezas necesarias.', style: TextStyle(color: IngenixTheme.textoSec)),
            const SizedBox(height: 28),
            _StepBar(current: _step, onTap: (step) => setState(() => _step = step)),
            const SizedBox(height: 16),
            _content(),
            const SizedBox(height: 20),
            Align(alignment: Alignment.centerRight, child: Wrap(spacing: 10, children: [
              if (_step > 0) OutlinedButton(onPressed: () => setState(() => _step--), child: const Text('Atrás')),
              if (_step < 5) FilledButton(onPressed: () => setState(() => _step++), child: const Text('Siguiente')),
              if (_step == 5) FilledButton(onPressed: _saving || !_complete ? null : _save, child: Text(_saving ? 'Guardando...' : 'Guardar solicitud')),
            ])),
          ]))),
        );
      }),
    );
  }

  Widget _content() {
    switch (_step) {
      case 0: return _StepPanel(title: 'Número de orden', subtitle: 'Ingresa el número de orden del cliente', child: TextField(onChanged: (value) => _order = value, decoration: const InputDecoration(hintText: 'Ej: ORD-2024-001')));
      case 1: return _classification();
      case 2: return _selectionStep('Daños encontrados', 'Marca todo lo que observas', damageOptions[_type] ?? {}, _damage, false);
      case 3: return _servicesStep();
      case 4: return _partsStep();
      default: return _summary();
    }
  }

  Widget _classification() => _StepPanel(title: '¿Qué entró al taller?', subtitle: 'Selecciona el tipo de producto', child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Wrap(spacing: 12, runSpacing: 12, children: ['reloj', 'joyeria'].map((type) => _Choice(label: type == 'reloj' ? 'Reloj' : 'Joyería', icon: type == 'reloj' ? Icons.watch_outlined : Icons.diamond_outlined, selected: _type == type, onTap: () => setState(() { _type = type; _subtype = ''; _damage.clear(); _services.clear(); }))).toList()),
    if (_type.isNotEmpty) ...[const SizedBox(height: 22), const Text('Subtipo', style: TextStyle(fontWeight: FontWeight.w700, color: IngenixTheme.texto)), const SizedBox(height: 10), Wrap(spacing: 8, runSpacing: 8, children: _subtypes[_type]!.map((item) => _Choice(label: item, selected: _subtype == item, onTap: () => setState(() => _subtype = item))).toList())],
  ]));

  Widget _selectionStep(String title, String subtitle, Map<String, List<String>> groups, Set<String> selected, bool unused) {
    return _StepPanel(
      title: title,
      subtitle: subtitle,
      child: groups.isEmpty
          ? const Text('Selecciona primero el tipo de producto en la pestaña 2.')
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: groups.entries.map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(entry.key, style: const TextStyle(fontWeight: FontWeight.w700, color: IngenixTheme.texto)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: entry.value.map((item) => FilterChip(
                        label: Text(item),
                        selected: selected.contains(item),
                        onSelected: (_) => _toggle(selected, item),
                      )).toList(),
                    ),
                  ],
                ),
              )).toList(),
            ),
    );
  }

  Widget _servicesStep() {
    return _StepPanel(
      title: 'Servicios de mano de obra',
      subtitle: 'Selecciona los servicios a realizar',
      child: _type.isEmpty
          ? const Text('Selecciona primero el tipo de producto en la pestaña 2.')
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: serviceOptions[_type]!.entries.map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(entry.key, style: const TextStyle(fontWeight: FontWeight.w700, color: IngenixTheme.texto)),
                    const SizedBox(height: 8),
                    ...entry.value.entries.map((service) => CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _services.contains(service.key),
                      onChanged: (_) => _toggle(_services, service.key),
                      title: Text(service.key),
                      secondary: Text('\$${service.value} COP'),
                    )),
                  ],
                ),
              )).toList(),
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
          return Row(
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
                  onChanged: (value) => _parts[name] = double.tryParse(value) ?? 0,
                  decoration: const InputDecoration(hintText: 'Precio COP', isDense: true),
                ),
              ),
            ],
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
          Text('Orden: ${_order.isEmpty ? '—' : _order}'),
          Text('Producto: ${_type.isEmpty ? '—' : _type} ${_subtype.isEmpty ? '' : '— $_subtype'}'),
          const SizedBox(height: 16),
          Text('Daños: ${_damage.isEmpty ? 'Ninguno' : _damage.join(', ')}'),
          Text('Servicios: ${_services.isEmpty ? 'Ninguno' : _services.join(', ')}'),
          const Divider(height: 28),
          Text('Total estimado: \$${_total.toStringAsFixed(0)} COP', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
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
    const labels = ['Orden', 'Clasificación', 'Daños', 'Servicios', 'Piezas', 'Resumen'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(6, (index) => Padding(
          padding: const EdgeInsets.only(right: 8),
          child: ChoiceChip(
            label: Text('${index + 1}. ${labels[index]}'),
            selected: current == index,
            onSelected: (_) => onTap(index),
          ),
        )),
      ),
    );
  }
}

class _StepPanel extends StatelessWidget {
  final String title;
  final String subtitle;
  final Widget child;
  const _StepPanel({required this.title, required this.subtitle, required this.child});
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
          Text(title, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w700, color: IngenixTheme.texto)),
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
  const _Choice({required this.label, this.icon, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) => ActionChip(avatar: icon == null ? null : Icon(icon, size: 18), label: Text(label), onPressed: onTap, backgroundColor: selected ? IngenixTheme.principal : IngenixTheme.fondo);
}
