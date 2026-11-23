import 'package:flutter/material.dart';

import '../core/terminos_retiro.dart';
import '../core/theme.dart';

class TerminosRetiroScreen extends StatelessWidget {
  const TerminosRetiroScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Términos y condiciones')),
      backgroundColor: IngenixTheme.fondo,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: const Card(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Retiro o envío de productos',
                      style: TextStyle(
                        color: IngenixTheme.texto,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 16),
                    Text(
                      TerminosRetiro.clausula,
                      style: TextStyle(
                        color: IngenixTheme.textoSec,
                        fontSize: 16,
                        height: 1.6,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
