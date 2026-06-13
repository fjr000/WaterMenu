declare module 'heic-convert' {
  interface ConvertOptions {
    buffer: Buffer | Uint8Array;
    format: 'JPEG' | 'PNG';
    quality: number;
  }

  interface ConvertImage {
    convert: () => Promise<Buffer>;
  }

  interface ConvertAllOptions {
    buffer: Buffer | Uint8Array;
    format: 'JPEG' | 'PNG';
  }

  interface HeicConvert {
    (options: ConvertOptions): Promise<Buffer>;
    all(options: ConvertAllOptions): Promise<ConvertImage[]>;
  }

  const heicConvert: HeicConvert;
  export default heicConvert;
}
