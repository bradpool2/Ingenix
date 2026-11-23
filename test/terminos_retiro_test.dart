import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ingenixm/core/terminos_retiro.dart';
import 'package:ingenixm/screens/register_screen.dart';
import 'package:ingenixm/screens/terminos_retiro_screen.dart';

void main() {
  testWidgets('registration cannot continue without accepting the terms', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: RegisterScreen()));

    await tester.ensureVisible(find.text('Crear cuenta'));
    await tester.tap(find.text('Crear cuenta'));
    await tester.pump();

    expect(
      find.text('Debes aceptar los términos y condiciones'),
      findsOneWidget,
    );
  });

  testWidgets('terms screen displays the pickup deadline clause', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: TerminosRetiroScreen()));

    expect(find.text(TerminosRetiro.clausula), findsOneWidget);
  });
}
