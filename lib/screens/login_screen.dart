import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../core/theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _correoCtrl = TextEditingController();
  final _passCtrl   = TextEditingController();
  bool _cargando    = false;
  bool _verPass     = false;
  String? _error;

  @override
  void dispose() {
    _correoCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() { _cargando = true; _error = null; });

    final auth   = context.read<AuthService>();
    final result = await auth.login(_correoCtrl.text.trim(), _passCtrl.text.trim());

    if (!mounted) return;
    setState(() => _cargando = false);

    if (result['ok']) {
      context.go('/home');
    } else {
      setState(() => _error = result['message']);
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
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF292814).withOpacity(0.08),
                      blurRadius: 35,
                      offset: const Offset(0, 15),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(30),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Tabs
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _Tab(label: 'Iniciar sesión', activo: true),
                        const SizedBox(width: 8),
                        Container(width: 1, height: 24, color: IngenixTheme.secundario),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => context.go('/register'),
                          child: _Tab(label: 'Registrarse', activo: false),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),

                    // Error
                    if (_error != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD32F2F).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Color(0xFFD32F2F), fontSize: 13),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Correo
                    const Text('Correo electrónico', style: TextStyle(fontSize: 13, color: IngenixTheme.textoSec)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _correoCtrl,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(hintText: 'correo@ejemplo.com'),
                    ),
                    const SizedBox(height: 18),

                    // Contraseña
                    const Text('Contraseña', style: TextStyle(fontSize: 13, color: IngenixTheme.textoSec)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _passCtrl,
                      obscureText: !_verPass,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _login(),
                      decoration: InputDecoration(
                        hintText: '••••••••',
                        suffixIcon: IconButton(
                          icon: Icon(_verPass ? Icons.visibility_off : Icons.visibility),
                          onPressed: () => setState(() => _verPass = !_verPass),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Botón
                    ElevatedButton(
                      onPressed: _cargando ? null : _login,
                      child: _cargando
                          ? const SizedBox(
                              height: 20, width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Iniciar Sesión'),
                    ),
                    const SizedBox(height: 16),

                    // Recuperar contraseña
                    TextButton(
                      onPressed: () => context.go('/recuperar-password'),
                      child: const Text(
                        '¿Olvidaste tu contraseña?',
                        style: TextStyle(color: IngenixTheme.textoSec, fontSize: 13),
                      ),
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
  Widget build(BuildContext context) {
    return Text(
      label,
      style: TextStyle(
        fontSize: 15,
        fontWeight: activo ? FontWeight.w600 : FontWeight.normal,
        color: activo ? IngenixTheme.texto : IngenixTheme.textoSec,
      ),
    );
  }
}
