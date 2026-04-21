declare module 'spark-md5' {
  const SparkMD5: {
    hash(input: string): string;
    (input?: string): string;
    ArrayBuffer: {
      hash(buffer: ArrayBuffer): string;
    };
  };
  export default SparkMD5;
}
