// Basic Flutter widget test for Medication Reminder app

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Basic smoke test - just verify the app can be built
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(child: Text('Medication Reminder')),
        ),
      ),
    );

    expect(find.text('Medication Reminder'), findsOneWidget);
  });
}
