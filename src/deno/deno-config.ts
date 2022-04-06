import { JsonFile } from "../json";
import { DenoProject } from "./deno";
import { ImportMap } from "./import-map";

/**
 * A JSON representation of a Deno configuration file.
 */
export interface DenoConfigOptions {
  /**
   * @default "deno.json"
   */
  readonly fileName?: string;

  /**
   * Instructs the TypeScript compiler how to compile .ts files.
   */
  readonly compilerOptions?: DenoTypescriptCompilerOptions;
  /**
   * Configuration for formatter
   */
  readonly fmt?: DenoFmt;

  /**
   * The location of an import map to be used when resolving modules. If an import map is
   * explicitly specified, it will override this value.
   */
  readonly importMap?: string;
  /**
   * Configuration for linter
   */
  readonly lint?: Lint;
  /**
   * Configuration for deno task
   */
  readonly tasks?: Tasks;
}

/**
 * Instructs the TypeScript compiler how to compile .ts files.
 */
export interface DenoTypescriptCompilerOptions {
  /**
   * Allow JavaScript files to be a part of your program. Use the `checkJS` option to get
   * errors from these files.
   */
  readonly allowJs?: boolean;
  /**
   * Disable error reporting for unreachable code.
   */
  readonly allowUnreachableCode?: boolean;
  /**
   * Disable error reporting for unused labels.
   */
  readonly allowUnusedLabels?: boolean;
  /**
   * Enable error reporting in type-checked JavaScript files.
   */
  readonly checkJs?: boolean;
  /**
   * Enable experimental support for TC39 stage 2 draft decorators.
   */
  readonly experimentalDecorators?: boolean;
  /**
   * Specify what JSX code is generated.
   */
  readonly jsx?: Jsx;
  /**
   * Specify the JSX factory function used when targeting React JSX emit, e.g.
   * 'React.createElement' or 'h'
   */
  readonly jsxFactory?: string;
  /**
   * Specify the JSX Fragment reference used for fragments when targeting React JSX emit e.g.
   * 'React.Fragment' or 'Fragment'.
   */
  readonly jsxFragmentFactory?: string;
  /**
   * Specify module specifier used to import the JSX factory functions when using jsx:
   * 'react-jsx*'.
   */
  readonly jsxImportSource?: string;
  /**
   * Make keyof only return strings instead of string, numbers or symbols. Legacy option.
   */
  readonly keyofStringsOnly?: boolean;
  /**
   * Specify a set of bundled library declaration files that describe the target runtime
   * environment.
   */
  readonly lib?: string[];
  /**
   * Enable error reporting for fallthrough cases in switch statements.
   */
  readonly noFallthroughCasesInSwitch?: boolean;
  /**
   * Enable error reporting for expressions and declarations with an implied `any` type..
   */
  readonly noImplicitAny?: boolean;
  /**
   * Ensure overriding members in derived classes are marked with an override modifier.
   */
  readonly noImplicitOverride?: boolean;
  /**
   * Enable error reporting for codepaths that do not explicitly return in a function.
   */
  readonly noImplicitReturns?: boolean;
  /**
   * Enable error reporting when `this` is given the type `any`.
   */
  readonly noImplicitThis?: boolean;
  /**
   * Disable adding 'use strict' directives in emitted JavaScript files.
   */
  readonly noImplicitUseStrict?: boolean;
  /**
   * Disable strict checking of generic signatures in function types.
   */
  readonly noStrictGenericChecks?: boolean;
  /**
   * Add `undefined` to a type when accessed using an index.
   */
  readonly noUncheckedIndexedAccess?: boolean;
  /**
   * Enable error reporting when a local variables aren't read.
   */
  readonly noUnusedLocals?: boolean;
  /**
   * Raise an error when a function parameter isn't read
   */
  readonly noUnusedParameters?: boolean;
  /**
   * Enable all strict type checking options.
   */
  readonly strict?: boolean;
  /**
   * Check that the arguments for `bind`, `call`, and `apply` methods match the original
   * function.
   */
  readonly strictBindCallApply?: boolean;
  /**
   * When assigning functions, check to ensure parameters and the return values are
   * subtype-compatible.
   */
  readonly strictFunctionTypes?: boolean;
  /**
   * When type checking, take into account `null` and `undefined`.
   */
  readonly strictNullChecks?: boolean;
  /**
   * Check for class properties that are declared but not set in the constructor.
   */
  readonly strictPropertyInitialization?: boolean;
  /**
   * Disable reporting of excess property errors during the creation of object literals.
   */
  readonly suppressExcessPropertyErrors?: boolean;
  /**
   * Suppress `noImplicitAny` errors when indexing objects that lack index signatures.
   */
  readonly suppressImplicitAnyIndexErrors?: boolean;
}

/**
 * Specify what JSX code is generated.
 */
export enum Jsx {
  PRESERVE = "preserve",
  REACT = "react",
  REACT_JSX = "react-jsx",
  REACT_JSXDEV = "react-jsxdev",
  REACT_NATIVE = "react-native",
}

/**
 * Configuration for `deno fmt`
 */
export interface DenoFmt {
  readonly files?: DenoFmtFiles;
  readonly options?: DenoFmtOptions;
}

/**
 * File configuration for `deno fmt`
 */
export interface DenoFmtFiles {
  /**
   * List of files or directories that will not be formatted.
   */
  readonly exclude?: string[];
  /**
   * List of files or directories that will be formatted.
   */
  readonly include?: string[];
}

/**
 * Optional configuration for `deno fmt`
 */
export interface DenoFmtOptions {
  /**
   * The number of characters for an indent.
   */
  readonly indentWidth?: number;
  /**
   * The width of a line the printer will try to stay under. Note that the printer may exceed
   * this width in certain cases.
   */
  readonly lineWidth?: number;
  /**
   * Define how prose should be wrapped in Markdown files.
   */
  readonly proseWrap?: ProseWrap;
  /**
   * Whether to use single quote (true) or double quote (false) for quotation.
   */
  readonly singleQuote?: boolean;
  /**
   * Whether to use tabs (true) or spaces (false) for indentation.
   */
  readonly useTabs?: boolean;
}

/**
 * Define how prose should be wrapped in Markdown files.
 */
export enum ProseWrap {
  ALWAYS = "always",
  NEVER = "never",
  PRESERVE = "preserve",
}

/**
 * Configuration for `deno lint`
 */
export interface Lint {
  readonly files?: LintFiles;
  readonly rules?: LintRules;
}

/**
 * File configuration for `deno lint`
 */
export interface LintFiles {
  /**
   * List of files or directories that will not be linted.
   */
  readonly exclude?: string[];
  /**
   * List of files or directories that will be linted.
   */
  readonly include?: string[];
}

/**
 * Rules configuration for `deno lint`
 */
export interface LintRules {
  /**
   * List of rule names that will be excluded from configured tag sets. If the same rule is in
   * `include` it be run.
   */
  readonly exclude?: string[];
  /**
   * List of rule names that will be run. Even if the same rule is in `exclude` it will be run.
   */
  readonly include?: string[];
  /**
   * List of tag names that will be run. Empty list disables all tags and will only use rules
   * from `include`.
   */
  readonly tags?: string[];
}

/**
 * Configuration for deno task
 */
export interface Tasks {
  readonly [key: string]: string;
}

export class DenoConfig {
  public readonly file: JsonFile;
  public readonly fileName: string;
  public readonly importMap?: ImportMap;

  constructor(project: DenoProject, options: DenoConfigOptions) {
    this.fileName = options.fileName ?? "deno.json";

    if (options.importMap != null) {
      this.importMap = new ImportMap(project, { filePath: options.importMap });
    }

    this.file = new JsonFile(project, this.fileName, {
      obj: {
        ...options,
        fileName: undefined,
      },
    });
  }
}
