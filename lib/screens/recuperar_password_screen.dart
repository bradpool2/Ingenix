import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../../core/constants.dart';
import '../../core/theme.dart';

class RecuperarPasswordScreen extends StatefulWidget {
  const RecuperarPasswordScreen({super.key});

  @override
  State<RecuperarPasswordScreen> createState() => _RecuperarPasswordScreenState();
}

class _RecuperarPasswordScreenState extends State<RecuperarPasswordScreen> {
  final _correoCtrl = TextEditingController();
  String? _mensaje;
  bool _cargando = false;

  Future<void> _recuperar() async {
    setState(() { _cargando = true; _mensaje = null; });
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.baseUrl}/recuperar-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'correo': _correoCtrl.text.trim()}),
      );
      final data = jsonDecode(res.body);
      setState(() => _mensaje = data['message'] ?? 'Correo enviado');
    } catch (_) {
      setState(() => _mensaje = 'Error al intentar recuperar la contraseña.');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFF8FBFB), Color(0xFFE8F1EF), Color(0xFFC1CBCF)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 400),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.95),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: IngenixTheme.principal.withOpacity(0.35)),
                ),
                padding: const EdgeInsets.all(30),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Recuperar contraseña', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    const Text('Escribe tu correo electrónico para recuperar el acceso.', style: TextStyle(color: IngenixTheme.textoSec, fontSize: 13), textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    const Text('Correo electrónico', style: TextStyle(fontSize: 13, color: IngenixTheme.textoSec)),
                    const SizedBox(height: 6),
                    TextField(controller: _correoCtrl, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(hintText: 'correo@ejemplo.com')),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _cargando ? null : _recuperar,
                      child: _cargando
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Recuperar contraseña'),
                    ),
                    if (_mensaje != null) ...[
                      const SizedBox(height: 16),
                      Text(_mensaje!, style: const TextStyle(color: IngenixTheme.principal), textAlign: TextAlign.center),
                    ],
                    const SizedBox(height: 16),
                    TextButton.icon(
                      onPressed: () => context.go('/login'),
                      icon: const Icon(Icons.arrow_back, size: 16),
                      label: const Text('Volver al login'),
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
}
