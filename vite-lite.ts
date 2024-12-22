/// <reference types="node" />

import { parse, init } from "es-module-lexer"
import path from "path";
import fs from "fs";
import esbuild from "esbuild";

class ViteLite {

    private root: string;
    private moduleCache: Map<string, any>;

    constructor(root = process.cwd()) {
        this.root = root;
        this.moduleCache = new Map();
    }

    // This function is SPECIFICALLY used for development
    // so that it can be used to serve files on demand 
    // (becuase the code isn't pre-built/bundled) and allows
    // HMR to work.
    async transformImports(code: string, filename: string) {

        await init;

        const [imports] = await parse(code);

        let transformedCode = code;

        for (const imp of imports) {
            // s = start, e = end
            // Both are gotten from es-module-lexer 'imports'
            const specifier = code.substring(imp.s, imp.e);

            // Transform bare module imports to special
            // imports but changing their specifier to
            // the new specifier (e.g. 'fs' -> '/@modules/fs')
            if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
                const newSpecifier = `/@modules/${specifier}`;
                transformedCode = transformedCode.replace(specifier, newSpecifier);
            }
        }

        return transformedCode;
    }

    async transformFile(filename: string) {
        const extension = path.extname(filename);

        const code = await fs.promises.readFile(filename, 'utf-8');

        if (extension === '.js' || extension === '.ts') {
            const transformedCode = await this.transformImports(code, filename);

            const result = await esbuild.transform(transformedCode, {
                loader: extension.slice(1) as 'ts' | 'js', // 'ts' or 'js'
                target: 'es2020',
            });

            return result;
        }

        return code;
    }

}