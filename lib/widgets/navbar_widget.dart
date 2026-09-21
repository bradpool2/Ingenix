import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:badges/badges.dart' as badges;
import '../services/auth_service.dart';
import '../services/carrito_service.dart';
import '../core/theme.dart';
import '../core/constants.dart';
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
  Timer? _notificationTimer;
  List<Map<String, dynamic>> _notifications = [];
  String _notificationSearch = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadNotifications();
      _notificationTimer = Timer.periodic(
        const Duration(seconds: 30),
        (_) => _loadNotifications(),
      );
    });
  }

  @override
  void dispose() {
    _carritoOverlay?.remove();
    _notificationTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    final auth = context.read<AuthService>();
    if (auth.usuario == null) return;
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/notificaciones'),
        headers: auth.headers,
      );
      if (!mounted || response.statusCode != 200) return;
      final data = jsonDecode(response.body);
      if (data is List) {
        setState(() {
          _notifications = data.whereType<Map>().map((item) {
            final notification = Map<String, dynamic>.from(item);
            notification['idNotificacion'] ??= notification['idnotificacion'];
            notification['idSolicitud'] ??= notification['idsolicitud'];
            notification['requiereAccion'] ??= notification['requiere_accion'];
            notification['createdAt'] ??= notification['created_at'];
            return notification;
          }).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _markNotificationRead(Map<String, dynamic> notification) async {
    if (notification['leida'] == true) return;
    final auth = context.read<AuthService>();
    await http.put(
      Uri.parse(
        '${AppConstants.baseUrl}/notificaciones/${notification['idNotificacion']}/leida',
      ),
      headers: auth.headers,
    );
    if (mounted) {
      setState(() => notification['leida'] = true);
    }
  }

  List<Map<String, dynamic>> get _filteredNotifications {
    if (_notificationSearch.isEmpty) return _notifications;
    return _notifications.where((notification) {
      final content = '${notification['titulo'] ?? ''} ${notification['mensaje'] ?? ''}'
          .toLowerCase();
      return content.contains(_notificationSearch);
    }).toList();
  }

  Future<void> _markAllNotificationsRead() async {
    final auth = context.read<AuthService>();
    final response = await http.put(
      Uri.parse('${AppConstants.baseUrl}/notificaciones/marcar-todas-leidas'),
      headers: auth.headers,
    );
    if (mounted && response.statusCode >= 200 && response.statusCode < 300) {
      setState(() {
        for (final notification in _notifications) {
          notification['leida'] = true;
        }
      });
    }
  }

  void _openNotification(Map<String, dynamic> notification) {
    final user = context.read<AuthService>().usuario;
    final title = notification['titulo']?.toString().toLowerCase() ?? '';
    Navigator.pop(context);
    _markNotificationRead(notification);
    if (title.contains('almacen')) {
      context.go(
        user?.esAdmin == true
            ? '/solicitudes-almacenadas'
            : '/solicitud-cliente',
      );
    } else if (notification['idSolicitud'] != null) {
      context.go(
        user?.esAdmin == true || user?.esTecnico == true
            ? '/solicitud-entrega'
            : '/solicitud-cliente',
      );
    }
  }

  Widget _notificationButton(BuildContext context) {
    final unread = _notifications
        .where((notification) => notification['leida'] != true)
        .length;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          tooltip: 'Notificaciones',
          icon: const Icon(Icons.notifications_none_outlined),
          color: IngenixTheme.texto,
          onPressed: () => _showNotifications(context),
        ),
        if (unread > 0)
          Positioned(
            right: 5,
            top: 4,
            child: CircleAvatar(
              radius: 8,
              backgroundColor: Colors.red,
              child: Text(
                '$unread',
                style: const TextStyle(color: Colors.white, fontSize: 9),
              ),
            ),
          ),
      ],
    );
  }

  void _showNotifications(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => Dialog(
        insetPadding: const EdgeInsets.all(20),
        child: SafeArea(
          child: SizedBox(
            height: MediaQuery.sizeOf(context).height * .7,
            child: Column(
              children: [
              ListTile(
                title: const Text(
                  'Notificaciones',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                trailing: TextButton(
                  onPressed: _markAllNotificationsRead,
                  child: const Text('Marcar todas'),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: TextField(
                  onChanged: (value) => setState(
                    () => _notificationSearch = value.trim().toLowerCase(),
                  ),
                  decoration: const InputDecoration(
                    hintText: 'Buscar notificaciones',
                    prefixIcon: Icon(Icons.search),
                    isDense: true,
                  ),
                ),
              ),
              Expanded(
                child: _filteredNotifications.isEmpty
                    ? const Center(child: Text('No tienes notificaciones.'))
                    : ListView.builder(
                        itemCount: _filteredNotifications.length,
                        itemBuilder: (context, index) {
                          final notification = _filteredNotifications[index];
                          return ListTile(
                            leading: Icon(
                              notification['leida'] == true
                                  ? Icons.notifications_none
                                  : Icons.notifications_active,
                              color: notification['leida'] == true
                                  ? IngenixTheme.textoSec
                                  : IngenixTheme.principal,
                            ),
                            title: Text(
                              notification['titulo']?.toString() ??
                                  'Notificación',
                            ),
                            subtitle: Text(
                              notification['mensaje']?.toString() ?? '',
                            ),
                            onTap: () => _openNotification(notification),
                          );
                        },
                      ),
              ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final carrito = context.watch<CarritoService>();
    final user = auth.usuario;
    final isWide = MediaQuery.sizeOf(context).width >= 1250;
    final isNarrow = MediaQuery.sizeOf(context).width < 380;
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
      titleSpacing: 2,
      leadingWidth: 42,
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
      title: isNarrow
          ? const SizedBox.shrink()
          : Text(
              user?.nombre ?? 'Ingenix',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
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
                label: 'Perfil',
                onTap: () => context.go('/perfil'),
              ),
              if (user.esTecnico || user.esAdmin)
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
              _notificationButton(context),
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
              _notificationButton(context),
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
                    PopupMenuItem(
                      value: 'carrito',
                      child: Text('Carrito (${carrito.totalItems})'),
                    ),
                    const PopupMenuItem(
                      value: 'solicitudes',
                      child: Text('Mis solicitudes'),
                    ),
                    const PopupMenuItem(
                      value: 'catalogo',
                      child: Text('Catálogo'),
                    ),
                  ],
                  if (user.esTecnico || user.esAdmin)
                    const PopupMenuItem(
                      value: 'panel',
                      child: Text('Panel de solicitudes'),
                    ),
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
      case 'carrito':
        _abrirCarrito(context);
      case 'panel':
        context.go('/panel-solicitudes');
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
