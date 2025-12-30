import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'barcode_service.dart';

class BarcodeScannerPage extends ConsumerStatefulWidget {
  const BarcodeScannerPage({super.key});

  @override
  ConsumerState<BarcodeScannerPage> createState() => _BarcodeScannerPageState();
}

class _BarcodeScannerPageState extends ConsumerState<BarcodeScannerPage> {
  MobileScannerController? _controller;
  bool _isProcessing = false;
  String? _lastScannedCode;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Medication'),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => _controller?.toggleTorch(),
            tooltip: 'Toggle flash',
          ),
          IconButton(
            icon: const Icon(Icons.cameraswitch),
            onPressed: () => _controller?.switchCamera(),
            tooltip: 'Switch camera',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: Stack(
              children: [
                MobileScanner(
                  controller: _controller,
                  onDetect: _onBarcodeDetected,
                ),
                // Scan overlay
                Center(
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                // Instructions
                Positioned(
                  bottom: 20,
                  left: 0,
                  right: 0,
                  child: Text(
                    'Point camera at medication barcode',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      shadows: [Shadow(blurRadius: 4, color: Colors.black)],
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Manual entry option
          Expanded(
            flex: 1,
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  if (_isProcessing)
                    const CircularProgressIndicator()
                  else
                    const Text(
                      'Or enter barcode manually',
                      style: TextStyle(color: Colors.grey),
                    ),
                  const SizedBox(height: 8),
                  ElevatedButton.icon(
                    onPressed: _showManualEntry,
                    icon: const Icon(Icons.keyboard),
                    label: const Text('Enter Manually'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _onBarcodeDetected(BarcodeCapture capture) async {
    if (_isProcessing) return;
    
    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null || barcode.rawValue == null) return;
    
    final code = barcode.rawValue!;
    if (code == _lastScannedCode) return;
    
    setState(() {
      _isProcessing = true;
      _lastScannedCode = code;
    });

    try {
      final medicationData = await BarcodeService.lookupMedication(code);
      
      if (medicationData != null && mounted) {
        Navigator.pop(context, medicationData);
      } else if (mounted) {
        _showNotFoundDialog(code);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error looking up medication: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  void _showManualEntry() {
    showDialog(
      context: context,
      builder: (ctx) => _ManualEntryDialog(
        onSubmit: (code) async {
          Navigator.pop(ctx);
          setState(() => _isProcessing = true);
          
          try {
            final data = await BarcodeService.lookupMedication(code);
            if (data != null && mounted) {
              Navigator.pop(context, data);
            } else if (mounted) {
              _showNotFoundDialog(code);
            }
          } finally {
            if (mounted) setState(() => _isProcessing = false);
          }
        },
      ),
    );
  }

  void _showNotFoundDialog(String code) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Medication Not Found'),
        content: Text('No medication found for barcode: $code\n\nWould you like to enter details manually?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context, {'barcode': code, 'manual': true});
            },
            child: const Text('Enter Manually'),
          ),
        ],
      ),
    );
  }
}

class _ManualEntryDialog extends StatefulWidget {
  final Function(String) onSubmit;
  const _ManualEntryDialog({required this.onSubmit});

  @override
  State<_ManualEntryDialog> createState() => _ManualEntryDialogState();
}

class _ManualEntryDialogState extends State<_ManualEntryDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Enter Barcode'),
      content: TextField(
        controller: _controller,
        decoration: const InputDecoration(
          labelText: 'Barcode Number',
          hintText: 'e.g., 012345678901',
        ),
        keyboardType: TextInputType.number,
        autofocus: true,
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_controller.text.isNotEmpty) {
              widget.onSubmit(_controller.text);
            }
          },
          child: const Text('Look Up'),
        ),
      ],
    );
  }
}
