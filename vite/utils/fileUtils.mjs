import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

// プロミス版のファイル操作関数
export const readdir = promisify(fs.readdir);
export const stat = promisify(fs.stat);
export const mkdir = promisify(fs.mkdir);
export const unlink = promisify(fs.unlink);
export const access = promisify(fs.access);

/**
 * ディレクトリが存在するか確認する
 * @param {string} dir - 確認するディレクトリパス
 * @returns {boolean} - ディレクトリが存在するかどうか
 */
export function directoryExists(dir) {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * ファイルが存在するか確認する
 * @param {string} filePath - 確認するファイルパス
 * @returns {boolean} - ファイルが存在するかどうか
 */
export function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (error) {
    return false;
  }
}

/**
 * ディレクトリを再帰的に処理する
 * @param {string} dir - 処理するディレクトリ
 * @param {Function} fileCallback - ファイルを処理するコールバック関数
 * @param {Function} dirCallback - ディレクトリを処理するコールバック関数（オプション）
 * @param {string} baseDir - 基準となるディレクトリ（相対パス計算用）
 */
export function processDirectoryRecursively(
  dir,
  fileCallback,
  dirCallback = null,
  baseDir = dir
) {
  if (!directoryExists(dir)) {
    console.warn(`Warning: Directory not found: ${dir}`);
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      // ディレクトリコールバックがあれば実行
      if (dirCallback) {
        dirCallback(fullPath, relativePath);
      }
      // 再帰的に処理
      processDirectoryRecursively(fullPath, fileCallback, dirCallback, baseDir);
    } else if (entry.isFile()) {
      // ファイルコールバックを実行
      fileCallback(fullPath, relativePath, entry.name);
    }
  }
}

/**
 * HTMLファイル内のパスを変換する
 * @param {string} content - HTMLコンテンツ
 * @param {number} depth - ディレクトリの深さ
 * @param {object} options - オプション設定
 * @returns {string} 変換後のHTMLコンテンツ
 */
export function transformHtmlPaths(content, depth, options = {}) {
  // デフォルトでは詳細ログを無効化
  const verbose = options.verbose || false;

  // 相対パスのプレフィックスを作成
  const prefix = depth > 0 ? "../".repeat(depth) : "./";

  // src/images へのパスを assets/images に変換（絶対パスと相対パスの両方に対応）
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/images\//g,
    `$1${prefix}assets/images/`
  );

  // src/assets/images へのパスを assets/images に変換
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/assets\/images\//g,
    `$1${prefix}assets/images/`
  );

  // src/js へのパスを assets/js に変換（サブディレクトリを含む）
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/js(\/[^"']*)?/g,
    function (match, quote, leadingSlash, jsPath) {
      return `${quote}${prefix}assets/js${jsPath || ""}`;
    }
  );

  // src/assets/js へのパスを assets/js に変換
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/assets\/js(\/[^"']*)?/g,
    function (match, quote, leadingSlash, jsPath) {
      return `${quote}${prefix}assets/js${jsPath || ""}`;
    }
  );

  // src/sass/style.scss を assets/css/style.css に変換
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/sass\/style\.scss/g,
    `$1${prefix}assets/css/style.css`
  );

  // src/assets/sass/style.scss を assets/css/style.css に変換
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/assets\/sass\/style\.scss/g,
    `$1${prefix}assets/css/style.css`
  );

  // src/css/ を assets/css/ に変換
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/css\//g,
    `$1${prefix}assets/css/`
  );

  return content;
}

/**
 * JavaScriptファイル内のパスを変換する
 * @param {string} content - JavaScriptコンテンツ
 * @param {number} depth - ディレクトリの深さ
 * @param {object} options - オプション設定
 * @returns {string} 変換後のJavaScriptコンテンツ
 */
export function transformJsPaths(content, depth = 0, options = {}) {
  // デフォルトでは詳細ログを無効化
  const verbose = options.verbose || false;

  // 相対パスのプレフィックスを作成
  const prefix = depth > 0 ? "../".repeat(depth) : "./";

  // src/images/ へのパスを assets/images/ に変換
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/images\//g,
    `$1${prefix}assets/images/`
  );

  // src/assets/images/ へのパスを assets/images/ に変換
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/assets\/images\//g,
    `$1${prefix}assets/images/`
  );

  // src/js/ へのパスを assets/js/ に変換
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/js(\/[^"']*)?/g,
    function (match, quote, leadingSlash, jsPath) {
      return `${quote}${prefix}assets/js${jsPath || ""}`;
    }
  );

  // src/assets/js/ へのパスを assets/js/ に変換
  content = content.replace(
    /(['"])(\/|\.\.\/)*src\/assets\/js(\/[^"']*)?/g,
    function (match, quote, leadingSlash, jsPath) {
      return `${quote}${prefix}assets/js${jsPath || ""}`;
    }
  );

  return content;
}
