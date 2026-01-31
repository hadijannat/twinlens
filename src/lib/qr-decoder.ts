/**
 * QR Code Decoder
 * Decodes QR codes and DataMatrix from image data using native BarcodeDetector API
 */

export interface DecodeResult {
  success: boolean;
  data?: string;
  format?: string;
  error?: string;
}

// Check if BarcodeDetector is available (Chrome 83+)
declare global {
  interface Window {
    BarcodeDetector?: typeof BarcodeDetector;
  }

  class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
    static getSupportedFormats(): Promise<string[]>;
  }

  interface DetectedBarcode {
    rawValue: string;
    format: string;
    boundingBox: DOMRectReadOnly;
    cornerPoints: { x: number; y: number }[];
  }
}

/**
 * Check if the BarcodeDetector API is available
 */
export function isBarcodeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * Decode a QR code from a Blob using native BarcodeDetector
 */
export async function decodeQRFromBlob(blob: Blob): Promise<DecodeResult> {
  if (!isBarcodeDetectorSupported()) {
    return {
      success: false,
      error: 'QR code scanning is not supported in this browser',
    };
  }

  try {
    // Create ImageBitmap from blob
    const imageBitmap = await createImageBitmap(blob);

    // Create BarcodeDetector with QR code support
    const detector = new BarcodeDetector({
      formats: ['qr_code', 'data_matrix', 'aztec'],
    });

    // Detect barcodes in the image
    const barcodes = await detector.detect(imageBitmap);

    if (barcodes.length === 0) {
      return {
        success: false,
        error: 'No QR code found in image',
      };
    }

    // Return the first barcode found
    const barcode = barcodes[0];
    if (!barcode) {
      return {
        success: false,
        error: 'No QR code found in image',
      };
    }

    return {
      success: true,
      data: barcode.rawValue,
      format: barcode.format,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to decode QR code';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Decode a QR code from a base64 data URL
 */
export async function decodeQRFromDataUrl(dataUrl: string): Promise<DecodeResult> {
  try {
    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return decodeQRFromBlob(blob);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to decode QR code';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Decode a QR code from an ArrayBuffer
 */
export async function decodeQRFromArrayBuffer(
  data: ArrayBuffer,
  mimeType = 'image/png'
): Promise<DecodeResult> {
  try {
    const blob = new Blob([data], { type: mimeType });
    return decodeQRFromBlob(blob);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to decode QR code';
    return {
      success: false,
      error: message,
    };
  }
}
