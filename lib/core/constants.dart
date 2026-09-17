class AppConstants {
  // Cambia esta IP por la IP de tu máquina cuando pruebes en dispositivo físico
  // En emulador Android usa 10.0.2.2 en lugar de localhost
static const String baseUrl = 'http://localhost:3000';

  // Roles
  static const String rolAdmin   = 'admin';
  static const String rolTecnico = 'tecnico';
  static const String rolUsuario = 'usuario';

  // Keys para SharedPreferences
  static const String keyToken   = 'token';
  static const String keyUsuario = 'usuario';
}
