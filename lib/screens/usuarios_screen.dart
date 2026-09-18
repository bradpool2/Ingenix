import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';

class UsuariosScreen extends StatefulWidget {
  const UsuariosScreen({super.key});
  @override
  State<UsuariosScreen> createState() => _UsuariosScreenState();
}

class _UsuariosScreenState extends State<UsuariosScreen> {
  List<Map<String, dynamic>> _users = [];
  bool _loading = true;
  String? _error;
  final _formKey = GlobalKey<FormState>();
  final _newUser = <String, String>{
    'nombre': '',
    'correo': '',
    'documento': '',
    'direccion': '',
    'telefono': '',
    'pass': '',
    'rol_idRol': '1',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final auth = context.read<AuthService>();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/usuarios'),
        headers: auth.headers,
      );
      if (response.statusCode == 200 && mounted) {
        if (!mounted) return;
        final data = jsonDecode(response.body);
        setState(
          () =>
              _users = (data is List ? data : []).whereType<Map>().map((item) {
                final user = Map<String, dynamic>.from(item);
                user['idUsuario'] ??= user['idusuario'];
                user['rol_idRol'] ??= user['rol_idrol'];
                return user;
              }).toList(),
        );
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = 'No se pudieron cargar los usuarios: $error');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthService>();
    final response = await http.post(
      Uri.parse('${AppConstants.baseUrl}/usuarios'),
      headers: auth.headers,
      body: jsonEncode(_newUser),
    );
    if (!mounted) return;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      _newUser.updateAll((key, value) => key == 'rol_idRol' ? '1' : '');
      await _load();
    } else {
      final data = response.body.isNotEmpty ? jsonDecode(response.body) : {};
      _message(
        data['error']?.toString() ??
            data['message']?.toString() ??
            'No se pudo crear el usuario.',
      );
    }
  }

  Future<void> _update(Map<String, dynamic> user) async {
    final auth = context.read<AuthService>();
    final response = await http.put(
      Uri.parse('${AppConstants.baseUrl}/usuarios/${user['idUsuario']}'),
      headers: auth.headers,
      body: jsonEncode(user),
    );
    if (!mounted) return;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      await _load();
    } else {
      _message('No se pudo actualizar el usuario.');
    }
  }

  Future<void> _delete(Map<String, dynamic> user) async {
    final auth = context.read<AuthService>();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Eliminar usuario?'),
        content: const Text('Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    await http.delete(
      Uri.parse('${AppConstants.baseUrl}/usuarios/${user['idUsuario']}'),
      headers: auth.headers,
    );
    _load();
  }

  void _message(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  Widget _input(
    String key,
    String label, {
    bool required = false,
    bool password = false,
    TextInputType? type,
  }) => TextFormField(
    initialValue: _newUser[key],
    obscureText: password,
    keyboardType: type,
    decoration: InputDecoration(labelText: label),
    validator: required
        ? (value) =>
              value == null || value.trim().isEmpty ? 'Campo obligatorio' : null
        : null,
    onChanged: (value) => _newUser[key] = value,
  );

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[
      const Text(
        'Gestión de usuarios',
        style: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: IngenixTheme.texto,
        ),
      ),
      const SizedBox(height: 16),
      _creationForm(),
      const SizedBox(height: 18),
    ];
    if (_loading) {
      children.add(const Center(child: CircularProgressIndicator()));
    } else if (_error != null) {
      children.add(
        Column(
          children: [
            Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: _load, child: const Text('Reintentar')),
          ],
        ),
      );
    } else {
      children.addAll(_users.map(_userCard));
    }
    return Scaffold(
      appBar: const NavBarWidget(),
      backgroundColor: IngenixTheme.fondo,
      body: ListView(padding: const EdgeInsets.all(20), children: children),
    );
  }

  Widget _creationForm() => Card(
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Form(
        key: _formKey,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth > 700
                ? (constraints.maxWidth - 14) / 2
                : constraints.maxWidth;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 14,
                  runSpacing: 12,
                  children: [
                    SizedBox(
                      width: width,
                      child: _input('nombre', 'Nombre', required: true),
                    ),
                    SizedBox(
                      width: width,
                      child: _input(
                        'correo',
                        'Correo',
                        required: true,
                        type: TextInputType.emailAddress,
                      ),
                    ),
                    SizedBox(
                      width: width,
                      child: _input('documento', 'Documento', required: true),
                    ),
                    SizedBox(
                      width: width,
                      child: _input('direccion', 'Dirección'),
                    ),
                    SizedBox(
                      width: width,
                      child: _input(
                        'telefono',
                        'Teléfono',
                        type: TextInputType.phone,
                      ),
                    ),
                    SizedBox(
                      width: width,
                      child: _input(
                        'pass',
                        'Contraseña',
                        required: true,
                        password: true,
                      ),
                    ),
                    SizedBox(
                      width: width,
                      child: DropdownButtonFormField<String>(
                        initialValue: _newUser['rol_idRol'],
                        decoration: const InputDecoration(labelText: 'Rol'),
                        items: const [
                          DropdownMenuItem(
                            value: '1',
                            child: Text('Administrador'),
                          ),
                          DropdownMenuItem(value: '2', child: Text('Técnico')),
                          DropdownMenuItem(value: '3', child: Text('Usuario')),
                          DropdownMenuItem(value: '4', child: Text('Cliente')),
                        ],
                        onChanged: (value) =>
                            _newUser['rol_idRol'] = value ?? '1',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _create,
                  icon: const Icon(Icons.person_add_outlined),
                  label: const Text('Agregar usuario'),
                ),
              ],
            );
          },
        ),
      ),
    ),
  );

  Widget _userCard(Map<String, dynamic> user) {
    final role = user['rol_idRol']?.toString() ?? '3';
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth < 600
                ? constraints.maxWidth
                : (constraints.maxWidth - 12) / 2;
            final fields = [
              _editable(user, 'nombre', 'Nombre'),
              _editable(user, 'correo', 'Correo'),
              _editable(user, 'documento', 'Documento'),
              _editable(user, 'direccion', 'Dirección'),
              _editable(user, 'telefono', 'Teléfono'),
              DropdownButtonFormField<String>(
                initialValue: ['1', '2', '3', '4'].contains(role) ? role : '3',
                decoration: const InputDecoration(labelText: 'Rol'),
                items: const [
                  DropdownMenuItem(value: '1', child: Text('Administrador')),
                  DropdownMenuItem(value: '2', child: Text('Técnico')),
                  DropdownMenuItem(value: '3', child: Text('Usuario')),
                  DropdownMenuItem(value: '4', child: Text('Cliente')),
                ],
                onChanged: (value) => user['rol_idRol'] = value ?? role,
              ),
            ];
            return Column(
              children: [
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: fields
                      .map((field) => SizedBox(width: width, child: field))
                      .toList(),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text('#${user['idUsuario']}'),
                    const Spacer(),
                    IconButton(
                      tooltip: 'Guardar',
                      onPressed: () => _update(user),
                      icon: const Icon(
                        Icons.save_outlined,
                        color: IngenixTheme.principal,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Eliminar',
                      onPressed: () => _delete(user),
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                    ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _editable(Map<String, dynamic> user, String key, String label) =>
      TextFormField(
        initialValue: user[key]?.toString() ?? '',
        decoration: InputDecoration(labelText: label),
        onChanged: (value) => user[key] = value,
      );
}
