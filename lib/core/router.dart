import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../screens/home_invited_screen.dart';
import '../screens/login_screen.dart';
import '../screens/register_screen.dart';
import '../screens/home_screen.dart';
import '../screens/catalogo_screen.dart';
import '../screens/carrito_screen.dart';
import '../screens/pago_screen.dart';
import '../screens/perfil_screen.dart';
import '../screens/solicitud_cliente_screen.dart';
import '../screens/solicitud_mantenimiento_screen.dart';
import '../screens/solicitud_entrega_screen.dart';
import '../screens/solicitud_venta_admin_screen.dart';
import '../screens/solicitudes_almacenadas_screen.dart';
import '../screens/panel_solicitudes_screen.dart';
import '../screens/usuarios_screen.dart';
import '../screens/productos_screen.dart';
import '../screens/recuperar_password_screen.dart';
import '../screens/restablecer_password_screen.dart';
import '../screens/gestion_screen.dart';

GoRouter appRouter(BuildContext context) {
  final auth = Provider.of<AuthService>(context, listen: false);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final logueado = auth.usuario != null;
      final enLogin = state.matchedLocation == '/login';
      final enPublic =
          [
            '/login',
            '/register',
            '/recuperar-password',
          ].contains(state.matchedLocation) ||
          state.matchedLocation.startsWith('/restablecer-password/');

      if (!logueado && !enPublic) return '/';
      if (logueado && enLogin) return '/home';
      if (logueado &&
          state.matchedLocation == '/solicitud-cliente' &&
          (auth.usuario?.esTecnico == true || auth.usuario?.esAdmin == true)) {
        return auth.usuario?.esAdmin == true
            ? '/solicitud-venta-admin'
            : '/panel-solicitudes';
      }
      if (logueado &&
          state.matchedLocation == '/solicitud-venta-admin' &&
          auth.usuario?.esAdmin != true) {
        return '/panel-solicitudes';
      }
      if (logueado &&
          state.matchedLocation == '/gestion' &&
          auth.usuario?.esAdmin != true) {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (c, s) => const HomeInvitadoScreen()),
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      GoRoute(path: '/register', builder: (c, s) => const RegisterScreen()),
      GoRoute(
        path: '/recuperar-password',
        builder: (c, s) => const RecuperarPasswordScreen(),
      ),
      GoRoute(
        path: '/restablecer-password/:token',
        builder: (c, s) =>
            RestablecerPasswordScreen(token: s.pathParameters['token']!),
      ),
      GoRoute(path: '/home', builder: (c, s) => const HomeScreen()),
      GoRoute(path: '/catalogo', builder: (c, s) => const CatalogoScreen()),
      GoRoute(path: '/carrito', builder: (c, s) => const CarritoScreen()),
      GoRoute(path: '/pago', builder: (c, s) => const PagoScreen()),
      GoRoute(path: '/perfil', builder: (c, s) => const PerfilScreen()),
      GoRoute(
        path: '/solicitud-cliente',
        builder: (c, s) => const SolicitudClienteScreen(),
      ),
      GoRoute(
        path: '/solicitud-venta-admin',
        builder: (c, s) => const SolicitudVentaAdminScreen(),
      ),
      GoRoute(
        path: '/solicitud-mantenimiento',
        builder: (c, s) => const SolicitudMantenimientoScreen(),
      ),
      GoRoute(
        path: '/solicitud-entrega',
        builder: (c, s) => const SolicitudEntregaScreen(),
      ),
      GoRoute(
        path: '/solicitudes-almacenadas',
        builder: (c, s) => const SolicitudesAlmacenadasScreen(),
      ),
      GoRoute(
        path: '/panel-solicitudes',
        builder: (c, s) => const PanelSolicitudesScreen(),
      ),
      GoRoute(path: '/usuarios', builder: (c, s) => const UsuariosScreen()),
      GoRoute(path: '/productos', builder: (c, s) => const ProductosScreen()),
      GoRoute(path: '/gestion', builder: (c, s) => const GestionScreen()),
    ],
  );
}
