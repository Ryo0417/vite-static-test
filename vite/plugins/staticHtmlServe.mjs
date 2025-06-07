import { BaseVitePlugin } from "../utils/basePlugin.mjs";
import path from "node:path";
import fs from "node:fs";

/**
 * 静的HTMLファイルを提供するプラグイン
 * 開発時にHTMLファイルを直接表示するためのプラグイン
 */
class StaticHtmlServe extends BaseVitePlugin {
  constructor() {
    super("static-html-serve");
  }

  configureServer(server) {
    // JSファイルのリクエストを処理するミドルウェア
    server.middlewares.use((req, res, next) => {
      // URLパスを取得
      const url = req.url;

      // /src/js/ へのリクエストを /src/assets/js/ にリダイレクト
      if (url.startsWith("/src/js/")) {
        const newUrl = url.replace("/src/js/", "/src/assets/js/");
        req.url = newUrl;
        console.log(`Redirecting ${url} to ${newUrl}`);
      }

      // /src/images/ へのリクエストを /src/assets/images/ にリダイレクト
      if (url.startsWith("/src/images/")) {
        const newUrl = url.replace("/src/images/", "/src/assets/images/");
        req.url = newUrl;
        console.log(`Redirecting ${url} to ${newUrl}`);
      }

      next();
    });

    // ルートへのアクセスをindex.htmlにリダイレクト
    server.middlewares.use((req, res, next) => {
      // URLパスを取得
      const url = req.url;

      // クエリパラメータを除去
      const urlWithoutQuery = url.split("?")[0];

      // ルートへのアクセス
      if (urlWithoutQuery === "/" || urlWithoutQuery === "/index.html") {
        console.log("Redirecting / to /src/html/index.html");
        req.url = "/src/html/index.html";
        next();
        return;
      }

      // 静的ファイル（.js, .css, .png など）へのリクエストはそのまま処理
      if (path.extname(urlWithoutQuery)) {
        next();
        return;
      }

      // /about/ のようなパスへのアクセス（末尾のスラッシュを維持）
      // パスの先頭の / を削除
      let cleanPath = urlWithoutQuery.startsWith("/")
        ? urlWithoutQuery.slice(1)
        : urlWithoutQuery;

      // 末尾のスラッシュを維持したまま処理
      if (cleanPath.endsWith("/")) {
        // ディレクトリ内のindex.htmlを探す
        const htmlPath = path.join(
          process.cwd(),
          "src",
          "html",
          cleanPath,
          "index.html"
        );

        if (fs.existsSync(htmlPath)) {
          console.log(`Redirecting ${url} to /src/html/${cleanPath}index.html`);
          req.url = `/src/html/${cleanPath}index.html`;
          next();
          return;
        }
      }

      // 上記の条件に当てはまらない場合は次のミドルウェアに処理を委譲
      next();
    });
  }
}

export default function staticHtmlServe() {
  return new StaticHtmlServe().createPlugin();
}
