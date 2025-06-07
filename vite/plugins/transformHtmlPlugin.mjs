import { BaseVitePlugin } from "../utils/basePlugin.mjs";
import { transformHtmlPaths } from "../utils/fileUtils.mjs";
import path from "node:path";

/**
 * HTMLファイルのパスを変換するプラグイン
 * 開発環境用のパスを本番環境用に変換する
 * @returns {object} Viteプラグイン
 */
class TransformHtmlPlugin extends BaseVitePlugin {
  constructor(options = {}) {
    super("transform-html-plugin");
    this.enforce = "post"; // 他のプラグインの後に実行
    this.verbose = options.verbose || false;
  }

  generateBundle(options, bundle) {
    // バンドル内のHTMLファイルを検索
    for (const fileName in bundle) {
      if (fileName.endsWith(".html")) {
        let content = bundle[fileName].source;

        // 相対パスの深さを計算
        const depth = fileName.split("/").length - 1;

        // HTMLパスを変換
        content = transformHtmlPaths(content, depth, {
          verbose: this.verbose,
          fileName: fileName,
        });

        // 修正したコンテンツを保存
        bundle[fileName].source = content;

        // if (this.verbose) {
        //   console.log(
        //     `Transformed HTML paths in: ${fileName} (depth: ${depth})`
        //   );
        // }
      }
    }
  }
}

/**
 * HTMLファイルのパスを変換するプラグインを作成
 * @param {object} options - プラグインオプション
 * @returns {object} Viteプラグイン
 */
export default function transformHtmlPlugin(options = {}) {
  return new TransformHtmlPlugin(options).createPlugin();
}
