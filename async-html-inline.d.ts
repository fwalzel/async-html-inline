declare module 'async-html-inline' {
  import { TransformOptions } from 'stream';

  type IgnoreType = 'stylesheets' | 'images' | 'scripts';

  interface InlineHtmlOptions extends TransformOptions {
    ignore?: IgnoreType[];
  }

  async function asyncHtmlInline(inputFilePath: string, outputFilePath: string, ignore?: IgnoreType[]): Promise<void>;

  export = asyncHtmlInline;
}