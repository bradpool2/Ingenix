class Usuario {
  final int idUsuario;
  final String nombre;
  final String correo;
  final String rol;
  final String? telefono;
  final String? direccion;
  final String? documento;

  Usuario({
    required this.idUsuario,
    required this.nombre,
    required this.correo,
    required this.rol,
    this.telefono,
    this.direccion,
    this.documento,
  });

  factory Usuario.fromJson(Map<String, dynamic> json) => Usuario(
    idUsuario: json['idUsuario'] ?? json['idusuario'] ?? 0,
    nombre: json['nombre'] ?? '',
    correo: json['correo'] ?? '',
    rol: json['rol'] ?? json['nombrerol'] ?? json['nombreRol'] ?? '',
    telefono: json['telefono'] ?? json['telefonoUsuario'],
    direccion: json['direccion'],
    documento: (json['documento'] ?? json['documentoUsuario'])?.toString(),
  );

  Map<String, dynamic> toJson() => {
    'idUsuario': idUsuario,
    'nombre': nombre,
    'correo': correo,
    'rol': rol,
    'telefono': telefono,
    'direccion': direccion,
    'documento': documento,
  };

  String get rolNormalizado => rol.trim().toLowerCase();

  bool get esAdmin => rolNormalizado == 'admin';
  bool get esTecnico => rolNormalizado == 'tecnico';
  bool get esUsuario =>
      rolNormalizado == 'usuario' ||
      rolNormalizado == 'cliente' ||
      rolNormalizado == 'user';
}
