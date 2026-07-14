declare module "svg-to-pdfkit" {
  interface SVGtoPDFOptions {
    width?: number;
    height?: number;
    preserveAspectRatio?: string;
    useCSS?: boolean;
    fontCallback?: (family: string, bold: boolean, italic: boolean, fontOptions: Record<string, unknown>) => string;
    imageCallback?: (link: string) => string;
    colorCallback?: (color: [number[], number] | null, raw: string) => [number[], number] | null;
    warningCallback?: (message: string) => void;
    assumePt?: boolean;
    precision?: number;
  }
  function SVGtoPDF(doc: PDFKit.PDFDocument, svg: string, x?: number, y?: number, options?: SVGtoPDFOptions): void;
  export = SVGtoPDF;
}
