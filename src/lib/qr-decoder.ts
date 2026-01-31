/**
 * QR Code Decoder
 * Decodes QR codes using native BarcodeDetector API with jsQR fallback
 */

import jsQR from 'jsqr';

export interface DecodeResult {
  success: boolean;
  data?: string;
  format?: string;
  error?: string;
  /** Which decoder was used */
  decoder?: 'native' | 'jsqr';
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
 * Check if the native BarcodeDetector API is available
 */
export function isBarcodeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * Decode using native BarcodeDetector API
 */
async function decodeWithNative(imageBitmap: ImageBitmap): Promise<DecodeResult> {
  try {
    const detector = new BarcodeDetector({
      formats: ['qr_code', 'data_matrix', 'aztec'],
    });

    const barcodes = await detector.detect(imageBitmap);

    if (barcodes.length === 0) {
      return {
        success: false,
        error: 'No QR code found in image',
      };
    }

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
      decoder: 'native',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Native decoder failed';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Decode using jsQR fallback (works in all browsers)
 */
async function decodeWithJsQR(imageBitmap: ImageBitmap): Promise<DecodeResult> {
  try {
    // Draw ImageBitmap to canvas to get ImageData
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return {
        success: false,
        error: 'Failed to create canvas context',
      };
    }

    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Decode with jsQR
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (!result) {
      return {
        success: false,
        error: 'No QR code found in image',
      };
    }

    return {
      success: true,
      data: result.data,
      format: 'qr_code',
      decoder: 'jsqr',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'jsQR decoder failed';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Decode a QR code from a Blob
 * Uses native BarcodeDetector when available, falls back to jsQR
 */
export async function decodeQRFromBlob(blob: Blob): Promise<DecodeResult> {
  try {
    // Create ImageBitmap from blob
    const imageBitmap = await createImageBitmap(blob);

    // Try native BarcodeDetector first (faster, supports more formats)
    if (isBarcodeDetectorSupported()) {
      const nativeResult = await decodeWithNative(imageBitmap);
      if (nativeResult.success) {
        return nativeResult;
      }
      // Native failed, try jsQR as backup (might find QR codes native missed)
    }

    // Fall back to jsQR (QR codes only, but works everywhere)
    const jsqrResult = await decodeWithJsQR(imageBitmap);
    return jsqrResult;
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
