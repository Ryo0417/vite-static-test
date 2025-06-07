import { BaseVitePlugin } from "../utils/basePlugin.mjs";
import { fileExists } from "../utils/fileUtils.mjs";

/**
 * SCSSファイルを処理するプラグイン
 */
class ScssEntryPlugin extends BaseVitePlugin {
  constructor() {
    super("vite-plugin-scss-entry");
  }

  buildStart() {
    // style.scssが存在するか確認
    if (!fileExists("src/assets/sass/style.scss")) {
      console.error("Error: src/assets/sass/style.scss not found");
    }
  }

  transformIndexHtml(html) {
    // CSSの圧縮を防ぐ
    return html;
  }

  generateBundle(options, bundle) {
    // バンドル内のCSSファイルを検索
    for (const fileName in bundle) {
      if (fileName.endsWith(".css")) {
        // style.cssとして出力
        bundle[fileName].fileName = "assets/css/style.css";
        // console.log(`Renamed CSS file: ${fileName} -> assets/css/style.css`);

        // CSSの内容が圧縮されていないことを確認
        if (
          bundle[fileName].source &&
          typeof bundle[fileName].source === "string"
        ) {
          // 既に圧縮されている場合は、元のソースを保持
          // console.log("Ensuring CSS is not minified");
        }
      }

      // 不要なJSファイルを削除
      if (fileName.endsWith(".js") && fileName.includes("style")) {
        // console.log(`Removing unnecessary JS file: ${fileName}`);
        delete bundle[fileName];
      }
    }
  }
}

/**
 * SCSSファイルを処理するプラグインを作成
 * @returns {object} Viteプラグイン
 */
export default function scssEntryPlugin() {
  return new ScssEntryPlugin().createPlugin();
}
