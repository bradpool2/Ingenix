class Producto {
  final int    idProducto;
  final String nombre;
  final String? descripcion;
  final double precio;
  final int    stock;
  final String? imagen;
  final String? categorias;

  Producto({
    required this.idProducto,
    required this.nombre,
    this.descripcion,
    required this.precio,
    required this.stock,
    this.imagen,
    this.categorias,
  });

  factory Producto.fromJson(Map<String, dynamic> json) => Producto(
    idProducto:  json['idProducto'] ?? 0,
    nombre:      json['nombre']     ?? '',
    descripcion: json['descripcion'],
    precio:      double.tryParse(json['precio'].toString()) ?? 0,
    stock:       json['stock'] ?? 0,
    imagen:      json['imagen'],
    categorias:  json['categorias'],
  );
}

class ItemCarrito {
  final Producto producto;
  int cantidad;

  ItemCarrito({required this.producto, this.cantidad = 1});

  double get subtotal => producto.precio * cantidad;

  Map<String, dynamic> toJson() => {
    'idProducto':    producto.idProducto,
    'nombre':        producto.nombre,
    'precio':        producto.precio,
    'cantidad':      cantidad,
    'precioUnitario': producto.precio,
  };
}
