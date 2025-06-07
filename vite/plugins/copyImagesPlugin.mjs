import { BaseVitePlugin } from "../utils/basePlugin.mjs";
import {
  processDirectoryRecursively,
  directoryExists,
} from "../utils/fileUtils.mjs";
import path from "node:path";
import fs from "node:fs";

/**
 * 画像ファイルをコピーするプラグイン
 * ビルド時にsrc/imagesのディレクトリ構造を維持したままdist/assets/imagesにコピーする
 * @returns {object} Viteプラグイン
 */
class CopyImagesPlugin extends BaseVitePlugin {
  constructor(options = {}) {
    super("copy-images-plugin");
    // デフォルトでは詳細ログを無効化
    this.verbose = options.verbose || false;
  }

  buildStart() {
    // 画像ディレクトリが存在するか確認
    if (!directoryExists("src/assets/images")) {
      console.warn("Warning: src/assets/images directory not found");
      return;
    }
  }

  generateBundle(options, bundle) {
    try {
      // 開始メッセージは常に表示
      console.log("Starting to copy images from src/assets/images...");

      let copiedCount = 0;

      // 画像ファイルを処理するコールバック
      const processImageFile = (fullPath, relativePath, fileName) => {
        if (/\.(gif|jpe?g|png|svg|webp)$/i.test(fileName)) {
          // 画像ファイルの場合はコピー
          try {
            const content = fs.readFileSync(fullPath);
            const destPath = `assets/images/${relativePath}`;

            this.emitFile({
              type: "asset",
              fileName: destPath,
              source: content,
            });

            // 詳細ログが有効な場合のみ個別ファイルのログを出力
            if (this.verbose) {
              console.log(`Copied image: ${fullPath} -> ${destPath}`);
            }

            copiedCount++;
          } catch (error) {
            console.error(`Error copying image ${fullPath}: ${error.message}`);
          }
        }
      };

      // ディレクトリを再帰的に処理
      processDirectoryRecursively(
        "src/assets/images",
        processImageFile,
        null,
        "src/assets/images"
      );

      // 完了メッセージは常に表示（ただしファイル数の情報を追加）
      console.log(`Finished copying ${copiedCount} images`);
    } catch (error) {
      console.error(`Error in copyImagesPlugin: ${error.message}`);
    }
  }
}

/**
 * 画像ファイルをコピーするプラグインを作成
 * @returns {object} Viteプラグイン
 */
export default function copyImagesPlugin() {
  return new CopyImagesPlugin().createPlugin();
}
