import { projen } from "../../deps.ts";
import { DenoConfig, DenoConfigOptions } from "./deno-config.ts";

export interface DenoProjectOptions extends projen.javascript.NodeProjectOptions {
  /**
   * Deno config options
   *
   * [Default Options](https://deno.land/manual/typescript/configuration#how-deno-uses-a-configuration-file)
   */
  readonly denoconfig?: DenoConfigOptions;

  /**
   * Use TypeScript for your projenrc file (`.projenrc.ts`).
   *
   * @default false
   */
  readonly projenrcTs?: boolean;

  /**
   * Deno version to use
   */
  readonly denoVersion?: string;

  /**
   * The directory where cached information from the CLI is stored.
   *
   * This includes items like cached remote modules, cached transpiled modules, language server cache information and persisted data from local storage. This defaults to the operating systems default cache location and then under the deno path.
   */
  readonly denoDir?: string;

  /**
   * A list of authorization tokens which can be used to allow Deno to access remote private code.
   *
   * See the [Private modules and repositories section](https://deno.land/manual/linking_to_external_code/private.md) for more details.
   *
   * @example
   *
   * { denoAuthTokens: "a1b2c3d4e5f6@deno.land" }
   *
   */
  readonly denoAuthTokens?: string;
}

/**
 * Deno project
 * @pjid deno
 */
export class DenoProject extends projen.typescript.TypeScriptProject {
  readonly denoconfig: DenoConfig;

  constructor(options: DenoProjectOptions) {
    super({
      ...options,
      projenrcJs: false,
      projenrcTs: true,
      disableTsconfig: true,
    });

    // TODO: Also read from vscode config

    const compilerOptionsDefault = {
      allowJs: true,
      esModuleInterop: true,
      experimentalDecorators: true,
      inlineSourceMap: true,
      isolatedModules: true,
      module: "esnext",
      strict: true,
      target: "esnext",
      useDefineForClassFields: true,
    };

    const mergedConfig = Object.assign({}, options.denoconfig, {
      compilerOptions: compilerOptionsDefault,
    });

    this.denoconfig = new DenoConfig(this, mergedConfig);
  }
}
