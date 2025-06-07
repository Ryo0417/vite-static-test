import { defineConfig } from "vite";
// HMR用プラグインを削除してVite標準のHMR機能を使用
// import liveReload from "vite-plugin-live-reload";
// import fullReload from "vite-plugin-full-reload";
import { resolve } from "path";
import { promises as fs } from "fs";
import fs2 from "node:fs"; // 同期的なfsモジュールを追加
import path from "path";
import dotenv from "dotenv";
import imagemin from "vite-plugin-imagemin";
import sharp from "sharp";
import * as globModule from "glob";
import {
  autoForwardScssFiles,
  watchAndConvertImages,
  scssEntryPlugin,
  staticHtmlServe,
  copyImagesPlugin,
  copyHtmlPlugin,
  transformHtmlPlugin,
  removeSrcFolderPlugin,
  copyScriptJsPlugin,
  copyCssPlugin,
} from "./vite/plugins/index.mjs";
import CopyHtmlPlugin from "./vite/plugins/copyHtmlPlugin.mjs";
import CopyImagesPlugin from "./vite/plugins/copyImagesPlugin.mjs";

// .envファイルの読み込み
dotenv.config();

// HTMLファイルを動的に検索する関数
function getHtmlEntries() {
  const entries = {};
  const htmlFiles = globModule.glob.sync("src/html/**/*.html");

  htmlFiles.forEach((file) => {
    // ファイルパスからエントリー名を生成
    let entryName = file.replace("src/html/", "").replace("/index.html", "");
    if (entryName === "index.html") entryName = "main";
    else entryName = entryName.replace(".html", "");

    // エントリーを追加
    entries[entryName] = resolve(__dirname, file);
  });

  return entries;
}

// 不要なmain.jsを削除するプラグイン
function removeMainJsPlugin() {
  return {
    name: "remove-main-js",
    generateBundle(options, bundle) {
      // main.jsを削除
      if (bundle["assets/js/main.js"]) {
        console.log("Removing unnecessary main.js");
        delete bundle["assets/js/main.js"];
      }
    },
  };
}

export default defineConfig({
  // ベースディレクトリ設定
  base: process.env.NODE_ENV === "development" ? "/" : "./",

  // エントリーポイントを明示的に設定
  optimizeDeps: {
    entries: ["src/js/script.js"],
  },

  // SCSSのインクルードパス設定
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: ["node_modules", "src/sass"],
        charset: false,
        importers: [
          {
            findFileUrl(url) {
              return null;
            },
          },
        ],
      },
    },
    // CSSモジュールを無効化
    modules: false,
    // CSSファイル名を固定
    devSourcemap: true,
    // CSS圧縮を無効化
    minify: false,
  },

  // 開発サーバーの設定
  server: {
    hmr: true,
    host: "localhost",
    port: 5173,
    cors: true,
    open: "/", // 開発サーバー起動時にブラウザを開く
    base: "/", // ベースパスを設定

    // ファイルシステム設定
    fs: {
      strict: false,
      allow: [".."],
    },
  },

  // ビルド設定
  build: {
    // 出力先を設定
    outDir: "dist",
    assetsDir: "assets",
    // ソースマップを生成
    sourcemap: process.env.NODE_ENV === "development",
    // CSS圧縮を無効化
    cssMinify: false,
    // JS圧縮設定（必要に応じて）
    minify: "terser",
    // エミットオプション
    emptyOutDir: true, // 出力ディレクトリを空にする
    // ロールアップオプション
    rollupOptions: {
      input: {
        style: resolve(__dirname, "src/assets/sass/style.scss"),
        main: resolve(__dirname, "src/assets/js/script.js"),
      },
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith(".css")) {
            return "assets/css/style.css";
          }
          if (/\.(gif|jpe?g|png|svg|webp)$/i.test(assetInfo.name)) {
            return "assets/images/[name][extname]";
          }
          if (assetInfo.name.endsWith(".js")) {
            // JSファイルのパスを維持
            const parts = assetInfo.name.split("/");
            const jsPath = parts.slice(1).join("/");
            return `assets/js/${jsPath}`;
          }
          return "assets/[ext]/[name][extname]";
        },
        entryFileNames: "assets/js/[name].js",
      },
    },
    // SVG最適化の設定
    assetsInlineLimit: 0, // インライン化しない

    // ログレベルの設定
    reportCompressedSize: false, // 圧縮サイズのレポートを無効化

    // terserの設定
    terserOptions: {
      compress: {
        drop_console: true, // console.logを削除
      },
    },

    // ビルドログの設定
    write: true,
  },

  // プラグイン
  plugins: [
    // 静的HTMLサーブプラグイン（開発時のみ）
    staticHtmlServe(),

    // SCSSエントリープラグイン
    scssEntryPlugin(),

    // 不要なmain.jsを削除するプラグイン
    removeMainJsPlugin(),

    // HTMLファイルをコピーするプラグイン
    new CopyHtmlPlugin(),

    // HTMLファイルのパスを変換するプラグイン
    transformHtmlPlugin({ verbose: true }),

    // JavaScriptファイルをコピーするプラグイン
    copyScriptJsPlugin(),

    // CSSファイルをコピーするプラグイン
    copyCssPlugin(),

    // 画像ファイルをコピーするプラグイン
    new CopyImagesPlugin(),

    // srcフォルダの生成を防止するプラグイン
    removeSrcFolderPlugin(),

    // 画像の最適化
    imagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false,
      },
      optipng: {
        optimizationLevel: 7,
      },
      mozjpeg: {
        quality: 80,
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4,
      },
      svgo: {
        plugins: [
          {
            name: "removeViewBox",
            active: false,
          },
          {
            name: "cleanupIDs",
            active: false,
          },
          {
            name: "removeEmptyAttrs",
            active: false,
          },
          {
            name: "addAttributesToSVGElement",
            params: {
              attributes: [{ xmlns: "http://www.w3.org/2000/svg" }],
            },
          },
        ],
      },
      webp: {
        quality: 80,
      },
      // エラーハンドリングを強化
      verbose: false,
      silent: true,
    }),

    // SCSSファイルの自動フォワーディングプラグイン
    autoForwardScssFiles(),

    // Vite標準のHMR機能を使用するため、カスタムHMRプラグインは削除
    // SCSSファイルはViteが自動的にHMRを適用します

    // 画像ファイルの監視と変換プラグイン
    watchAndConvertImages(),
  ],

  // ファイルの解決設定
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "/src/js/": "/src/assets/js/",
      "/src/images/": "/src/assets/images/",
      "/src/sass/": "/src/assets/sass/",
    },
  },

  // 既存の設定に追加
  preview: {
    port: 4173,
    open: true,
    // SPA風の動作を実現するためのミドルウェア
    middlewares: [
      (req, res, next) => {
        // URLパスを取得
        const url = req.url;

        // ファイル拡張子がない場合（ディレクトリアクセスの場合）
        if (!path.extname(url) && url !== "/") {
          // index.htmlファイルのパスを構築
          const htmlPath = path.join(
            process.cwd(),
            "dist",
            url.slice(1),
            "index.html"
          );

          // ファイルが存在するか確認
          if (fs2.existsSync(htmlPath)) {
            // ファイルの内容を読み込んで返す
            const content = fs2.readFileSync(htmlPath);
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html");
            res.end(content);
            return;
          }
        }

        // 上記の条件に当てはまらない場合は次のミドルウェアに処理を委譲
        next();
      },
    ],
  },

  // ログレベルの設定
  logLevel: "error", // エラーのみ表示（'info', 'warn', 'error', 'silent'から選択）
});
