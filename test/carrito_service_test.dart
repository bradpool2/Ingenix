import 'package:flutter_test/flutter_test.dart';
import 'package:ingenixm/models/producto_model.dart';
import 'package:ingenixm/services/carrito_service.dart';

void main() {
  group('CarritoService', () {
    test('increments quantity only up to the available stock', () {
      final carrito = CarritoService();
      final producto = Producto(
        idProducto: 1,
        nombre: 'Taladro',
        precio: 100,
        stock: 2,
      );

      expect(carrito.agregar(producto), isTrue);
      expect(carrito.agregar(producto), isTrue);
      expect(carrito.agregar(producto), isFalse);
      expect(carrito.items, hasLength(1));
      expect(carrito.items.single.cantidad, 2);
      expect(carrito.totalItems, 2);
    });

    test('does not add products with no stock', () {
      final carrito = CarritoService();
      final producto = Producto(
        idProducto: 2,
        nombre: 'Llave',
        precio: 25,
        stock: 0,
      );

      expect(carrito.agregar(producto), isFalse);
      expect(carrito.items, isEmpty);
    });
  });
}
