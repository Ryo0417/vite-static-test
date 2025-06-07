import { BaseVitePlugin } from "../utils/basePlugin.mjs";
import {
  processDirectoryRecursively,
  transformJsPaths,
} from "../utils/fileUtils.mjs";
import path from "node:path";
import fs from "node:fs";

/**
 * JavaScriptファイルをコピーするプラグイン
 */
class CopyScriptJsPlugin extends BaseVitePlugin {
  constructor(options = {}) {
    super("copy-script-js-plugin");
    this.verbose = options.verbose || false;
  }

  buildStart() {
    // JSディレクトリが存在するか確認
    if (!fs.existsSync("src/assets/js")) {
      console.warn("Warning: src/assets/js directory not found");
      return;
    }
  }

  generateBundle(options, bundle) {
    try {
      // JSファイルを処理するコールバック
      const processJsFile = (fullPath, relativePath, fileName) => {
        if (fileName.endsWith(".js")) {
          // JSファイルの場合はコピー
          let content = fs.readFileSync(fullPath, "utf-8");

          // 出力先のパスを決定
          const outputPath = `assets/js/${relativePath}`;

          // JSファイルの種類に基づいて深さを調整
          let depth = 0;

          // script.jsはトップレベルのHTMLから読み込まれるため、深さは0
          if (fileName === "script.js") {
            depth = 0;
          }
          // common/common.jsは様々な階層から読み込まれる可能性があるため、
          // 各HTMLファイルごとに別々のバージョンを生成する必要があるかもしれません
          // else if (relativePath.includes("common/")) {
          //   // common.jsの場合は、読み込まれるHTMLの階層に応じて調整が必要
          //   // ここでは簡易的に1階層下と仮定
          //   depth = 1;
          // }
          // その他のJSファイルは、そのファイルパスの階層に基づいて深さを計算
          else {
            depth = relativePath.split("/").length - 1;
          }

          // JSパスを変換（階層の深さを渡す）
          content = transformJsPaths(content, depth, {
            verbose: this.verbose,
            fileName: relativePath,
          });

          this.emitFile({
            type: "asset",
            fileName: outputPath,
            source: content,
          });

          if (this.verbose) {
            console.log(
              `Copied JS file: ${fullPath} -> ${outputPath} (depth: ${depth})`
            );
          }
        }
      };

      // ディレクトリを再帰的に処理
      processDirectoryRecursively(
        "src/assets/js",
        processJsFile,
        null,
        "src/assets/js"
      );

      console.log("JavaScript files processed and copied to output directory");
    } catch (error) {
      console.error(`Error in copyScriptJsPlugin: ${error.message}`);
    }
  }
}

export default function copyScriptJsPlugin(options = {}) {
  return new CopyScriptJsPlugin(options).createPlugin();
}
