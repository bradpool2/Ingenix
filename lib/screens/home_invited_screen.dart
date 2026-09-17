import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';

class HomeInvitadoScreen extends StatefulWidget {
  const HomeInvitadoScreen({super.key});

  @override
  State<HomeInvitadoScreen> createState() => _HomeInvitadoScreenState();
}

class _HomeInvitadoScreenState extends State<HomeInvitadoScreen>
    with TickerProviderStateMixin {
  late final AnimationController _entranceController;
  late final AnimationController _floatController;

  @override
  void initState() {
    super.initState();
    _entranceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 850),
    )..forward();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _entranceController.dispose();
    _floatController.dispose();
    super.dispose();
  }

  Animation<double> _part(double start, double end) {
    return CurvedAnimation(
      parent: _entranceController,
      curve: Interval(start, end, curve: Curves.easeOutCubic),
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final isWide = width > 800;

    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: Theme.of(context).textTheme.apply(fontFamily: 'Roboto'),
      ),
      child: Scaffold(
        backgroundColor: IngenixTheme.fondo,
        body: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _HeroSection(
                isWide: isWide,
                textAnimation: _part(0, .68),
                cardsAnimation: _part(.16, .82),
                floatAnimation: _floatController,
              ),
              _ServicesSection(isWide: isWide, animation: _part(.38, 1)),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  final bool isWide;
  final Animation<double> textAnimation;
  final Animation<double> cardsAnimation;
  final Animation<double> floatAnimation;

  const _HeroSection({
    required this.isWide,
    required this.textAnimation,
    required this.cardsAnimation,
    required this.floatAnimation,
  });

  @override
  Widget build(BuildContext context) {
    final content = isWide
        ? Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(flex: 5, child: _HeroText(animation: textAnimation)),
              const SizedBox(width: 60),
              Expanded(
                flex: 4,
                child: _ShowcaseCards(
                  animation: cardsAnimation,
                  floatAnimation: floatAnimation,
                ),
              ),
            ],
          )
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _HeroText(animation: textAnimation),
              const SizedBox(height: 42),
              _ShowcaseCards(
                animation: cardsAnimation,
                floatAnimation: floatAnimation,
              ),
            ],
          );

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isWide ? 80 : 28,
        vertical: isWide ? 84 : 56,
      ),
      color: IngenixTheme.fondo,
      child: content,
    );
  }
}

class _HeroText extends StatelessWidget {
  final Animation<double> animation;

  const _HeroText({required this.animation});

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: animation,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(-.035, .025),
          end: Offset.zero,
        ).animate(animation),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'INGENIX · RELOJERÍA Y JOYERÍA',
              style: TextStyle(
                fontSize: 11,
                letterSpacing: 2.5,
                color: IngenixTheme.principal,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'El tiempo también merece cuidado.',
              style: TextStyle(
                fontSize: 42,
                fontWeight: FontWeight.bold,
                color: IngenixTheme.texto,
                height: 1.12,
                fontFamily: 'Georgia',
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Mantenimiento, reparación y valoración de piezas especiales con seguimiento claro y atención experta.',
              style: TextStyle(
                fontSize: 15,
                color: IngenixTheme.textoSec,
                height: 1.65,
              ),
            ),
            const SizedBox(height: 32),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ElevatedButton(
                  onPressed: () => context.go('/login'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: IngenixTheme.texto,
                    foregroundColor: IngenixTheme.blanco,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 28,
                      vertical: 14,
                    ),
                    minimumSize: Size.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Iniciar sesión'),
                ),
                OutlinedButton(
                  onPressed: () => context.go('/register'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: IngenixTheme.texto,
                    side: const BorderSide(color: IngenixTheme.texto),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 28,
                      vertical: 14,
                    ),
                    minimumSize: Size.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Crear cuenta'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ShowcaseCards extends StatelessWidget {
  final Animation<double> animation;
  final Animation<double> floatAnimation;

  const _ShowcaseCards({required this.animation, required this.floatAnimation});

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: animation,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(.045, .04),
          end: Offset.zero,
        ).animate(animation),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 30),
                child: _FloatingCard(
                  phase: 0,
                  floatAnimation: floatAnimation,
                  child: const _SmallShowcase(
                    icon: Icons.diamond_outlined,
                    label: 'Joyas',
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: _FloatingCard(
                phase: 1,
                floatAnimation: floatAnimation,
                child: const Padding(
                  padding: EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        backgroundColor: IngenixTheme.fondo,
                        radius: 22,
                        child: Icon(
                          Icons.watch_outlined,
                          color: IngenixTheme.principal,
                          size: 22,
                        ),
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Precisión',
                        style: TextStyle(
                          color: IngenixTheme.textoSec,
                          fontSize: 12,
                          letterSpacing: 1,
                        ),
                      ),
                      SizedBox(height: 6),
                      Text(
                        'Tu pieza, en buenas manos.',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 17,
                          color: IngenixTheme.texto,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 80),
                child: _FloatingCard(
                  phase: 2,
                  floatAnimation: floatAnimation,
                  child: const _SmallShowcase(
                    icon: Icons.build_outlined,
                    label: 'Servicio experto',
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SmallShowcase extends StatelessWidget {
  final IconData icon;
  final String label;

  const _SmallShowcase({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 24, color: IngenixTheme.principal),
          const SizedBox(height: 10),
          Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              color: IngenixTheme.texto,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

class _FloatingCard extends StatelessWidget {
  final Widget child;
  final Animation<double> floatAnimation;
  final int phase;

  const _FloatingCard({
    required this.child,
    required this.floatAnimation,
    required this.phase,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: floatAnimation,
      child: child,
      builder: (context, child) {
        final direction = phase.isEven ? 1.0 : -1.0;
        final offset = (floatAnimation.value - .5) * 5 * direction;
        return Transform.translate(
          offset: Offset(0, offset),
          child: Container(
            decoration: BoxDecoration(
              color: IngenixTheme.blanco,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(18),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: child,
          ),
        );
      },
    );
  }
}

class _ServicesSection extends StatelessWidget {
  final bool isWide;
  final Animation<double> animation;

  const _ServicesSection({required this.isWide, required this.animation});

  @override
  Widget build(BuildContext context) {
    const cards = [
      _ServiceCard(
        icono: Icons.build_outlined,
        titulo: 'Mantenimiento',
        desc: 'Solicita una revisión y consulta cada avance.',
      ),
      _ServiceCard(
        icono: Icons.watch_outlined,
        titulo: 'Relojería',
        desc: 'Cuidamos mecanismos, correas y detalles de precisión.',
      ),
      _ServiceCard(
        icono: Icons.diamond_outlined,
        titulo: 'Joyería',
        desc: 'Valoración y atención personalizada para tus piezas.',
      ),
    ];

    return FadeTransition(
      opacity: animation,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: isWide ? 80 : 28,
          vertical: 64,
        ),
        color: IngenixTheme.blanco,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'NUESTRO SERVICIO',
              style: TextStyle(
                fontSize: 11,
                letterSpacing: 2.5,
                color: IngenixTheme.principal,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Una experiencia más clara para cada pieza.',
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: IngenixTheme.texto,
                height: 1.3,
                fontFamily: 'Georgia',
              ),
            ),
            const SizedBox(height: 32),
            isWide
                ? Row(
                    children: [
                      for (var index = 0; index < cards.length; index++) ...[
                        if (index > 0) const SizedBox(width: 20),
                        Expanded(child: cards[index]),
                      ],
                    ],
                  )
                : Column(
                    children: [
                      for (var index = 0; index < cards.length; index++) ...[
                        if (index > 0) const SizedBox(height: 14),
                        cards[index],
                      ],
                    ],
                  ),
          ],
        ),
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final IconData icono;
  final String titulo;
  final String desc;

  const _ServiceCard({
    required this.icono,
    required this.titulo,
    required this.desc,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: IngenixTheme.fondo,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE0EBEA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icono, color: IngenixTheme.principal, size: 26),
          const SizedBox(height: 14),
          Text(
            titulo,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 15,
              color: IngenixTheme.texto,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            desc,
            style: const TextStyle(
              fontSize: 13,
              color: IngenixTheme.textoSec,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
