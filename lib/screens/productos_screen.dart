import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../core/theme.dart';
import '../models/producto_model.dart';
import '../services/auth_service.dart';
import '../widgets/navbar_widget.dart';

class ProductosScreen extends StatefulWidget {
  const ProductosScreen({super.key});

  @override
  State<ProductosScreen> createState() => _ProductosScreenState();
}

class _ProductosScreenState extends State<ProductosScreen> {
  List<Producto> _productos = [];
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    try {
      final res = await http.get(Uri.parse('${AppConstants.baseUrl}/productos'));
      if (res.statusCode == 200) {
        final list = jsonDecode(res.body) as List;
        setState(() => _productos = list.map((e) => Producto.fromJson(e)).toList());
      }
    } catch (_) {}
    if (mounted) setState(() => _cargando = false);
  }

  Future<void> _eliminar(int id) async {
    final auth = context.read<AuthService>();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('¿Eliminar producto?'),
        content: const Text('Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Eliminar', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    await http.delete(
      Uri.parse('${AppConstants.baseUrl}/productos/$id'),
      headers: auth.headers,
    );
    _cargar();
  }

  void _mostrarFormulario({Producto? producto}) {
    final nombreCtrl = TextEditingController(text: producto?.nombre ?? '');
    final descCtrl   = TextEditingController(text: producto?.descripcion ?? '');
    final precioCtrl = TextEditingController(text: producto?.precio.toStringAsFixed(0) ?? '');
    final stockCtrl  = TextEditingController(text: producto?.stock.toString() ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              producto == null ? 'Nuevo producto' : 'Editar producto',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: nombreCtrl,
              decoration: const InputDecoration(labelText: 'Nombre *'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descCtrl,
              decoration: const InputDecoration(labelText: 'Descripción'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: precioCtrl,
              decoration: const InputDecoration(labelText: 'Precio *'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: stockCtrl,
              decoration: const InputDecoration(labelText: 'Stock'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                final auth = context.read<AuthService>();
                final body = jsonEncode({
                  'nombre':      nombreCtrl.text.trim(),
                  'descripcion': descCtrl.text.trim(),
                  'precio':      double.tryParse(precioCtrl.text) ?? 0,
                  'stock':       int.tryParse(stockCtrl.text) ?? 0,
                });

                if (producto == null) {
                  await http.post(
                    Uri.parse('${AppConstants.baseUrl}/productos'),
                    headers: auth.headers,
                    body: body,
                  );
                } else {
                  await http.put(
                    Uri.parse('${AppConstants.baseUrl}/productos/${producto.idProducto}'),
                    headers: auth.headers,
                    body: body,
                  );
                }

                if (context.mounted) {
                  Navigator.pop(context);
                  _cargar();
                }
              },
              child: Text(producto == null ? 'Crear' : 'Guardar cambios'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const NavBarWidget(),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _mostrarFormulario(),
        backgroundColor: IngenixTheme.texto,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : _productos.isEmpty
              ? const Center(child: Text('No hay productos.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _productos.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) {
                    final p = _productos[i];
                    return Card(
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: IngenixTheme.principal.withAlpha(40),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.watch, color: IngenixTheme.principal),
                        ),
                        title: Text(
                          p.nombre,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        subtitle: Text(
                          '\$${p.precio.toStringAsFixed(0)} · Stock: ${p.stock}',
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.edit, color: IngenixTheme.principal),
                              onPressed: () => _mostrarFormulario(producto: p),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () => _eliminar(p.idProducto),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}