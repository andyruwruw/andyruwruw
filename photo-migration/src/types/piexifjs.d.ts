// Minimal typings for piexifjs (no official @types package).
declare module "piexifjs" {
  export interface ExifDict {
    "0th": Record<number, unknown>;
    Exif: Record<number, unknown>;
    GPS: Record<number, unknown>;
    "1st": Record<number, unknown>;
    thumbnail: string | null;
  }

  export const ImageIFD: Record<string, number>;
  export const ExifIFD: Record<string, number>;
  export const GPSIFD: Record<string, number>;

  export const GPSHelper: {
    degToDmsRational(deg: number): [number, number][];
  };

  export function load(jpegData: string): ExifDict;
  export function dump(exifDict: Partial<ExifDict>): string;
  export function insert(exifBytes: string, jpegData: string): string;

  const _default: {
    ImageIFD: Record<string, number>;
    ExifIFD: Record<string, number>;
    GPSIFD: Record<string, number>;
    GPSHelper: { degToDmsRational(deg: number): [number, number][] };
    load(jpegData: string): ExifDict;
    dump(exifDict: Partial<ExifDict>): string;
    insert(exifBytes: string, jpegData: string): string;
  };
  export default _default;
}
