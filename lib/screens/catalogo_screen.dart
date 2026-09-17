import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
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
  List<Producto> _productos   = [];
  List<String>   _categorias  = ['Todos'];
  String         _categoriaActiva = 'Todos';
  String         _busqueda    = '';
  bool           _cargando    = true;

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    try {
      final resProd = await http.get(Uri.parse('${AppConstants.baseUrl}/productos/con-categorias'));
      final resCat  = await http.get(Uri.parse('${AppConstants.baseUrl}/categorias'));

      if (resProd.statusCode == 200) {
        final list = jsonDecode(resProd.body) as List;
        _productos = list.map((e) => Producto.fromJson(e)).toList();
      }
      if (resCat.statusCode == 200) {
        final list = jsonDecode(resCat.body) as List;
        _categorias = ['Todos', ...list.map((e) => e['nombre'].toString())];
      }
    } catch (_) {}
    if (mounted) setState(() => _cargando = false);
  }

  List<Producto> get _filtrados {
    return _productos.where((p) {
      final matchCat = _categoriaActiva == 'Todos' ||
          (p.categorias?.toLowerCase().contains(_categoriaActiva.toLowerCase()) ?? false);
      final matchBusq = _busqueda.isEmpty ||
          p.nombre.toLowerCase().contains(_busqueda.toLowerCase()) ||
          (p.categorias?.toLowerCase().contains(_busqueda.toLowerCase()) ?? false);
      return matchCat && matchBusq;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final carrito = context.read<CarritoService>();

    return Scaffold(
      appBar: const NavBarWidget(),
      body: Column(
        children: [
          // Buscador
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: (v) => setState(() => _busqueda = v),
              decoration: const InputDecoration(
                hintText: 'Buscar producto o categoría...',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),

          // Categorías
          SizedBox(
            height: 80,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categorias.length,
              itemBuilder: (_, i) {
                final cat = _categorias[i];
                final activo = cat == _categoriaActiva;
                final count  = cat == 'Todos' ? _productos.length
                    : _productos.where((p) => p.categorias?.toLowerCase().contains(cat.toLowerCase()) ?? false).length;
                return GestureDetector(
                  onTap: () => setState(() => _categoriaActiva = cat),
                  child: Container(
                    margin: const EdgeInsets.only(right: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: activo ? IngenixTheme.principal : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: IngenixTheme.principal.withOpacity(0.4)),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(cat, style: TextStyle(fontWeight: FontWeight.w600, color: activo ? Colors.white : IngenixTheme.texto, fontSize: 13)),
                        Text('$count productos', style: TextStyle(fontSize: 11, color: activo ? Colors.white70 : IngenixTheme.textoSec)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Grid productos
          Expanded(
            child: _cargando
                ? const Center(child: CircularProgressIndicator())
                : _filtrados.isEmpty
                    ? const Center(child: Text('No se encontraron productos.'))
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2, crossAxisSpacing: 16, mainAxisSpacing: 16, childAspectRatio: 0.75,
                        ),
                        itemCount: _filtrados.length,
                        itemBuilder: (_, i) {
                          final p = _filtrados[i];
                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: IngenixTheme.principal.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Center(child: Icon(Icons.watch, size: 48, color: IngenixTheme.principal)),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(p.nombre, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                                  if (p.categorias != null)
                                    Text(p.categorias!, style: const TextStyle(fontSize: 11, color: IngenixTheme.textoSec), maxLines: 1, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 4),
                                  Text(
                                    '\$${p.precio.toStringAsFixed(0).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => '.')}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: IngenixTheme.texto),
                                  ),
                                  const SizedBox(height: 8),
                                  SizedBox(
                                    width: double.infinity,
                                    child: ElevatedButton(
                                      onPressed: p.stock > 0 ? () {
                                        carrito.agregar(p);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(content: Text('${p.nombre} agregado al carrito'), backgroundColor: IngenixTheme.principal, duration: const Duration(seconds: 1)),
                                        );
                                      } : null,
                                      style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 8)),
                                      child: Text(p.stock > 0 ? 'Agregar' : 'Agotado', style: const TextStyle(fontSize: 12)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
