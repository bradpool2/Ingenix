import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';

class PanelSolicitudesScreen extends StatefulWidget {
  const PanelSolicitudesScreen({super.key});

  @override
  State<PanelSolicitudesScreen> createState() => _PanelSolicitudesScreenState();
}

class _PanelSolicitudesScreenState extends State<PanelSolicitudesScreen> {
  bool _cargando = true;
  String _mantenimientos = 'Cargando...';
  String _entregas = 'Cargando...';
  String _totalEstimado = 'Cargando...';
  List<Map<String, dynamic>> _ultimas = [];

  @override
  void initState() {
    super.initState();
    _cargarDashboard();
  }

  Future<void> _cargarDashboard() async {
    final auth = context.read<AuthService>();
    try {
      final responses = await Future.wait([
        http.get(
          Uri.parse('${AppConstants.baseUrl}/api/dashboard/estadisticas'),
          headers: auth.headers,
        ),
        http.get(
          Uri.parse(
            '${AppConstants.baseUrl}/api/dashboard/ultimas-solicitudes',
          ),
          headers: auth.headers,
        ),
      ]);

      if (!mounted) return;
      final stats = responses[0];
      final latest = responses[1];
      if (stats.statusCode == 200) {
        final data = jsonDecode(stats.body) as Map<String, dynamic>;
        _mantenimientos = data['mantenimientos']?.toString() ?? '0 Activos';
        _entregas = data['entregas']?.toString() ?? 'Pendientes';
        _totalEstimado = data['totalEstimado']?.toString() ?? r'$0';
      }
      if (latest.statusCode == 200) {
        final data = jsonDecode(latest.body);
        _ultimas = (data is List ? data : [])
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      }
    } catch (_) {
      _mantenimientos = 'No disponible';
      _entregas = 'No disponible';
      _totalEstimado = 'No disponible';
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  void _abrir(BuildContext context, String route) => context.go(route);

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().usuario;
    final esAdmin = user?.esAdmin ?? false;

    return Scaffold(
      appBar: const NavBarWidget(),
      drawer: _PanelDrawer(esAdmin: esAdmin, onNavigate: _abrir),
      backgroundColor: IngenixTheme.fondo,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= 900;
          return Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (wide)
                SizedBox(
                  width: 218,
                  child: _PanelSidebar(esAdmin: esAdmin, onNavigate: _abrir),
                ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _cargarDashboard,
                  child: ListView(
                    padding: EdgeInsets.fromLTRB(wide ? 26 : 20, 30, 20, 40),
                    children: [
                      _DashboardHeader(userName: user?.nombre ?? 'Usuario'),
                      const SizedBox(height: 24),
                      _MetricGrid(
                        mantenimientos: _mantenimientos,
                        entregas: _entregas,
                        totalEstimado: _totalEstimado,
                      ),
                      const SizedBox(height: 24),
                      _LatestRequests(loading: _cargando, items: _ultimas),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PanelDrawer extends StatelessWidget {
  final bool esAdmin;
  final void Function(BuildContext, String) onNavigate;

  const _PanelDrawer({required this.esAdmin, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: _PanelSidebar(
          esAdmin: esAdmin,
          onNavigate: (ctx, route) {
            Navigator.of(ctx).pop();
            onNavigate(ctx, route);
          },
        ),
      ),
    );
  }
}

class _PanelSidebar extends StatelessWidget {
  final bool esAdmin;
  final void Function(BuildContext, String) onNavigate;

  const _PanelSidebar({required this.esAdmin, required this.onNavigate});

  @override
  Widget build(BuildContext context) {
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
            active: true,
            onTap: () {},
          ),
          _PanelLink(
            icon: Icons.build_outlined,
            label: 'Solicitud Mantenimiento',
            onTap: () => onNavigate(context, '/solicitud-mantenimiento'),
          ),
          _PanelLink(
            icon: Icons.local_shipping_outlined,
            label: 'Solicitud Entrega',
            onTap: () => onNavigate(context, '/solicitud-entrega'),
          ),
          _PanelLink(
            icon: Icons.sell_outlined,
            label: 'Solicitud Venta',
            onTap: () => onNavigate(context, '/solicitud-venta-admin'),
          ),
          if (esAdmin)
            _PanelLink(
              icon: Icons.inventory_2_outlined,
              label: 'Solicitud Almacenada',
              onTap: () => onNavigate(context, '/solicitudes-almacenadas'),
            ),
        ],
      ),
    );
  }
}

class _PanelLink extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _PanelLink({
    required this.icon,
    required this.label,
    required this.onTap,
    this.active = false,
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
          onTap: onTap,
        ),
      ),
    );
  }
}

class _DashboardHeader extends StatelessWidget {
  final String userName;
  const _DashboardHeader({required this.userName});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Bienvenido al módulo de solicitudes, $userName',
          style: const TextStyle(
            color: IngenixTheme.texto,
            fontFamily: 'Georgia',
            fontSize: 25,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Selecciona una opción del menú o revisa el estado actual del taller.',
          style: TextStyle(color: IngenixTheme.textoSec, fontSize: 14),
        ),
      ],
    );
  }
}

class _MetricGrid extends StatelessWidget {
  final String mantenimientos;
  final String entregas;
  final String totalEstimado;

  const _MetricGrid({
    required this.mantenimientos,
    required this.entregas,
    required this.totalEstimado,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 700;
        final cards = [
          _MetricCard(
            icon: Icons.build_outlined,
            label: 'Mantenimientos',
            value: mantenimientos,
          ),
          _MetricCard(
            icon: Icons.inventory_2_outlined,
            label: 'Entregas pendientes',
            value: entregas,
          ),
          _MetricCard(
            icon: Icons.payments_outlined,
            label: 'Total estimado',
            value: totalEstimado,
          ),
        ];
        return wide
            ? Row(
                children: cards
                    .map(
                      (card) => Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(right: 14),
                          child: card,
                        ),
                      ),
                    )
                    .toList(),
              )
            : Column(
                children: cards
                    .map(
                      (card) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: card,
                      ),
                    )
                    .toList(),
              );
      },
    );
  }
}

class _MetricCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _MetricCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDCEAE8)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: IngenixTheme.principal.withValues(alpha: .18),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(icon, color: IngenixTheme.principal),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 10,
                    color: IngenixTheme.textoSec,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: IngenixTheme.texto,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LatestRequests extends StatelessWidget {
  final bool loading;
  final List<Map<String, dynamic>> items;

  const _LatestRequests({required this.loading, required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDCEAE8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.history, size: 20, color: IngenixTheme.principal),
              SizedBox(width: 8),
              Text(
                'Últimas solicitudes ingresadas',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: IngenixTheme.texto,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
            )
          else if (items.isEmpty)
            const Text(
              'No hay solicitudes recientes.',
              style: TextStyle(color: IngenixTheme.textoSec),
            )
          else
            ...items.map((item) => _LatestRow(item: item)),
        ],
      ),
    );
  }
}

class _LatestRow extends StatelessWidget {
  final Map<String, dynamic> item;
  const _LatestRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final order = item['numeroOrden'] ?? item['idSolicitud'] ?? '—';
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFE8EFEE))),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '#$order',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: IngenixTheme.texto,
              ),
            ),
          ),
          Expanded(
            child: Text(
              item['tipo']?.toString() ?? 'Mantenimiento',
              style: const TextStyle(color: IngenixTheme.textoSec),
            ),
          ),
          Expanded(
            child: Text(
              item['estado']?.toString() ?? 'Pendiente',
              style: const TextStyle(color: IngenixTheme.textoSec),
            ),
          ),
          Text(
            item['fecha']?.toString() ?? '—',
            style: const TextStyle(color: IngenixTheme.textoSec, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
