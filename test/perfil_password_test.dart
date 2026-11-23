import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ingenixm/models/usuario_model.dart';
import 'package:ingenixm/screens/perfil_screen.dart';
import 'package:ingenixm/services/auth_service.dart';
import 'package:ingenixm/services/carrito_service.dart';

void main() {
  testWidgets('technician profile includes the password change form', (
    tester,
  ) async {
    final auth = AuthService()
      ..actualizarUsuario(
        Usuario(
          idUsuario: 7,
          nombre: 'Técnico',
          correo: 'tecnico@example.com',
          rol: 'tecnico',
        ),
      );

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: auth),
          ChangeNotifierProvider(create: (_) => CarritoService()),
        ],
        child: const MaterialApp(home: PerfilScreen()),
      ),
    );

    await tester.ensureVisible(find.text('Cambiar contraseña'));
    await tester.tap(find.text('Cambiar contraseña'));
    await tester.pump();

    expect(find.text('Contraseña actual'), findsOneWidget);
    expect(find.text('Nueva contraseña (mínimo 8 caracteres)'), findsOneWidget);
    expect(find.text('Confirmar nueva contraseña'), findsOneWidget);
  });
}
