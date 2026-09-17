import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:badges/badges.dart' as badges;
import '../services/auth_service.dart';
import '../services/carrito_service.dart';
import '../core/theme.dart';
import '../screens/carrito_plegable_screen.dart';

class NavBarWidget extends StatefulWidget implements PreferredSizeWidget {
  const NavBarWidget({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(58);

  @override
  State<NavBarWidget> createState() => _NavBarWidgetState();
}

class _NavBarWidgetState extends State<NavBarWidget> {
  OverlayEntry? _carritoOverlay;

  @override
  void dispose() {
    _carritoOverlay?.remove();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final carrito = context.watch<CarritoService>();
    final user = auth.usuario;
    final isWide = MediaQuery.sizeOf(context).width >= 1250;
    final initial = user?.nombre.isNotEmpty == true
        ? user!.nombre.substring(0, 1).toUpperCase()
        : 'I';

    return AppBar(
      automaticallyImplyLeading: false,
      toolbarHeight: 58,
      backgroundColor: IngenixTheme.blanco,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleSpacing: 10,
      leadingWidth: 54,
      leading: InkWell(
        onTap: () => context.go(user == null ? '/' : '/home'),
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: CircleAvatar(
            backgroundColor: IngenixTheme.principal.withValues(alpha: .2),
            child: Text(
              initial,
              style: const TextStyle(
                color: IngenixTheme.texto,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
      title: Text(
        user?.nombre ?? 'Ingenix',
        style: const TextStyle(
          color: IngenixTheme.texto,
          fontSize: 14,
          fontWeight: FontWeight.w700,
        ),
      ),
      actions: user == null
          ? const []
          : isWide
          ? [
              _NavLink(label: 'Home', onTap: () => context.go('/home')),
              if (user.esUsuario)
                _NavLink(
                  label: 'Mis solicitudes',
                  onTap: () => context.go('/solicitud-cliente'),
                ),
              if (user.esUsuario)
                _NavLink(
                  label: 'Catálogo',
                  onTap: () => context.go('/catalogo'),
                ),
              _NavLink(
                label: user.esAdmin ? 'Usuarios' : 'Perfil',
                onTap: () => context.go(user.esAdmin ? '/usuarios' : '/perfil'),
              ),
              if (user.esTecnico)
                _NavLink(
                  label: 'Solicitudes',
                  onTap: () => context.go('/panel-solicitudes'),
                ),
              if (user.esAdmin)
                _NavLink(
                  label: 'Productos',
                  onTap: () => context.go('/productos'),
                ),
              if (user.esUsuario)
                badges.Badge(
                  badgeContent: Text(
                    carrito.totalItems.toString(),
                    style: const TextStyle(color: Colors.white, fontSize: 9),
                  ),
                  showBadge: carrito.totalItems > 0,
                  child: IconButton(
                    tooltip: 'Carrito',
                    icon: const Icon(Icons.shopping_cart_outlined),
                    color: IngenixTheme.texto,
                    onPressed: () => _abrirCarrito(context),
                  ),
                ),
              IconButton(
                tooltip: 'Notificaciones',
                icon: const Icon(Icons.notifications_none_outlined),
                color: IngenixTheme.texto,
                onPressed: () {},
              ),
              Padding(
                padding: const EdgeInsets.only(right: 8, left: 2),
                child: TextButton(
                  onPressed: () async {
                    await auth.cerrarSesion();
                    if (context.mounted) context.go('/');
                  },
                  style: TextButton.styleFrom(
                    backgroundColor: IngenixTheme.principal,
                    foregroundColor: IngenixTheme.texto,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(7),
                    ),
                  ),
                  child: const Text('Cerrar sesión'),
                ),
              ),
            ]
          : [
              if (user.esUsuario)
                badges.Badge(
                  badgeContent: Text(
                    carrito.totalItems.toString(),
                    style: const TextStyle(color: Colors.white, fontSize: 9),
                  ),
                  showBadge: carrito.totalItems > 0,
                  child: IconButton(
                    tooltip: 'Carrito',
                    icon: const Icon(Icons.shopping_cart_outlined),
                    onPressed: () => _abrirCarrito(context),
                  ),
                ),
              PopupMenuButton<String>(
                tooltip: 'Menú',
                onSelected: (value) => _selectMenu(context, auth, value),
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'home', child: Text('Home')),
                  if (user.esUsuario) ...[
                    const PopupMenuItem(
                      value: 'solicitudes',
                      child: Text('Mis solicitudes'),
                    ),
                    const PopupMenuItem(
                      value: 'catalogo',
                      child: Text('Catálogo'),
                    ),
                  ],
                  const PopupMenuItem(value: 'perfil', child: Text('Perfil')),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    value: 'salir',
                    child: Text('Cerrar sesión'),
                  ),
                ],
              ),
            ],
    );
  }

  void _abrirCarrito(BuildContext context) {
    if (_carritoOverlay != null) {
      _cerrarCarrito();
      return;
    }

    final overlay = Overlay.of(context);
    _carritoOverlay = OverlayEntry(
      builder: (overlayContext) => Stack(
        children: [
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: _cerrarCarrito,
              child: const SizedBox.expand(),
            ),
          ),
          Positioned(
            top: 0,
            left: 16,
            right: 16,
            child: Align(
              alignment: Alignment.topRight,
              child: CarritoPlegableScreen(onClose: _cerrarCarrito),
            ),
          ),
        ],
      ),
    );
    overlay.insert(_carritoOverlay!);
    setState(() {});
  }

  void _cerrarCarrito() {
    _carritoOverlay?.remove();
    _carritoOverlay = null;
    if (mounted) setState(() {});
  }

  void _selectMenu(BuildContext context, AuthService auth, String value) async {
    switch (value) {
      case 'home':
        context.go('/home');
      case 'solicitudes':
        context.go('/solicitud-cliente');
      case 'catalogo':
        context.go('/catalogo');
      case 'perfil':
        context.go('/perfil');
      case 'salir':
        await auth.cerrarSesion();
        if (context.mounted) context.go('/');
    }
  }
}

class _NavLink extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _NavLink({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        foregroundColor: IngenixTheme.texto,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
      child: Text(label),
    );
  }
}
