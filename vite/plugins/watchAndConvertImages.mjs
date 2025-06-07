import { BaseVitePlugin } from "../utils/basePlugin.mjs";
import {
  access,
  readdir,
  unlink,
  mkdir,
  directoryExists,
} from "../utils/fileUtils.mjs";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

/**
 * 画像ファイルの監視と変換プラグイン
 */
class WatchAndConvertImagesPlugin extends BaseVitePlugin {
  constructor() {
    super("watch-and-convert-images");
    this.processingFiles = new Set();
  }

  async scanDirectory(dir) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (
          /\.(png|jpe?g)$/i.test(entry.name) &&
          !this.processingFiles.has(fullPath)
        ) {
          // WebP形式に変換
          const webpPath = fullPath.replace(/\.(png|jpe?g)$/i, ".webp");

          try {
            this.processingFiles.add(fullPath);
            await sharp(fullPath).webp({ quality: 80 }).toFile(webpPath);
            console.log(
              `Initial conversion to WebP: ${fullPath} -> ${webpPath}`
            );

            // 元の画像ファイルを削除
            await unlink(fullPath);
            console.log(`Removed original image: ${fullPath}`);

            this.processingFiles.delete(fullPath);
          } catch (err) {
            console.error(`Error during initial conversion: ${err}`);
            this.processingFiles.delete(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}: ${error}`);
    }
  }

  configureServer({ watcher, ws }) {
    // 画像ディレクトリを監視
    watcher.add([
      "./src/assets/images/**/*.png",
      "./src/assets/images/**/*.jpg",
      "./src/assets/images/**/*.jpeg",
    ]);

    // 画像ファイル追加時の処理
    watcher.on("add", async (filePath) => {
      if (
        /\.(png|jpe?g)$/i.test(filePath) &&
        !this.processingFiles.has(filePath)
      ) {
        console.log(`New image detected: ${filePath}`);

        // WebP形式に変換
        const webpPath = filePath.replace(/\.(png|jpe?g)$/i, ".webp");

        try {
          this.processingFiles.add(filePath);
          await sharp(filePath).webp({ quality: 80 }).toFile(webpPath);
          console.log(`Converted to WebP: ${filePath} -> ${webpPath}`);

          // 元の画像ファイルを削除
          await unlink(filePath);
          console.log(`Removed original image: ${filePath}`);

          // ブラウザをリロード
          ws.send({
            type: "full-reload",
            path: "*",
          });

          this.processingFiles.delete(filePath);
        } catch (err) {
          console.error(`Error converting image: ${err}`);
          this.processingFiles.delete(filePath);
        }
      }
    });

    // 初期ロード時に既存の画像をスキャンしてWebP変換
    (async () => {
      try {
        // src/imagesディレクトリが存在するか確認
        if (!(await directoryExists("./src/images"))) {
          console.log("src/images directory not found, skipping initial scan");
          return;
        }

        await this.scanDirectory("./src/images");
      } catch (error) {
        console.error(`Error during initial scan: ${error}`);
      }
    })();
  }
}

/**
 * 画像ファイルの監視と変換プラグインを作成
 * @returns {object} Viteプラグイン
 */
export default function watchAndConvertImages() {
  return new WatchAndConvertImagesPlugin().createPlugin();
}
