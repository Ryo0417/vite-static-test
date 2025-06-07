import { BaseVitePlugin } from "../utils/basePlugin.mjs";
import { processDirectoryRecursively } from "../utils/fileUtils.mjs";
import fs from "node:fs";
import path from "node:path";

/**
 * CSSファイルをコピーするプラグイン
 */
class CopyCssPlugin extends BaseVitePlugin {
  constructor() {
    super("copy-css-plugin");
  }

  buildStart() {
    // CSSディレクトリが存在するか確認
    if (fs.existsSync("src/css")) {
      console.log("Found src/css directory");
    }
  }

  generateBundle() {
    try {
      // CSSファイルを処理するコールバック
      let copiedCount = 0;
      const processCssFile = (fullPath, relativePath, fileName) => {
        if (fileName.endsWith(".css")) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const destPath = `assets/css/${relativePath}`;

            this.emitFile({
              type: "asset",
              fileName: destPath,
              source: content,
            });

            copiedCount++;
          } catch (error) {
            console.error(
              `Error copying CSS file ${fullPath}: ${error.message}`
            );
          }
        }
      };

      // cssディレクトリを再帰的に処理
      if (fs.existsSync("src/css")) {
        processDirectoryRecursively("src/css", processCssFile, null, "src/css");
        console.log(`Copied ${copiedCount} CSS files from src/css`);
      }
    } catch (error) {
      console.error(`Error copying CSS files: ${error.message}`);
    }
  }
}

/**
 * CSSファイルをコピーするプラグインを作成
 * @returns {object} Viteプラグイン
 */
export default function copyCssPlugin() {
  return new CopyCssPlugin().createPlugin();
}
