import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../services/auth_service.dart';
import '../../widgets/navbar_widget.dart';

class UsuariosScreen extends StatefulWidget {
  const UsuariosScreen({super.key});

  @override
  State<UsuariosScreen> createState() => _UsuariosScreenState();
}

class _UsuariosScreenState extends State<UsuariosScreen> {
  List<Map<String, dynamic>> _usuarios = [];
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final auth = context.read<AuthService>();
    try {
      final res = await http.get(
        Uri.parse('${AppConstants.baseUrl}/usuarios'),
        headers: auth.headers,
      );
      if (res.statusCode == 200) {
        setState(() => _usuarios = List<Map<String, dynamic>>.from(jsonDecode(res.body)));
      }
    } catch (_) {}
    if (mounted) setState(() => _cargando = false);
  }

  Future<void> _eliminar(int id) async {
    final auth = context.read<AuthService>();
    final confirm = await showDialog<bool>(
  context: context,
  builder: (dialogContext) => AlertDialog(
    title: const Text('¿Eliminar usuario?'),
    content: const Text('Esta acción no se puede deshacer.'),
    actions: [
      TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancelar')),
      TextButton(onPressed: () => Navigator.pop(dialogContext, true),  child: const Text('Eliminar', style: TextStyle(color: Colors.red))),
    ],
  ),
);
    if (confirm != true) return;

    await http.delete(Uri.parse('${AppConstants.baseUrl}/usuarios/$id'), headers: auth.headers);
    _cargar();
  }

  String _rolLabel(int rolId) {
    switch (rolId) {
      case 1: return 'Admin';
      case 2: return 'Técnico';
      case 3: return 'Usuario';
      default: return 'N/A';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const NavBarWidget(),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _usuarios.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final u = _usuarios[i];
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: IngenixTheme.principal.withOpacity(0.2),
                      child: Text(
                        (u['nombre'] as String? ?? 'U').substring(0, 1).toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.bold, color: IngenixTheme.texto),
                      ),
                    ),
                    title: Text(u['nombre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(u['correo'] ?? ''),
                        Container(
                          margin: const EdgeInsets.only(top: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: IngenixTheme.principal.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(_rolLabel(u['rol_idRol'] ?? 3), style: const TextStyle(fontSize: 11)),
                        ),
                      ],
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete, color: Colors.red),
                      onPressed: () => _eliminar(u['idUsuario']),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
