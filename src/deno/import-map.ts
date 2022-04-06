import { JsonFile } from "../json";
import { DenoProject } from "./deno";

export interface ImportMapOptions {
  /**
   * @default "import-map.json"
   */
  readonly filePath: string;
}

export class ImportMap {
  public readonly file: JsonFile;

  constructor(project: DenoProject, options: ImportMapOptions) {
    this.file = new JsonFile(project, options.filePath, {});
  }
}
