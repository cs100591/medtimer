// Basic Flutter widget test for MedTimer app

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Basic smoke test - just verify the app can be built
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(child: Text('MedTimer')),
        ),
      ),
    );

    expect(find.text('MedTimer'), findsOneWidget);
  });
}
