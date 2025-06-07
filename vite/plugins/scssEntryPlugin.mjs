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

        // CSSの内容が圧縮されていないことを確認し、画像パスを修正
        if (
          bundle[fileName].source &&
          typeof bundle[fileName].source === "string"
        ) {
          // 画像パスを修正: ../images/ -> ../images/common/
          let cssContent = bundle[fileName].source;

          // SCSSで使用されている画像パスを正しいパスに変換
          cssContent = cssContent.replace(
            /url\(\.\.\/images\/quotation\.svg\)/g,
            "url(../images/common/quotation.svg)"
          );

          // 修正した内容を反映
          bundle[fileName].source = cssContent;

          console.log("Fixed CSS image paths for quotation.svg");
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
