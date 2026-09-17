import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../core/theme.dart';

class SolicitudClienteMantenimientoForm extends StatefulWidget {
  const SolicitudClienteMantenimientoForm({
    super.key,
    required this.nombreController,
    required this.descripcionController,
    required this.precioController,
    required this.urgencia,
    required this.imagen,
    required this.imagenBytes,
    required this.onUrgenciaChanged,
    required this.onImageTap,
    required this.onBack,
    required this.onSubmit,
    required this.enviando,
  });

  final TextEditingController nombreController;
  final TextEditingController descripcionController;
  final TextEditingController precioController;
  final String urgencia;
  final XFile? imagen;
  final Uint8List? imagenBytes;
  final ValueChanged<String> onUrgenciaChanged;
  final VoidCallback onImageTap;
  final VoidCallback onBack;
  final VoidCallback onSubmit;
  final bool enviando;

  @override
  State<SolicitudClienteMantenimientoForm> createState() =>
      _SolicitudClienteMantenimientoFormState();
}

class _SolicitudClienteMantenimientoFormState
    extends State<SolicitudClienteMantenimientoForm> {
  final opcionesUrgencia = const ['Baja', 'Media', 'Alta'];

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
              const Icon(Icons.build_outlined, color: IngenixTheme.principal),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Solicitud de mantenimiento',
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
            label: '¿Qué artículo necesita mantenimiento?',
            helper: 'Ejemplo: Reloj Casio dorado, anillo de plata con piedra.',
            hint: 'Nombre del artículo',
            controller: widget.nombreController,
          ),
          const SizedBox(height: 18),
          _Campo(
            label: 'Cuéntanos qué le pasa',
            helper:
                'Describe el daño o lo que necesitas que revisemos. Mientras más detalle, mejor.',
            hint: 'Ej: Se le cayó la correa y la pila ya no funciona.',
            controller: widget.descripcionController,
            maxLines: 4,
          ),
          const SizedBox(height: 18),
          const Text(
            '¿Qué tan urgente es?',
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
            children: opcionesUrgencia.map((opcion) {
              final activo = widget.urgencia == opcion;
              return ChoiceChip(
                label: Text(opcion),
                selected: activo,
                onSelected: (_) => widget.onUrgenciaChanged(opcion),
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
          _ImageBox(
            imagen: widget.imagen,
            imagenBytes: widget.imagenBytes,
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
  });

  final String label;
  final String helper;
  final String hint;
  final TextEditingController controller;
  final int maxLines;

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
  const _ImageBox({required this.imagen, required this.imagenBytes, required this.onTap});

  final XFile? imagen;
  final Uint8List? imagenBytes;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final preview = imagenBytes != null
        ? Image.memory(
            imagenBytes!,
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
          )
        : (imagen != null
            ? Image.file(
                File(imagen!.path),
                fit: BoxFit.cover,
                width: double.infinity,
                height: double.infinity,
              )
            : const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.image_outlined, size: 30, color: IngenixTheme.principal),
                  SizedBox(height: 8),
                  Text(
                    'Toca aquí para explorar tus archivos',
                    style: TextStyle(color: IngenixTheme.textoSec, fontSize: 13),
                  ),
                ],
              ));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Foto del artículo (opcional)',
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
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            height: 130,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFF5FAF9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: IngenixTheme.principal),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(11),
              child: preview,
            ),
          ),
        ),
      ],
    );
  }
}
