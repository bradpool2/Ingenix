import 'package:flutter/material.dart';

class IngenixTheme {
  static const Color principal  = Color(0xFF99C1BB);
  static const Color secundario = Color(0xFFC1CBCF);
  static const Color fondo      = Color(0xFFF8FBFB);
  static const Color texto      = Color(0xFF292814);
  static const Color textoSec   = Color(0xFF807D72);
  static const Color blanco     = Color(0xFFFFFFFF);
  static const Color error      = Color(0xFFD32F2F);

  static ThemeData get tema => ThemeData(
    useMaterial3: true,
    fontFamily: 'Georgia',
    colorScheme: ColorScheme.light(
      primary:     principal,
      secondary:   secundario,
      surface:     blanco,
      error:       error,
      onPrimary:   texto,
      onSecondary: texto,
      onSurface:   texto,
    ),
    scaffoldBackgroundColor: fondo,
    appBarTheme: const AppBarTheme(
      backgroundColor: blanco,
      foregroundColor: texto,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        color: texto,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        fontFamily: 'Georgia',
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
  style: ElevatedButton.styleFrom(
    backgroundColor: principal,   // ← #99c1bb (verde agua)
    foregroundColor: blanco,
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: texto,
        side: const BorderSide(color: texto),
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: blanco,
      labelStyle: const TextStyle(color: textoSec),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: secundario),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: secundario),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: principal, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    cardColor: blanco,
    cardTheme: CardThemeData(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: principal.withOpacity(0.3)),
      ),
    ),
  );
}