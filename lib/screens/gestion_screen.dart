import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:provider/provider.dart';

import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';
import '../widgets/panel_sidebar.dart';

class GestionScreen extends StatefulWidget {
  const GestionScreen({super.key});

  @override
  State<GestionScreen> createState() => _GestionScreenState();
}

class _GestionScreenState extends State<GestionScreen> {
  String _periodo = 'mensual';
  Map<String, dynamic>? _reporte;
  bool _cargando = false;
  String? _error;

  Future<void> _cargarReporte() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthService>();
      final response = await http.get(
        Uri.parse(
          '${AppConstants.baseUrl}/api/reportes/dashboard?periodo=$_periodo',
        ),
        headers: auth.headers,
      );
      final data = response.body.isEmpty ? null : jsonDecode(response.body);
      if (!mounted) return;
      if (response.statusCode == 200 && data is Map) {
        setState(() => _reporte = Map<String, dynamic>.from(data));
      } else {
        setState(() => _error = 'No se pudo cargar el reporte.');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'No se pudo conectar con el servidor.');
      }
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _imprimirReporte() async {
    if (_reporte == null) await _cargarReporte();
    if (!mounted || _reporte == null) return;
    final reporte = _reporte!;
    final documento = pw.Document();
    final titulo = switch (_periodo) {
      'semanal' => 'Reporte semanal',
      'anual' => 'Reporte anual',
      _ => 'Reporte mensual',
    };
    documento.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (_) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              'INGENIX',
              style: const pw.TextStyle(
                fontSize: 24,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
            pw.SizedBox(height: 8),
            pw.Text(titulo, style: const pw.TextStyle(fontSize: 18)),
            pw.SizedBox(height: 24),
            pw.TableHelper.fromTextArray(
              headers: const ['Indicador', 'Resultado'],
              data: [
                [
                  'Total de solicitudes',
                  '${reporte['total_solicitudes'] ?? 0}',
                ],
                ['Mantenimientos', '${reporte['mantenimientos'] ?? 0}'],
                ['Ventas', '${reporte['ventas'] ?? 0}'],
                ['Solicitudes entregadas', '${reporte['entregadas'] ?? 0}'],
                ['Total estimado', '\$${reporte['total_estimado'] ?? 0} COP'],
              ],
              headerStyle: const pw.TextStyle(fontWeight: pw.FontWeight.bold),
              border: pw.TableBorder.all(color: PdfColors.grey400),
              cellPadding: const pw.EdgeInsets.all(8),
            ),
            pw.Spacer(),
            pw.Text('Generado: ${DateTime.now().toLocal()}'),
          ],
        ),
      ),
    );
    await Printing.layoutPdf(onLayout: (_) async => documento.save());
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final contenido = ListView(
      padding: const EdgeInsets.all(28),
      children: [
        const Text(
          'Gestión',
          style: TextStyle(
            fontSize: 30,
            fontWeight: FontWeight.bold,
            color: IngenixTheme.texto,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Administra usuarios, productos, categorías y reportes del dashboard.',
          style: TextStyle(color: IngenixTheme.textoSec),
        ),
        const SizedBox(height: 26),
        Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            _GestionCard(
              icon: Icons.people_outline,
              title: 'Usuarios',
              description: 'Crear, editar y administrar usuarios.',
              onTap: () => context.go('/usuarios'),
            ),
            _GestionCard(
              icon: Icons.inventory_2_outlined,
              title: 'Productos y categorías',
              description: 'Gestionar el catálogo y sus categorías.',
              onTap: () => context.go('/productos'),
            ),
            _GestionCard(
              icon: Icons.picture_as_pdf_outlined,
              title: 'Reporte PDF del dashboard',
              description: 'Generar e imprimir estadísticas por periodo.',
              onTap: () {},
            ),
          ],
        ),
        const SizedBox(height: 28),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Reporte de estadísticas',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 14),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'semanal', label: Text('Semanal')),
                    ButtonSegment(value: 'mensual', label: Text('Mensual')),
                    ButtonSegment(value: 'anual', label: Text('Anual')),
                  ],
                  selected: {_periodo},
                  onSelectionChanged: (value) {
                    setState(() => _periodo = value.first);
                    _cargarReporte();
                  },
                ),
                const SizedBox(height: 20),
                if (_cargando)
                  const Center(child: CircularProgressIndicator())
                else if (_error != null)
                  Text(
                    _error!,
                    style: const TextStyle(color: IngenixTheme.error),
                  )
                else if (_reporte == null)
                  const Text(
                    'Selecciona un periodo para cargar sus estadísticas.',
                  )
                else
                  _ResumenReporte(reporte: _reporte!),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _cargando ? null : _imprimirReporte,
                  icon: const Icon(Icons.print_outlined),
                  label: const Text('Generar e imprimir PDF'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
    return Scaffold(
      appBar: const NavBarWidget(),
      drawer: const Drawer(
        child: SafeArea(child: PanelSidebar(activeRoute: '/gestion')),
      ),
      backgroundColor: IngenixTheme.fondo,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (wide)
            const SizedBox(
              width: 218,
              child: PanelSidebar(activeRoute: '/gestion'),
            ),
          Expanded(child: contenido),
        ],
      ),
    );
  }
}

class _GestionCard extends StatelessWidget {
  const _GestionCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
  });
  final IconData icon;
  final String title;
  final String description;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 260,
    child: Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 34, color: IngenixTheme.principal),
              const SizedBox(height: 14),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                description,
                style: const TextStyle(color: IngenixTheme.textoSec),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _ResumenReporte extends StatelessWidget {
  const _ResumenReporte({required this.reporte});
  final Map<String, dynamic> reporte;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    children: [
      _dato('Solicitudes', reporte['total_solicitudes']),
      _dato('Mantenimientos', reporte['mantenimientos']),
      _dato('Ventas', reporte['ventas']),
      _dato('Entregadas', reporte['entregadas']),
      _dato('Total estimado', '\$${reporte['total_estimado'] ?? 0}'),
    ],
  );

  Widget _dato(String titulo, dynamic valor) => Container(
    width: 150,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: IngenixTheme.principal.withValues(alpha: .1),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          titulo,
          style: const TextStyle(color: IngenixTheme.textoSec, fontSize: 12),
        ),
        const SizedBox(height: 5),
        Text(
          '${valor ?? 0}',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ],
    ),
  );
}
