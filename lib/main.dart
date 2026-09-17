import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'core/router.dart';
import 'services/auth_service.dart';
import 'services/carrito_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final authService = AuthService();
  await authService.cargarSesion();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => authService),
        ChangeNotifierProvider(create: (_) => CarritoService()),
      ],
      child: const IngenixApp(),
    ),
  );
}

class IngenixApp extends StatelessWidget {
  const IngenixApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Ingenix',
      debugShowCheckedModeBanner: false,
      theme: IngenixTheme.tema,
      routerConfig: appRouter(context),
    );
  }
}