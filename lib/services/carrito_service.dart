import 'package:flutter/material.dart';
import '../models/producto_model.dart';

class CarritoService extends ChangeNotifier {
  final List<ItemCarrito> _items = [];

  List<ItemCarrito> get items => _items;
  int    get totalItems   => _items.fold(0, (acc, i) => acc + i.cantidad);
  double get totalPrecio  => _items.fold(0, (acc, i) => acc + i.subtotal);

  void agregar(Producto producto) {
    final idx = _items.indexWhere((i) => i.producto.idProducto == producto.idProducto);
    if (idx >= 0) {
      _items[idx].cantidad++;
    } else {
      _items.add(ItemCarrito(producto: producto));
    }
    notifyListeners();
  }

  void disminuir(int idProducto) {
    final idx = _items.indexWhere((i) => i.producto.idProducto == idProducto);
    if (idx >= 0) {
      if (_items[idx].cantidad > 1) {
        _items[idx].cantidad--;
      } else {
        _items.removeAt(idx);
      }
      notifyListeners();
    }
  }

  void eliminar(int idProducto) {
    _items.removeWhere((i) => i.producto.idProducto == idProducto);
    notifyListeners();
  }

  void vaciar() {
    _items.clear();
    notifyListeners();
  }
}
