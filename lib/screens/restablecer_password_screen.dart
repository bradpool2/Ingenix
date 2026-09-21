import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;

import '../core/constants.dart';
import '../core/theme.dart';

class RestablecerPasswordScreen extends StatefulWidget {
  final String token;

  const RestablecerPasswordScreen({super.key, required this.token});

  @override
  State<RestablecerPasswordScreen> createState() =>
      _RestablecerPasswordScreenState();
}

class _RestablecerPasswordScreenState extends State<RestablecerPasswordScreen> {
  final _passwordCtrl = TextEditingController();
  final _confirmacionCtrl = TextEditingController();
  bool _cargando = false;
  String? _mensaje;

  @override
  void dispose() {
    _passwordCtrl.dispose();
    _confirmacionCtrl.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    if (_passwordCtrl.text.length < 8) {
      setState(() => _mensaje = 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (_passwordCtrl.text != _confirmacionCtrl.text) {
      setState(() => _mensaje = 'Las contraseñas no coinciden.');
      return;
    }
    setState(() {
      _cargando = true;
      _mensaje = null;
    });
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/restablecer-password'),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'token': widget.token, 'password': _passwordCtrl.text}),
      );
      final data = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
      if (!mounted) return;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Contraseña actualizada. Ya puedes iniciar sesión.')),
        );
        context.go('/login');
      } else {
        setState(() => _mensaje = data is Map
            ? (data['message'] ?? 'No se pudo actualizar la contraseña.').toString()
            : 'No se pudo actualizar la contraseña.');
      }
    } catch (_) {
      if (mounted) setState(() => _mensaje = 'No se pudo conectar con el servidor.');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('Crear nueva contraseña',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 24),
                      TextField(
                        controller: _passwordCtrl,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'Nueva contraseña'),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _confirmacionCtrl,
                        obscureText: true,
                        onSubmitted: (_) => _guardar(),
                        decoration: const InputDecoration(labelText: 'Confirmar contraseña'),
                      ),
                      if (_mensaje != null) ...[
                        const SizedBox(height: 14),
                        Text(_mensaje!, textAlign: TextAlign.center,
                            style: const TextStyle(color: IngenixTheme.error)),
                      ],
                      const SizedBox(height: 22),
                      FilledButton(
                        onPressed: _cargando ? null : _guardar,
                        child: Text(_cargando ? 'Guardando...' : 'Actualizar contraseña'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}
