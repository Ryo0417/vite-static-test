import { BaseVitePlugin } from "../utils/basePlugin.mjs";
import {
  processDirectoryRecursively,
  transformHtmlPaths,
} from "../utils/fileUtils.mjs";
import path from "node:path";
import fs from "node:fs";
import process from "node:process";

/**
 * HTMLファイルをコピーするプラグイン
 */
class CopyHtmlPlugin extends BaseVitePlugin {
  constructor(options = {}) {
    super("copy-html-plugin");
    // デフォルトでは詳細ログを無効化
    this.verbose = options.verbose || false;
  }

  buildStart() {
    // HTMLディレクトリが存在するか確認
    if (!fs.existsSync("src/html")) {
      console.warn("Warning: src/html directory not found");
      return;
    }
  }

  generateBundle(options, bundle) {
    try {
      // HTMLファイルを処理するコールバック
      const processHtmlFile = (fullPath, relativePath, fileName) => {
        if (fileName.endsWith(".html")) {
          // HTMLファイルの場合はコピー
          let content = fs.readFileSync(fullPath, "utf-8");

          // パスの深さを計算
          const depth = relativePath.split(path.sep).length - 1;

          // HTMLパスを変換（詳細ログオプションを渡す）
          content = transformHtmlPaths(content, depth, {
            verbose: this.verbose,
            fileName: relativePath,
          });

          // 出力先のパスを決定
          this.emitFile({
            type: "asset",
            fileName: relativePath,
            source: content,
          });
        }
      };

      // ディレクトリを再帰的に処理
      processDirectoryRecursively(
        "src/html",
        processHtmlFile,
        null,
        "src/html"
      );

      // 処理完了メッセージ（ファイル数を表示）
      console.log(`HTML files processed and copied to output directory`);
    } catch (error) {
      console.error(`Error in copyHtmlPlugin: ${error.message}`);
      console.error(error.stack);
    }
  }
}

/**
 * HTMLファイルをコピーするプラグインを作成
 * @returns {object} Viteプラグイン
 */
export default function copyHtmlPlugin() {
  return new CopyHtmlPlugin().createPlugin();
}
