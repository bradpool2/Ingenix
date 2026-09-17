import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import '../core/constants.dart';
import '../core/theme.dart';
import '../models/usuario_model.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';

class PerfilScreen extends StatefulWidget {
  const PerfilScreen({super.key});

  @override
  State<PerfilScreen> createState() => _PerfilScreenState();
}

class _PerfilScreenState extends State<PerfilScreen> {
  bool _editando = false;
  bool _guardando = false;
  late final TextEditingController _nombreCtrl;
  late final TextEditingController _correoCtrl;
  late final TextEditingController _telefonoCtrl;
  late final TextEditingController _direccionCtrl;
  late final TextEditingController _documentoCtrl;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthService>().usuario!;
    _nombreCtrl = TextEditingController(text: user.nombre);
    _correoCtrl = TextEditingController(text: user.correo);
    _telefonoCtrl = TextEditingController(text: user.telefono ?? '');
    _direccionCtrl = TextEditingController(text: user.direccion ?? '');
    _documentoCtrl = TextEditingController(text: user.documento ?? '');
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _correoCtrl.dispose();
    _telefonoCtrl.dispose();
    _direccionCtrl.dispose();
    _documentoCtrl.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    final telefono = _telefonoCtrl.text.replaceAll(RegExp(r'\D'), '');
    if (!RegExp(r'^\d{10}$').hasMatch(telefono)) {
      _mensaje(
        'El número de teléfono debe tener exactamente 10 dígitos',
        error: true,
      );
      return;
    }

    final auth = context.read<AuthService>();
    final user = auth.usuario!;
    setState(() => _guardando = true);

    try {
      final response = await http.put(
        Uri.parse('${AppConstants.baseUrl}/usuarios/${user.idUsuario}'),
        headers: auth.headers,
        body: jsonEncode({
          'nombre': _nombreCtrl.text.trim(),
          'correo': _correoCtrl.text.trim(),
          'telefono': telefono,
          'direccion': _direccionCtrl.text.trim(),
          'documento': _documentoCtrl.text.trim(),
          'rol_idRol': user.esAdmin
              ? 1
              : user.esTecnico
              ? 2
              : 3,
        }),
      );

      if (!mounted) return;
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final body = jsonDecode(response.body);
        final updated = body['usuario'] is Map<String, dynamic>
            ? Usuario.fromJson(body['usuario'])
            : Usuario(
                idUsuario: user.idUsuario,
                nombre: _nombreCtrl.text.trim(),
                correo: _correoCtrl.text.trim(),
                rol: user.rol,
                telefono: telefono,
                direccion: _direccionCtrl.text.trim(),
                documento: _documentoCtrl.text.trim(),
              );
        auth.actualizarUsuario(updated);
        setState(() => _editando = false);
        _mensaje('Datos actualizados correctamente');
      } else {
        _mensaje('Error al actualizar los datos', error: true);
      }
    } catch (_) {
      if (mounted) _mensaje('No se pudo conectar con el servidor', error: true);
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  void _mensaje(String message, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: error ? IngenixTheme.error : IngenixTheme.principal,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().usuario;
    if (user == null) {
      return const Scaffold(body: Center(child: Text('No hay sesión activa')));
    }

    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: Theme.of(context).textTheme.apply(fontFamily: 'Roboto'),
      ),
      child: Scaffold(
        appBar: const NavBarWidget(),
        backgroundColor: IngenixTheme.fondo,
        body: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 700;
            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: isWide ? 40 : 20,
                vertical: isWide ? 72 : 28,
              ),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 800),
                  child: _profileCard(user: user, isWide: isWide),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _profileCard({required Usuario user, required bool isWide}) {
    final identity = Container(
      width: isWide ? 202 : double.infinity,
      padding: const EdgeInsets.all(26),
      color: const Color(0xFFF5FAF9),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: IngenixTheme.blanco,
              border: Border.all(color: const Color(0xFFD9E9E7)),
            ),
            child: const Icon(
              Icons.person_outline,
              color: IngenixTheme.principal,
              size: 35,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            user.nombre,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: IngenixTheme.texto,
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          _RoleBadge(label: user.rol),
        ],
      ),
    );

    final details = Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Información personal',
                  style: TextStyle(
                    color: IngenixTheme.texto,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (!_editando)
                OutlinedButton(
                  onPressed: () => setState(() => _editando = true),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: IngenixTheme.texto,
                    side: const BorderSide(color: IngenixTheme.principal),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 13,
                      vertical: 9,
                    ),
                    minimumSize: Size.zero,
                    textStyle: const TextStyle(fontSize: 11),
                  ),
                  child: const Text('Editar perfil'),
                ),
            ],
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 32,
            runSpacing: 22,
            children: [
              _ProfileField(
                label: 'Nombre',
                value: _nombreCtrl.text,
                controller: _nombreCtrl,
                editing: _editando,
              ),
              _ProfileField(
                label: 'Correo',
                value: _correoCtrl.text,
                controller: _correoCtrl,
                editing: _editando,
                keyboardType: TextInputType.emailAddress,
              ),
              _ProfileField(
                label: 'Teléfono',
                value: _telefonoCtrl.text,
                controller: _telefonoCtrl,
                editing: _editando,
                keyboardType: TextInputType.phone,
                numeric: true,
              ),
              _ProfileField(
                label: 'Documento',
                value: _documentoCtrl.text,
                controller: _documentoCtrl,
                editing: _editando,
                keyboardType: TextInputType.number,
                numeric: true,
              ),
              _ProfileField(
                label: 'Dirección',
                value: _direccionCtrl.text,
                controller: _direccionCtrl,
                editing: _editando,
              ),
              _ProfileField(
                label: 'Rol asignado',
                value: user.rol,
                badge: true,
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(color: Color(0xFFE1ECEA), height: 1),
          const SizedBox(height: 12),
          if (_editando)
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                FilledButton(
                  onPressed: _guardando ? null : _guardar,
                  style: FilledButton.styleFrom(
                    backgroundColor: IngenixTheme.principal,
                    foregroundColor: IngenixTheme.texto,
                  ),
                  child: Text(_guardando ? 'Guardando...' : 'Guardar cambios'),
                ),
                OutlinedButton(
                  onPressed: _guardando
                      ? null
                      : () => setState(() {
                          _editando = false;
                          _nombreCtrl.text = user.nombre;
                          _correoCtrl.text = user.correo;
                          _telefonoCtrl.text = user.telefono ?? '';
                          _direccionCtrl.text = user.direccion ?? '';
                          _documentoCtrl.text = user.documento ?? '';
                        }),
                  child: const Text('Cancelar'),
                ),
              ],
            )
          else
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton(
                onPressed: () => context.go('/home'),
                child: const Text('Volver'),
              ),
            ),
        ],
      ),
    );

    return Container(
      decoration: BoxDecoration(
        color: IngenixTheme.blanco,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDCEAE8)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: isWide
          ? IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  identity,
                  Expanded(child: details),
                ],
              ),
            )
          : Column(children: [identity, details]),
    );
  }
}

class _ProfileField extends StatelessWidget {
  final String label;
  final String value;
  final TextEditingController? controller;
  final bool editing;
  final TextInputType keyboardType;
  final bool numeric;
  final bool badge;

  const _ProfileField({
    required this.label,
    required this.value,
    this.controller,
    this.editing = false,
    this.keyboardType = TextInputType.text,
    this.numeric = false,
    this.badge = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 190,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: IngenixTheme.textoSec,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          if (editing && controller != null)
            TextField(
              controller: controller,
              keyboardType: keyboardType,
              maxLength: numeric ? 10 : null,
              decoration: const InputDecoration(
                counterText: '',
                isDense: true,
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 10,
                ),
              ),
            )
          else if (badge)
            _RoleBadge(label: value)
          else
            Text(
              value.isEmpty ? 'No registrado' : value,
              style: const TextStyle(color: IngenixTheme.texto, fontSize: 13),
            ),
        ],
      ),
    );
  }
}

class _RoleBadge extends StatelessWidget {
  final String label;

  const _RoleBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: IngenixTheme.principal,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: IngenixTheme.texto,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
