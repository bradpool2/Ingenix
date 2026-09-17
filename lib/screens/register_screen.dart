import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../../core/theme.dart';
import '../../core/constants.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nombreCtrl    = TextEditingController();
  final _correoCtrl    = TextEditingController();
  final _documentoCtrl = TextEditingController();
  final _telefonoCtrl  = TextEditingController();
  final _direccionCtrl = TextEditingController();
  final _passCtrl      = TextEditingController();
  final _confirmCtrl   = TextEditingController();

  bool _cargando = false;
  bool _verPass  = false;
  String? _error;

  @override
  void dispose() {
    _nombreCtrl.dispose();    _correoCtrl.dispose();
    _documentoCtrl.dispose(); _telefonoCtrl.dispose();
    _direccionCtrl.dispose(); _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _registrar() async {
    if (_passCtrl.text != _confirmCtrl.text) {
      setState(() => _error = 'Las contraseñas no coinciden');
      return;
    }

    setState(() { _cargando = true; _error = null; });

    try {
      // Validar si ya existe el correo
      final checkRes = await http.get(
        Uri.parse('${AppConstants.baseUrl}/usuario?correo=${_correoCtrl.text.trim()}'),
      );
      final checkData = jsonDecode(checkRes.body);
      if (checkData is List && checkData.isNotEmpty) {
        setState(() { _error = 'El correo ya está registrado'; _cargando = false; });
        return;
      }

      // Registrar usuario
      final res = await http.post(
        Uri.parse('${AppConstants.baseUrl}/usuarios/registro'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'nombre':    _nombreCtrl.text.trim(),
          'correo':    _correoCtrl.text.trim(),
          'documento': _documentoCtrl.text.trim(),
          'telefono':  _telefonoCtrl.text.trim(),
          'direccion': _direccionCtrl.text.trim(),
          'pass':      _passCtrl.text,
          'rol_idRol': 3,
        }),
      );

      if (!mounted) return;

      if (res.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('¡Registro exitoso! Inicia sesión'), backgroundColor: IngenixTheme.principal),
        );
        context.go('/login');
      } else {
        final data = jsonDecode(res.body);
        setState(() => _error = data['message'] ?? 'Error al registrar');
      }
    } catch (e) {
      setState(() => _error = 'No se pudo conectar al servidor');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Widget _campo(String label, TextEditingController ctrl, {
    TextInputType tipo = TextInputType.text,
    bool obscure = false,
    String? hint,
    Widget? sufijo,
    TextInputAction action = TextInputAction.next,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: IngenixTheme.textoSec)),
        const SizedBox(height: 6),
        TextField(
          controller: ctrl,
          keyboardType: tipo,
          obscureText: obscure,
          textInputAction: action,
          decoration: InputDecoration(hintText: hint, suffixIcon: sufijo),
        ),
        const SizedBox(height: 16),
      ],
    );
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
                  boxShadow: [BoxShadow(color: const Color(0xFF292814).withOpacity(0.08), blurRadius: 35, offset: const Offset(0, 15))],
                ),
                padding: const EdgeInsets.all(30),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Tabs
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        GestureDetector(onTap: () => context.go('/login'), child: const _Tab(label: 'Iniciar sesión', activo: false)),
                        const SizedBox(width: 8),
                        Container(width: 1, height: 24, color: IngenixTheme.secundario),
                        const SizedBox(width: 8),
                        const _Tab(label: 'Registrarse', activo: true),
                      ],
                    ),
                    const SizedBox(height: 28),

                    if (_error != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFFD32F2F).withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                        child: Text(_error!, style: const TextStyle(color: Color(0xFFD32F2F), fontSize: 13), textAlign: TextAlign.center),
                      ),
                      const SizedBox(height: 16),
                    ],

                    _campo('Nombre completo', _nombreCtrl, hint: 'Ej: Juan Pérez'),
                    _campo('Correo electrónico', _correoCtrl, tipo: TextInputType.emailAddress, hint: 'correo@ejemplo.com'),
                    _campo('Documento', _documentoCtrl, tipo: TextInputType.number, hint: 'Número de documento'),
                    _campo('Teléfono', _telefonoCtrl, tipo: TextInputType.phone, hint: '3001234567'),
                    _campo('Dirección', _direccionCtrl, hint: 'Calle 1 # 2-3'),
                    _campo('Contraseña', _passCtrl, obscure: !_verPass, hint: '••••••••',
                      sufijo: IconButton(
                        icon: Icon(_verPass ? Icons.visibility_off : Icons.visibility),
                        onPressed: () => setState(() => _verPass = !_verPass),
                      ),
                    ),
                    _campo('Confirmar contraseña', _confirmCtrl, obscure: true, hint: '••••••••', action: TextInputAction.done),

                    ElevatedButton(
                      onPressed: _cargando ? null : _registrar,
                      child: _cargando
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Crear cuenta'),
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

class _Tab extends StatelessWidget {
  final String label;
  final bool activo;
  const _Tab({required this.label, required this.activo});

  @override
  Widget build(BuildContext context) => Text(label, style: TextStyle(
    fontSize: 15, fontWeight: activo ? FontWeight.w600 : FontWeight.normal,
    color: activo ? IngenixTheme.texto : IngenixTheme.textoSec,
  ));
}
