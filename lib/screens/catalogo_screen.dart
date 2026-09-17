import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../models/producto_model.dart';
import '../../services/carrito_service.dart';
import '../../widgets/navbar_widget.dart';

class CatalogoScreen extends StatefulWidget {
  const CatalogoScreen({super.key});

  @override
  State<CatalogoScreen> createState() => _CatalogoScreenState();
}

class _CatalogoScreenState extends State<CatalogoScreen> {
  List<Producto> _productos = [];
  List<String> _categorias = [];
  String? _categoriaActiva;
  String _busqueda = '';
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    try {
      final respuestas = await Future.wait([
        http.get(Uri.parse('${AppConstants.baseUrl}/productos/con-categorias')),
        http.get(Uri.parse('${AppConstants.baseUrl}/categorias')),
      ]);
      final resProd = respuestas[0];
      final resCat = respuestas[1];

      if (resProd.statusCode == 200) {
        final list = jsonDecode(resProd.body) as List;
        _productos = list.map((e) => Producto.fromJson(e)).toList();
      }
      if (resCat.statusCode == 200) {
        final list = jsonDecode(resCat.body) as List;
        _categorias = list.map((e) => e['nombre'].toString()).toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _cargando = false);
  }

  List<Producto> get _filtrados {
    return _productos.where((p) {
      final categoriasProducto =
          p.categorias
              ?.split(',')
              .map((categoria) => categoria.trim().toLowerCase())
              .toList() ??
          <String>[];
      final matchCat =
          _categoriaActiva == null ||
          categoriasProducto.contains(_categoriaActiva!.toLowerCase());
      final matchBusq =
          _busqueda.isEmpty ||
          p.nombre.toLowerCase().contains(_busqueda.toLowerCase()) ||
          (p.categorias?.toLowerCase().contains(_busqueda.toLowerCase()) ??
              false);
      return matchCat && matchBusq;
    }).toList();
  }

  int _contarProductosPorCategoria(String categoria) {
    return _productos.where((producto) {
      return producto.categorias
              ?.split(',')
              .map((item) => item.trim().toLowerCase())
              .contains(categoria.toLowerCase()) ??
          false;
    }).length;
  }

  String _formatoMoneda(double valor) {
    return NumberFormat.currency(
      locale: 'es_CO',
      symbol: '\$',
      decimalDigits: 0,
    ).format(valor);
  }

  void _limpiarFiltros() {
    setState(() {
      _categoriaActiva = null;
      _busqueda = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final carrito = context.read<CarritoService>();
    final hayBusqueda = _busqueda.trim().isNotEmpty;
    final hayFiltro = _categoriaActiva != null || hayBusqueda;

    return Scaffold(
      appBar: const NavBarWidget(),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final maxWidth = constraints.maxWidth > 1100
              ? 1100.0
              : constraints.maxWidth;
          return Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 40, 24, 40),
                children: [
                  const Text(
                    'Catálogo de Productos',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: SizedBox(
                      width: 324,
                      child: TextField(
                        onChanged: (value) => setState(() => _busqueda = value),
                        decoration: const InputDecoration(
                          hintText: 'Buscar producto o categoría...',
                          prefixIcon: Icon(Icons.search),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 30),
                  if (_cargando)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  else ...[
                    if (!hayBusqueda)
                      _construirCategorias(constraints.maxWidth),
                    if (hayFiltro) ...[
                      const SizedBox(height: 20),
                      _construirFiltroActivo(),
                    ],
                    const SizedBox(height: 20),
                    if (_filtrados.isEmpty)
                      const Center(
                        child: Text(
                          'No se encontraron productos.',
                          style: TextStyle(color: IngenixTheme.textoSec),
                        ),
                      )
                    else
                      _construirProductos(constraints.maxWidth, carrito),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _construirCategorias(double anchoDisponible) {
    final columnas = anchoDisponible >= 900
        ? 5
        : anchoDisponible >= 600
        ? 3
        : 2;
    final categorias = ['Todos', ..._categorias];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: categorias.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columnas,
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
        childAspectRatio: 1.8,
      ),
      itemBuilder: (_, index) {
        final categoria = categorias[index];
        final activa = categoria == 'Todos'
            ? _categoriaActiva == null
            : _categoriaActiva == categoria;
        final cantidad = categoria == 'Todos'
            ? _productos.length
            : _contarProductosPorCategoria(categoria);
        return InkWell(
          onTap: () => setState(
            () => _categoriaActiva = categoria == 'Todos' ? null : categoria,
          ),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: activa ? IngenixTheme.principal : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: IngenixTheme.principal.withValues(alpha: 0.35),
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  categoria,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: activa ? Colors.white : IngenixTheme.texto,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$cantidad productos',
                  style: TextStyle(
                    fontSize: 11,
                    color: activa ? Colors.white70 : IngenixTheme.textoSec,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _construirFiltroActivo() {
    final texto = _busqueda.trim().isNotEmpty
        ? 'Resultados para "${_busqueda.trim()}"'
        : 'Mostrando categoría: $_categoriaActiva';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: IngenixTheme.principal.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              texto,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          TextButton(
            onPressed: _limpiarFiltros,
            child: const Text('Ver todas las categorías'),
          ),
        ],
      ),
    );
  }

  Widget _construirProductos(double anchoDisponible, CarritoService carrito) {
    final columnas = anchoDisponible >= 900
        ? 3
        : anchoDisponible >= 600
        ? 2
        : 1;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _filtrados.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columnas,
        crossAxisSpacing: 30,
        mainAxisSpacing: 20,
        childAspectRatio: anchoDisponible < 600 ? 0.82 : 0.86,
      ),
      itemBuilder: (_, index) {
        final producto = _filtrados[index];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text(
                  producto.nombre,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: Text(
                    producto.descripcion?.trim().isNotEmpty == true
                        ? producto.descripcion!
                        : 'Sin descripción',
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: IngenixTheme.textoSec),
                  ),
                ),
                if (producto.categorias != null)
                  Text(
                    producto.categorias!,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: IngenixTheme.textoSec,
                    ),
                  ),
                const SizedBox(height: 10),
                Text(
                  _formatoMoneda(producto.precio),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'Stock: ${producto.stock}',
                  style: const TextStyle(color: IngenixTheme.textoSec),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: producto.stock > 0
                      ? () {
                          carrito.agregar(producto);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                '${producto.nombre} agregado al carrito',
                              ),
                              duration: const Duration(seconds: 1),
                            ),
                          );
                        }
                      : null,
                  child: Text(
                    producto.stock > 0 ? 'Agregar al carrito' : 'Agotado',
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
