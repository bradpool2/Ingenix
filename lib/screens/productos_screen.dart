import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';

class ProductosScreen extends StatefulWidget {
  const ProductosScreen({super.key});
  @override
  State<ProductosScreen> createState() => _ProductosScreenState();
}

class _ProductosScreenState extends State<ProductosScreen> {
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _categories = [];
  bool _loading = true;
  bool _showCategories = false;
  final _categoryController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _categoryController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final auth = context.read<AuthService>();
      final responses = await Future.wait([
        http.get(
          Uri.parse('${AppConstants.baseUrl}/productos/con-categorias'),
          headers: auth.headers,
        ),
        http.get(
          Uri.parse('${AppConstants.baseUrl}/categorias'),
          headers: auth.headers,
        ),
      ]);
      if (!mounted) return;
      final products = jsonDecode(responses[0].body);
      final categories = jsonDecode(responses[1].body);
      setState(() {
        _products = (products is List ? products : []).whereType<Map>().map((
          item,
        ) {
          final product = Map<String, dynamic>.from(item);
          product['idProducto'] ??= product['idproducto'];
          return product;
        }).toList();
        _categories = (categories is List ? categories : [])
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList();
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _createCategory() async {
    final name = _categoryController.text.trim();
    if (name.isEmpty) return;
    final auth = context.read<AuthService>();
    final response = await http.post(
      Uri.parse('${AppConstants.baseUrl}/categorias'),
      headers: auth.headers,
      body: jsonEncode({'nombre': name}),
    );
    if (!mounted) return;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      _categoryController.clear();
      await _load();
    }
  }

  Future<void> _deleteCategory(Map<String, dynamic> category) async {
    final auth = context.read<AuthService>();
    await http.delete(
      Uri.parse(
        '${AppConstants.baseUrl}/categorias/${category['idCategoria'] ?? category['idcategoria']}',
      ),
      headers: auth.headers,
    );
    _load();
  }

  Future<void> _saveProduct(
    Map<String, dynamic> product, {
    bool creating = false,
    List<int> categoryIds = const [],
  }) async {
    final auth = context.read<AuthService>();
    final id = product['idProducto'];
    final response = creating
        ? await http.post(
            Uri.parse('${AppConstants.baseUrl}/productos'),
            headers: auth.headers,
            body: jsonEncode(product),
          )
        : await http.put(
            Uri.parse('${AppConstants.baseUrl}/productos/$id'),
            headers: auth.headers,
            body: jsonEncode(product),
          );
    if (!mounted || response.statusCode < 200 || response.statusCode >= 300) {
      return;
    }
    final created = creating ? jsonDecode(response.body) : {'idProducto': id};
    final productId = created['idProducto'] ?? created['idproducto'];
    await http.put(
      Uri.parse('${AppConstants.baseUrl}/productos/$productId/categorias'),
      headers: auth.headers,
      body: jsonEncode({'categorias': categoryIds}),
    );
    if (mounted) {
      Navigator.pop(context);
      _load();
    }
  }

  Future<void> _deleteProduct(Map<String, dynamic> product) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Eliminar producto?'),
        content: const Text('También se eliminará su historial de uso.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    if (!mounted) return;
    final auth = context.read<AuthService>();
    await http.delete(
      Uri.parse('${AppConstants.baseUrl}/productos/${product['idProducto']}'),
      headers: auth.headers,
    );
    _load();
  }

  Future<void> _form({Map<String, dynamic>? product}) async {
    final name = TextEditingController(
      text: product?['nombre']?.toString() ?? '',
    );
    final description = TextEditingController(
      text: product?['descripcion']?.toString() ?? '',
    );
    final price = TextEditingController(
      text: product?['precio']?.toString() ?? '',
    );
    final stock = TextEditingController(
      text: product?['stock']?.toString() ?? '',
    );
    final selected = <int>{};
    if (product != null) {
      final auth = context.read<AuthService>();
      final response = await http.get(
        Uri.parse(
          '${AppConstants.baseUrl}/productos/${product['idProducto']}/categorias',
        ),
        headers: auth.headers,
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) {
          for (final item in data.whereType<Map>()) {
            final id = int.tryParse(
              (item['idCategoria'] ?? item['idcategoria']).toString(),
            );
            if (id != null) selected.add(id);
          }
        }
      }
      if (!mounted) return;
    }
    showDialog<void>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(
            product == null ? 'Registrar producto' : 'Editar producto',
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: name,
                  decoration: const InputDecoration(labelText: 'Nombre *'),
                ),
                TextField(
                  controller: description,
                  decoration: const InputDecoration(labelText: 'Descripción'),
                ),
                TextField(
                  controller: price,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Precio *'),
                ),
                TextField(
                  controller: stock,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Stock'),
                ),
                const SizedBox(height: 12),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Categorías'),
                ),
                Wrap(
                  spacing: 6,
                  children: _categories.map((category) {
                    final id =
                        int.tryParse(
                          (category['idCategoria'] ?? category['idcategoria'])
                              .toString(),
                        ) ??
                        0;
                    return FilterChip(
                      label: Text(category['nombre']?.toString() ?? ''),
                      selected: selected.contains(id),
                      onSelected: (value) => setDialogState(
                        () => value ? selected.add(id) : selected.remove(id),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => _saveProduct(
                {
                  'nombre': name.text.trim(),
                  'descripcion': description.text.trim(),
                  'precio': double.tryParse(price.text) ?? 0,
                  'stock': int.tryParse(stock.text) ?? 0,
                  if (product != null) 'idProducto': product['idProducto'],
                },
                creating: product == null,
                categoryIds: selected.toList(),
              ),
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: const NavBarWidget(),
    backgroundColor: IngenixTheme.fondo,
    floatingActionButton: FloatingActionButton(
      onPressed: () => _form(),
      child: const Icon(Icons.add),
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Gestión de productos',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: IngenixTheme.texto,
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InkWell(
                  onTap: () =>
                      setState(() => _showCategories = !_showCategories),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Gestión de categorías',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      Icon(
                        _showCategories ? Icons.expand_less : Icons.expand_more,
                      ),
                    ],
                  ),
                ),
                if (_showCategories) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _categoryController,
                          decoration: const InputDecoration(
                            labelText: 'Nueva categoría',
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: _createCategory,
                        icon: const Icon(Icons.add_circle_outline),
                      ),
                    ],
                  ),
                  Wrap(
                    spacing: 8,
                    children: _categories
                        .map(
                          (category) => Chip(
                            label: Text(category['nombre']?.toString() ?? ''),
                            onDeleted: () => _deleteCategory(category),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_products.isEmpty)
          const Text('No hay productos registrados.')
        else
          ..._products.map(
            (product) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: const Icon(
                  Icons.inventory_2_outlined,
                  color: IngenixTheme.principal,
                ),
                title: Text(
                  product['nombre']?.toString() ?? '',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  '\$${product['precio'] ?? 0} · Stock: ${product['stock'] ?? 0}\n${product['categorias'] ?? 'Sin categorías'}',
                ),
                isThreeLine: true,
                trailing: Wrap(
                  children: [
                    IconButton(
                      tooltip: 'Editar',
                      onPressed: () => _form(product: product),
                      icon: const Icon(Icons.edit_outlined),
                    ),
                    IconButton(
                      tooltip: 'Eliminar',
                      onPressed: () => _deleteProduct(product),
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    ),
  );
}
