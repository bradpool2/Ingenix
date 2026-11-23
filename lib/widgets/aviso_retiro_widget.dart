import 'package:flutter/material.dart';

import '../core/terminos_retiro.dart';
import '../core/theme.dart';

class AvisoRetiroWidget extends StatelessWidget {
  const AvisoRetiroWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: 0.68,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: IngenixTheme.principal.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: IngenixTheme.principal.withValues(alpha: 0.28),
          ),
        ),
        child: const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.schedule_outlined,
              color: IngenixTheme.principal,
              size: 20,
            ),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                TerminosRetiro.clausula,
                style: TextStyle(
                  color: IngenixTheme.texto,
                  fontSize: 13,
                  height: 1.45,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
