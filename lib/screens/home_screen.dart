import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../core/theme.dart';
import '../widgets/navbar_widget.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    )..forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().usuario!;
    final content = _contentFor(user.rol);

    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: Theme.of(context).textTheme.apply(fontFamily: 'Roboto'),
      ),
      child: Scaffold(
        appBar: const NavBarWidget(),
        backgroundColor: IngenixTheme.fondo,
        body: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth > 760;
            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: isWide ? 80 : 28,
                vertical: isWide ? 72 : 48,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _WelcomeSection(
                    content: content,
                    name: user.nombre,
                    animation: _animationController,
                  ),
                  const SizedBox(height: 46),
                  _RoleCardGrid(
                    cards: content.cards,
                    isWide: isWide,
                    animation: _animationController,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  _RoleContent _contentFor(String role) {
    switch (role.toLowerCase()) {
      case 'tecnico':
        return const _RoleContent(
          eyebrow: 'CENTRO TÉCNICO',
          title: 'Trabaja con precisión. Responde a tiempo.',
          text:
              'Accede a tus solicitudes, actualiza estados y atiende alertas urgentes.',
          cards: [
            _RoleCardData(
              title: 'Órdenes de servicio',
              text: 'Consulta solicitudes pendientes y asignadas.',
              icon: Icons.assignment_outlined,
              route: '/panel-solicitudes',
            ),
            _RoleCardData(
              title: 'Notificaciones',
              text: 'Revisa asignaciones y avisos urgentes.',
              icon: Icons.notifications_none_outlined,
              route: '/home',
            ),
            _RoleCardData(
              title: 'Mi perfil',
              text: 'Mantén actualizada tu información.',
              icon: Icons.build_outlined,
              route: '/perfil',
            ),
          ],
        );
      case 'admin':
        return const _RoleContent(
          eyebrow: 'CONTROL DEL NEGOCIO',
          title: 'Una visión completa de Ingenix.',
          text:
              'Supervisa solicitudes, inventario, finanzas y comunicación del equipo.',
          cards: [
            _RoleCardData(
              title: 'Gestión general',
              text: 'Usuarios, inventario y categorías.',
              icon: Icons.inventory_2_outlined,
              route: '/usuarios',
            ),
            _RoleCardData(
              title: 'Solicitudes',
              text: 'Asigna técnicos y supervisa estados.',
              icon: Icons.assignment_outlined,
              route: '/panel-solicitudes',
            ),
            _RoleCardData(
              title: 'Reportes',
              text: 'Consulta el comportamiento financiero.',
              icon: Icons.show_chart,
              route: '/usuarios',
            ),
          ],
        );
      default:
        return const _RoleContent(
          eyebrow: 'MI ESPACIO',
          title: 'Todo el cuidado de tus piezas, en un solo lugar.',
          text: 'Consulta solicitudes, avances y compras sin perder ningún detalle.',
          cards: [
            _RoleCardData(
              title: 'Mis solicitudes',
              text: 'Revisa el estado de tus mantenimientos.',
              icon: Icons.assignment_outlined,
              route: '/solicitud-cliente',
            ),
            _RoleCardData(
              title: 'Catálogo',
              text: 'Descubre productos disponibles.',
              icon: Icons.inventory_2_outlined,
              route: '/catalogo',
            ),
            _RoleCardData(
              title: 'Perfil',
              text: 'Actualiza tus datos de contacto.',
              icon: Icons.person_outline,
              route: '/perfil',
            ),
          ],
        );
    }
  }
}

class _WelcomeSection extends StatelessWidget {
  final _RoleContent content;
  final String name;
  final Animation<double> animation;

  const _WelcomeSection({
    required this.content,
    required this.name,
    required this.animation,
  });

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 720),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            content.eyebrow,
            style: const TextStyle(
              color: IngenixTheme.principal,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 2.5,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            content.title,
            style: const TextStyle(
              color: IngenixTheme.texto,
              fontFamily: 'Georgia',
              fontSize: 42,
              fontWeight: FontWeight.bold,
              height: 1.12,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            content.text,
            style: const TextStyle(
              color: IngenixTheme.textoSec,
              fontSize: 15,
              height: 1.65,
            ),
          ),
          const SizedBox(height: 26),
          Container(width: 54, height: 1, color: IngenixTheme.principal),
          const SizedBox(height: 16),
          Text(
            'Hola, ${name.isEmpty ? 'bienvenido' : name}.',
            style: const TextStyle(
              color: IngenixTheme.texto,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _RoleCardGrid extends StatelessWidget {
  final List<_RoleCardData> cards;
  final bool isWide;
  final Animation<double> animation;

  const _RoleCardGrid({
    required this.cards,
    required this.isWide,
    required this.animation,
  });

  @override
  Widget build(BuildContext context) {
    return isWide
        ? Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var index = 0; index < cards.length; index++) ...[
                if (index > 0) const SizedBox(width: 18),
                Expanded(child: _RoleCard(data: cards[index])),
              ],
            ],
          )
        : Column(
            children: [
              for (var index = 0; index < cards.length; index++) ...[
                if (index > 0) const SizedBox(height: 14),
                _RoleCard(data: cards[index]),
              ],
            ],
          );
  }
}

class _RoleCard extends StatelessWidget {
  final _RoleCardData data;

  const _RoleCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: IngenixTheme.blanco,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: () => context.go(data.route),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 230,
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE0EBEA)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(data.icon, color: IngenixTheme.principal, size: 27),
              const SizedBox(height: 42),
              Text(
                data.title,
                style: const TextStyle(
                  color: IngenixTheme.texto,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                data.text,
                style: const TextStyle(
                  color: IngenixTheme.textoSec,
                  fontSize: 13,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 18),
              const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Abrir',
                    style: TextStyle(
                      color: IngenixTheme.texto,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  SizedBox(width: 8),
                  Icon(
                    Icons.arrow_forward,
                    size: 16,
                    color: IngenixTheme.texto,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleContent {
  final String eyebrow;
  final String title;
  final String text;
  final List<_RoleCardData> cards;

  const _RoleContent({
    required this.eyebrow,
    required this.title,
    required this.text,
    required this.cards,
  });
}

class _RoleCardData {
  final String title;
  final String text;
  final IconData icon;
  final String route;

  const _RoleCardData({
    required this.title,
    required this.text,
    required this.icon,
    required this.route,
  });
}
