import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';

class PanelSidebar extends StatelessWidget {
  final String activeRoute;
  final bool showStored;

  const PanelSidebar({
    super.key,
    required this.activeRoute,
    this.showStored = false,
  });

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<AuthService>().usuario;
    final esAdmin = usuario?.esAdmin ?? false;
    final esUsuario = usuario?.esUsuario ?? false;
    final mostrarAlmacenadas = showStored || esAdmin;

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(18, 26, 14, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Panel de Gestión',
            style: TextStyle(
              color: IngenixTheme.texto,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 24),
          _PanelLink(
            icon: Icons.insights_outlined,
            label: 'Estadísticas',
            route: '/panel-solicitudes',
            active: activeRoute == '/panel-solicitudes',
          ),
          _PanelLink(
            icon: Icons.build_outlined,
            label: 'Solicitud Mantenimiento',
            route: '/solicitud-mantenimiento',
            active: activeRoute == '/solicitud-mantenimiento',
          ),
          _PanelLink(
            icon: Icons.local_shipping_outlined,
            label: 'Solicitud Entrega',
            route: '/solicitud-entrega',
            active: activeRoute == '/solicitud-entrega',
          ),
          if (esAdmin || esUsuario)
            _PanelLink(
              icon: Icons.sell_outlined,
              label: 'Solicitud Venta',
              route: esAdmin ? '/solicitud-venta-admin' : '/solicitud-cliente',
              active:
                  activeRoute == '/solicitud-cliente' ||
                  activeRoute == '/solicitud-venta-admin',
            ),
          if (mostrarAlmacenadas)
            _PanelLink(
              icon: Icons.inventory_2_outlined,
              label: 'Solicitud Almacenada',
              route: '/solicitudes-almacenadas',
              active: activeRoute == '/solicitudes-almacenadas',
            ),
          if (esAdmin)
            _PanelLink(
              icon: Icons.settings_outlined,
              label: 'Gestión',
              route: '/gestion',
              active: activeRoute == '/gestion',
            ),
        ],
      ),
    );
  }
}

class _PanelLink extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;
  final bool active;

  const _PanelLink({
    required this.icon,
    required this.label,
    required this.route,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Material(
        color: active
            ? IngenixTheme.principal.withValues(alpha: .16)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: ListTile(
          dense: true,
          contentPadding: const EdgeInsets.symmetric(horizontal: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          tileColor: Colors.transparent,
          leading: Icon(icon, size: 19, color: IngenixTheme.principal),
          title: Text(
            label,
            style: const TextStyle(color: IngenixTheme.texto, fontSize: 12),
          ),
          onTap: () => context.go(route),
        ),
      ),
    );
  }
}
