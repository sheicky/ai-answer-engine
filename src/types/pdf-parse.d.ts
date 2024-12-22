declare module 'pdf-parse' {
  interface PDFInfo {
    [key: string]: string | number | boolean | undefined;
  }

  interface PDFData {
    text: string;
    numpages: number;
    info: PDFInfo;
  }
  
  function parse(dataBuffer: Buffer | ArrayBuffer): Promise<PDFData>;
  export default parse;
} 