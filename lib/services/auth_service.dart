import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/usuario_model.dart';
import '../core/constants.dart';

class AuthService extends ChangeNotifier {
  Usuario? _usuario;
  String? _token;

  Usuario? get usuario => _usuario;
  String? get token => _token;
  bool get logueado => _usuario != null;

  void actualizarUsuario(Usuario usuario) {
    _usuario = usuario;
    notifyListeners();
  }

  // Carga sesión guardada al iniciar la app
  Future<void> cargarSesion() async {
    final prefs = await SharedPreferences.getInstance();
    final tokenGuardado = prefs.getString(AppConstants.keyToken);
    final usuarioGuardado = prefs.getString(AppConstants.keyUsuario);

    if (tokenGuardado != null && usuarioGuardado != null) {
      _token = tokenGuardado;
      _usuario = Usuario.fromJson(jsonDecode(usuarioGuardado));
      notifyListeners();
    }
  }

  // Login
  Future<Map<String, dynamic>> login(String correo, String pass) async {
    try {
      final res = await http.post(
        Uri.parse('${AppConstants.baseUrl}/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'correo': correo, 'pass': pass}),
      );

      final data = jsonDecode(res.body);

      if (res.statusCode == 200) {
        _token = data['token'];
        _usuario = Usuario.fromJson(data['usuario']);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.keyToken, _token!);
        await prefs.setString(
          AppConstants.keyUsuario,
          jsonEncode(_usuario!.toJson()),
        );

        notifyListeners();
        return {'ok': true};
      } else {
        return {
          'ok': false,
          'message': data['message'] ?? 'Credenciales inválidas',
        };
      }
    } catch (e) {
      return {'ok': false, 'message': 'No se pudo conectar al servidor'};
    }
  }

  // Cerrar sesión
  Future<void> cerrarSesion() async {
    _usuario = null;
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.keyToken);
    await prefs.remove(AppConstants.keyUsuario);
    notifyListeners();
  }

  // Headers con token para rutas protegidas
  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $_token',
  };
}
