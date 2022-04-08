import { projen, basename } from "../../deps.ts";
import { DuckTapeJsonFile } from "./json-file.ts";

export type ImportMapping = Readonly<{ [specifier: string]: string }>;

export interface ImportMapData {
  readonly imports: ImportMapping;

  readonly scopes?: { [scope: string]: ImportMapping };
}

export interface ImportMapOptions {
  /**
   * An absolute path to an [import-map](https://deno.land/manual/linking_to_external_code/import_maps#import-maps).
   * Required to be specified if an `importMap` is specified to be able to
   * determine resolution of relative paths. If a `importMap` is not
   * specified, then it will assumed the file path points to an import map on
   * disk and will be attempted to be loaded based on current runtime
   * permissions.
   */
  readonly importMapPath?: string;

  /** An [import-map](https://deno.land/manual/linking_to_external_code/import_maps#import-maps)
   * which will be applied to the imports. */
  readonly importMap?: ImportMapData;
}

export class ImportMap extends projen.Component {
  public readonly fileName: string;
  public readonly file: DuckTapeJsonFile;

  constructor(project: projen.Project, options: ImportMapOptions) {
    super(project);
    if (options.importMap === undefined && options.importMapPath === undefined) {
      throw new Error(
        `Both importMap and importMapPath cannot be undefined when attempting to create an importMap instance`
      );
    } else if (options.importMap !== undefined && options.importMapPath === undefined) {
      throw new Error(`importMapPath must be specified when importMap is specified`);
    } else if (options.importMap === undefined && options.importMapPath !== undefined) {
      const content = Deno.readTextFileSync(options.importMapPath);
      this.fileName = basename(options.importMapPath);
      // TODO: Do we need better than JSON.parse here?
      this.file = new DuckTapeJsonFile(project, this.fileName, { obj: JSON.parse(content) });
    } else {
      this.fileName = "import-map.json";
      this.file = new DuckTapeJsonFile(project, this.fileName, { obj: options.importMap });
    }
  }
}
