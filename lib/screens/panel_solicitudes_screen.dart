import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../services/auth_service.dart';
import '../../widgets/navbar_widget.dart';

class PanelSolicitudesScreen extends StatefulWidget {
  const PanelSolicitudesScreen({super.key});

  @override
  State<PanelSolicitudesScreen> createState() => _PanelSolicitudesScreenState();
}

class _PanelSolicitudesScreenState extends State<PanelSolicitudesScreen> {
  List<Map<String, dynamic>> _solicitudes = [];
  bool _cargando = true;

  final _estados = ['Pendiente', 'En proceso', 'Terminado', 'En revision', 'Aprobado', 'Entregado', 'Cancelado'];

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final auth = context.read<AuthService>();
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/api/tecnico/solicitudes'),
        headers: auth.headers,
      );
      if (res.statusCode == 200) {
        setState(() => _solicitudes = List<Map<String, dynamic>>.from(jsonDecode(res.body)));
      }
    } catch (_) {}
    if (mounted) setState(() => _cargando = false);
  }

  Future<void> _cambiarEstado(int id, String nuevoEstado) async {
    final auth = context.read<AuthService>();
    await http.put(
      Uri.parse('${AppConstants.baseUrl}/api/tecnico/solicitudes/$id/estado'),
      headers: auth.headers,
      body: jsonEncode({'nuevoEstado': nuevoEstado}),
    );
    _cargar();
  }

  Color _colorEstado(String estado) {
    switch (estado) {
      case 'Pendiente':   return Colors.orange;
      case 'En proceso':  return Colors.blue;
      case 'Terminado':   return Colors.green;
      case 'Cancelado':   return Colors.red;
      default:            return IngenixTheme.principal;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const NavBarWidget(),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : _solicitudes.isEmpty
              ? const Center(child: Text('No hay solicitudes.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _solicitudes.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final s = _solicitudes[i];
                    final estado = s['estado'] ?? 'Pendiente';
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Solicitud #${s['idSolicitud']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _colorEstado(estado).withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: _colorEstado(estado).withOpacity(0.4)),
                                  ),
                                  child: Text(estado, style: TextStyle(fontSize: 12, color: _colorEstado(estado), fontWeight: FontWeight.w600)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text('Fecha: ${s['fecha'] ?? 'N/A'}', style: const TextStyle(color: IngenixTheme.textoSec, fontSize: 13)),
                            if (s['total_estimado'] != null)
                              Text('Total estimado: \$${s['total_estimado']}', style: const TextStyle(fontSize: 13)),
                            const SizedBox(height: 10),
                            DropdownButtonFormField<String>(
                              value: _estados.contains(estado) ? estado : 'Pendiente',
                              decoration: const InputDecoration(labelText: 'Cambiar estado', isDense: true),
                              items: _estados.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
                              onChanged: (val) { if (val != null) _cambiarEstado(s['idSolicitud'], val); },
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
