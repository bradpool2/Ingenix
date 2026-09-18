import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../core/theme.dart';

class SolicitudClienteVentaForm extends StatefulWidget {
  const SolicitudClienteVentaForm({
    super.key,
    required this.nombreController,
    required this.descripcionController,
    required this.precioController,
    required this.estadoArticulo,
    required this.imagenes,
    required this.imagenesBytes,
    required this.onEstadoChanged,
    required this.onImageTap,
    required this.onBack,
    required this.onSubmit,
    required this.enviando,
  });

  final TextEditingController nombreController;
  final TextEditingController descripcionController;
  final TextEditingController precioController;
  final String estadoArticulo;
  final List<XFile> imagenes;
  final List<Uint8List> imagenesBytes;
  final ValueChanged<String> onEstadoChanged;
  final VoidCallback onImageTap;
  final VoidCallback onBack;
  final VoidCallback onSubmit;
  final bool enviando;

  @override
  State<SolicitudClienteVentaForm> createState() =>
      _SolicitudClienteVentaFormState();
}

class _SolicitudClienteVentaFormState extends State<SolicitudClienteVentaForm> {
  final opcionesEstado = const ['Excelente', 'Bueno', 'Regular', 'Malo'];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: IngenixTheme.blanco,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDCEAE8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.sell_outlined, color: IngenixTheme.principal),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Solicitud de venta',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: IngenixTheme.texto,
                  ),
                ),
              ),
              TextButton(onPressed: widget.onBack, child: const Text('Volver')),
            ],
          ),
          const SizedBox(height: 22),
          _Campo(
            label: '¿Qué producto quieres vender?',
            helper: 'Ejemplo: Cadena de oro 18k, reloj Citizen automático.',
            hint: 'Nombre del producto',
            controller: widget.nombreController,
          ),
          const SizedBox(height: 18),
          _Campo(
            label: 'Describe el producto',
            helper:
                'Material, peso aproximado, marca, año o cualquier detalle relevante.',
            hint: 'Ej: Reloj Citizen automático, correa de acero, funciona bien.',
            controller: widget.descripcionController,
            maxLines: 4,
          ),
          const SizedBox(height: 18),
          const Text(
            '¿Cómo está el artículo?',
            style: TextStyle(
              color: IngenixTheme.texto,
              fontWeight: FontWeight.w700,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: opcionesEstado.map((opcion) {
              final activo = widget.estadoArticulo == opcion;
              return ChoiceChip(
                label: Text(opcion),
                selected: activo,
                onSelected: (_) => widget.onEstadoChanged(opcion),
                selectedColor: const Color(0xFFB7D8CF),
                backgroundColor: const Color(0xFFF5FAF9),
                side: BorderSide(
                  color: activo
                      ? const Color(0xFF8CB6AF)
                      : const Color(0xFFDCEAE8),
                ),
                labelStyle: const TextStyle(
                  color: IngenixTheme.texto,
                  fontWeight: FontWeight.w700,
                ),
                showCheckmark: false,
              );
            }).toList(),
          ),
          const SizedBox(height: 18),
          _Campo(
            label: 'Precio que esperas recibir (opcional)',
            helper:
                'Es solo una referencia, nuestro equipo te confirmará el valor final.',
            hint: 'Ej: 150000',
            controller: widget.precioController,
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 18),
          _ImageBox(
            imagenes: widget.imagenes,
            imagenesBytes: widget.imagenesBytes,
            onTap: widget.onImageTap,
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              FilledButton(
                onPressed: widget.enviando ? null : widget.onSubmit,
                style: FilledButton.styleFrom(
                  backgroundColor: IngenixTheme.texto,
                  foregroundColor: IngenixTheme.blanco,
                ),
                child: widget.enviando
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Enviar solicitud'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Campo extends StatelessWidget {
  const _Campo({
    required this.label,
    required this.helper,
    required this.hint,
    required this.controller,
    this.maxLines = 1,
    this.keyboardType = TextInputType.text,
  });

  final String label;
  final String helper;
  final String hint;
  final TextEditingController controller;
  final int maxLines;
  final TextInputType keyboardType;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: IngenixTheme.texto,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          helper,
          style: const TextStyle(
            color: IngenixTheme.textoSec,
            fontSize: 12,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: const Color(0xFFF5F8F7),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: IngenixTheme.principal, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

class _ImageBox extends StatelessWidget {
  const _ImageBox({required this.imagenes, required this.imagenesBytes, required this.onTap});

  final List<XFile> imagenes;
  final List<Uint8List> imagenesBytes;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Fotos del artículo (opcional, máximo 2)',
          style: TextStyle(
            color: IngenixTheme.texto,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Una foto ayuda a entender mejor tu solicitud, pero no es obligatoria.',
          style: TextStyle(color: IngenixTheme.textoSec, fontSize: 12),
        ),
        const SizedBox(height: 10),
        LayoutBuilder(
          builder: (context, constraints) {
            final twoColumns = constraints.maxWidth >= 520;
            final boxWidth = twoColumns
                ? (constraints.maxWidth - 10) / 2
                : constraints.maxWidth;

            return Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (var index = 0; index < 2; index++)
                  _SingleImageBox(
                    width: boxWidth,
                    imagen: index < imagenes.length ? imagenes[index] : null,
                    imagenBytes: index < imagenesBytes.length
                        ? imagenesBytes[index]
                        : null,
                    onTap: imagenes.length < 2 ? onTap : null,
                    label: 'Foto ${index + 1}',
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _SingleImageBox extends StatelessWidget {
  const _SingleImageBox({required this.width, required this.imagen, required this.imagenBytes, required this.onTap, required this.label});

  final double width;
  final XFile? imagen;
  final Uint8List? imagenBytes;
  final VoidCallback? onTap;
  final String label;

  @override
  Widget build(BuildContext context) {
    final preview = imagenBytes != null
        ? Image.memory(imagenBytes!, fit: BoxFit.cover, width: double.infinity, height: double.infinity)
        : imagen != null
            ? Image.file(File(imagen!.path), fit: BoxFit.cover, width: double.infinity, height: double.infinity)
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.image_outlined, size: 30, color: IngenixTheme.principal),
                  const SizedBox(height: 8),
                  Text('Toca aquí para agregar $label', style: const TextStyle(color: IngenixTheme.textoSec, fontSize: 13)),
                ],
              );

    return SizedBox(
      width: width,
      height: 130,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFFF5FAF9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: IngenixTheme.principal),
          ),
          child: ClipRRect(borderRadius: BorderRadius.circular(11), child: preview),
        ),
      ),
    );
  }
}
