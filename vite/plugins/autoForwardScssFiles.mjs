import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

// fsの関数をPromise化
const access = promisify(fs.access);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

// sassのルートディレクトリ
const SASS_ROOT = "src/assets/sass";

// ログレベルの設定
const LOG_LEVEL = {
  NONE: 0, // ログを出力しない
  ERROR: 1, // エラーのみ出力
  WARN: 2, // 警告とエラーを出力
  INFO: 3, // 情報、警告、エラーを出力
  DEBUG: 4, // すべて出力
};

// 現在のログレベル（環境変数から取得するか、デフォルト値を使用）
const CURRENT_LOG_LEVEL = process.env.SCSS_LOG_LEVEL
  ? parseInt(process.env.SCSS_LOG_LEVEL)
  : LOG_LEVEL.ERROR; // デフォルトはエラーのみ表示

/**
 * ログ出力関数
 */
const logger = {
  debug: (message) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.DEBUG)
      console.log(`[SCSS Debug] ${message}`);
  },
  info: (message) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.INFO) console.log(`[SCSS] ${message}`);
  },
  warn: (message) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.WARN)
      console.warn(`[SCSS Warning] ${message}`);
  },
  error: (message) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVEL.ERROR)
      console.error(`[SCSS Error] ${message}`);
  },
};

/**
 * SCSSファイルの自動フォワーディングプラグイン
 * @returns {object} Viteプラグイン
 */
function autoForwardScssFiles() {
  return {
    name: "auto-forward-scss-files",
    async buildStart() {
      // ビルド開始時に全ディレクトリを処理
      try {
        await initializeScssStructure();
      } catch (error) {
        logger.error(`Error initializing SCSS structure: ${error}`);
      }
    },
    configureServer({ watcher, ws }) {
      // SCSSファイルの変更を監視
      watcher.add(`${SASS_ROOT}/**/*.scss`);

      // ファイル追加時の処理
      watcher.on("add", async (filePath) => {
        if (filePath.endsWith(".scss") && filePath.includes(SASS_ROOT)) {
          try {
            // sassディレクトリ直下の_index.scssを削除（不要なため）
            const rootIndexPath = path.join(SASS_ROOT, "_index.scss");
            if (await fileExists(rootIndexPath)) {
              await fs.promises.unlink(rootIndexPath);
              logger.debug(`Removed unnecessary _index.scss in ${SASS_ROOT}`);
            }

            // パーシャルファイルのみを処理（_で始まるファイル）
            const fileName = path.basename(filePath);
            const dirPath = path.dirname(filePath);

            // _index.scss以外のパーシャルファイルを処理
            if (fileName.startsWith("_") && fileName !== "_index.scss") {
              logger.debug(`New SCSS partial detected: ${filePath}`);

              // 同じディレクトリに_index.scssが存在するか確認
              const indexPath = path.join(dirPath, "_index.scss");
              let indexExists = false;

              try {
                await access(indexPath, fs.constants.F_OK);
                indexExists = true;
              } catch (err) {
                // _index.scssが存在しない場合は新規作成
                logger.debug(`Creating new _index.scss in ${dirPath}`);
              }

              // 現在のディレクトリ内のすべてのSCSSパーシャルファイルを取得
              const dirFiles = await readdir(dirPath);
              const partials = dirFiles
                .filter(
                  (file) =>
                    file.startsWith("_") &&
                    file !== "_index.scss" &&
                    file.endsWith(".scss")
                )
                .map((file) => file.slice(0, -5)); // .scssを除去

              // @forwardステートメントを生成
              const forwardStatements = partials
                .map((partial) => `@forward "${partial.substring(1)}";`)
                .join("\n");

              // _index.scssファイルの内容を作成
              const indexContent = `// このファイルは自動生成されています。直接編集しないでください。
// ${path.relative(SASS_ROOT, dirPath)}ディレクトリのパーシャル
${forwardStatements}`;

              // _index.scssファイルを書き込み
              await writeFile(indexPath, indexContent, "utf8");
              logger.debug(`Updated _index.scss in ${dirPath}`);

              // 親ディレクトリの_index.scssを更新
              await updateParentIndexFiles(dirPath);

              // メインのstyle.scssも更新
              await updateMainStyleScss();

              // ブラウザをリロード
              ws.send({ type: "full-reload" });
            }
          } catch (error) {
            logger.error(`Error processing SCSS file: ${error}`);
          }
        }
      });

      // ファイル削除時の処理
      watcher.on("unlink", async (filePath) => {
        if (filePath.endsWith(".scss") && filePath.includes(SASS_ROOT)) {
          try {
            // パーシャルファイルのみを処理（_で始まるファイル）
            const fileName = path.basename(filePath);
            const dirPath = path.dirname(filePath);

            // _index.scss以外のパーシャルファイルが削除された場合
            if (fileName.startsWith("_") && fileName !== "_index.scss") {
              logger.debug(`SCSS partial removed: ${filePath}`);

              // 同じディレクトリに_index.scssが存在するか確認
              const indexPath = path.join(dirPath, "_index.scss");

              try {
                await access(indexPath, fs.constants.F_OK);

                // 現在のディレクトリ内のすべてのSCSSパーシャルファイルを取得
                const dirFiles = await readdir(dirPath);
                const partials = dirFiles
                  .filter(
                    (file) =>
                      file.startsWith("_") &&
                      file !== "_index.scss" &&
                      file.endsWith(".scss")
                  )
                  .map((file) => file.slice(0, -5)); // .scssを除去

                // パーシャルファイルが残っていない場合は_index.scssを削除
                if (partials.length === 0) {
                  await fs.promises.unlink(indexPath);
                  logger.debug(`Removed empty _index.scss in ${dirPath}`);

                  // 親ディレクトリの_index.scssも更新（このフォルダへの参照を削除）
                  await updateParentIndexFiles(dirPath, true);
                } else {
                  // @forwardステートメントを更新
                  const forwardStatements = partials
                    .map((partial) => `@forward "${partial.substring(1)}";`)
                    .join("\n");

                  // _index.scssファイルの内容を更新
                  const indexContent = `// このファイルは自動生成されています。直接編集しないでください。
// ${path.relative(SASS_ROOT, dirPath)}ディレクトリのパーシャル
${forwardStatements}`;

                  // _index.scssファイルを書き込み
                  await writeFile(indexPath, indexContent, "utf8");
                  logger.debug(`Updated _index.scss in ${dirPath}`);

                  // ブラウザをリロード
                  ws.send({ type: "full-reload" });
                }
              } catch (err) {
                // _index.scssが存在しない場合は何もしない
              }
            }
          } catch (error) {
            logger.error(`Error processing SCSS file deletion: ${error}`);
          }
        }
      });

      // ファイル変更時の処理（ログ抑制）
      watcher.on("change", (filePath) => {
        if (filePath.endsWith(".scss") && filePath.includes(SASS_ROOT)) {
          // ファイル変更のログは出力しない
          // ただしブラウザのリロードは行う
          ws.send({ type: "full-reload" });
        }
      });

      // サーバー起動時に全ディレクトリを処理
      initializeScssStructure().catch((error) => {
        logger.error(`Error initializing SCSS structure: ${error}`);
      });
    },
  };
}

/**
 * 親ディレクトリの_index.scssファイルを更新
 * @param {string} dirPath - 子ディレクトリのパス
 * @param {boolean} isRemove - 子ディレクトリの参照を削除するかどうか
 */
async function updateParentIndexFiles(dirPath, isRemove = false) {
  // src/sassディレクトリの場合は親を更新しない
  if (dirPath === SASS_ROOT) {
    return;
  }

  const parentDir = path.dirname(dirPath);

  // src/sassより上の階層には行かない
  if (!parentDir.includes(SASS_ROOT)) {
    return;
  }

  // 親ディレクトリがsassディレクトリ直下の場合は_index.scssを生成しない
  if (parentDir === SASS_ROOT) {
    // ここでreturnするだけでなく、sassディレクトリ直下の_index.scssを削除する
    const rootIndexPath = path.join(SASS_ROOT, "_index.scss");
    if (await fileExists(rootIndexPath)) {
      await fs.promises.unlink(rootIndexPath);
      logger.debug(`Removed unnecessary _index.scss in ${SASS_ROOT}`);
    }
    return;
  }

  // 現在のディレクトリ名を取得
  const dirName = path.basename(dirPath);

  // 親ディレクトリの_index.scssのパス
  const parentIndexPath = path.join(parentDir, "_index.scss");

  logger.debug(`Updating parent _index.scss in ${parentDir} for ${dirName}`);

  try {
    // 親ディレクトリ内のすべてのサブディレクトリを取得
    const parentEntries = await readdir(parentDir, { withFileTypes: true });
    const subDirs = parentEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    // 親ディレクトリ内のすべてのパーシャルファイルを取得
    const partials = parentEntries
      .filter(
        (entry) =>
          !entry.isDirectory() &&
          entry.name.startsWith("_") &&
          entry.name !== "_index.scss" &&
          entry.name.endsWith(".scss")
      )
      .map((entry) => entry.name.slice(0, -5)); // .scssを除去

    // 各サブディレクトリに_index.scssが存在するか確認
    const validSubDirs = [];
    for (const subDir of subDirs) {
      // 削除モードの場合、現在のディレクトリはスキップ
      if (isRemove && subDir === dirName) {
        continue;
      }

      const subDirIndexPath = path.join(parentDir, subDir, "_index.scss");
      try {
        await access(subDirIndexPath, fs.constants.F_OK);
        validSubDirs.push(subDir);
      } catch (err) {
        // _index.scssが存在しないサブディレクトリはスキップ
      }
    }

    // 削除モードでない場合、現在のディレクトリが有効なサブディレクトリに含まれているか確認
    if (!isRemove) {
      const currentDirIndexPath = path.join(dirPath, "_index.scss");
      try {
        await access(currentDirIndexPath, fs.constants.F_OK);
        if (!validSubDirs.includes(dirName)) {
          validSubDirs.push(dirName);
        }
      } catch (err) {
        // _index.scssが存在しない場合はスキップ
      }
    }

    // パーシャルファイルまたは有効なサブディレクトリがある場合は_index.scssを作成/更新
    if (partials.length > 0 || validSubDirs.length > 0) {
      // _index.scss内容を生成
      let indexContent = `// このファイルは自動生成されています。直接編集しないでください。
// ${path.relative(
        SASS_ROOT,
        parentDir
      )}ディレクトリのパーシャルとサブディレクトリ\n`;

      // パーシャルファイルの@forward
      if (partials.length > 0) {
        indexContent += "\n// パーシャルファイル\n";
        indexContent += partials
          .map((partial) => `@forward "${partial.substring(1)}";`)
          .join("\n");
      }

      // サブディレクトリの@forward
      if (validSubDirs.length > 0) {
        indexContent += "\n\n// サブディレクトリ\n";
        indexContent += validSubDirs
          .map((subDir) => `@forward "${subDir}";`)
          .join("\n");
      }

      // _index.scssファイルを書き込み
      await writeFile(parentIndexPath, indexContent, "utf8");
      logger.debug(`Updated parent _index.scss in ${parentDir}`);

      // 親の親も更新（再帰的に）
      await updateParentIndexFiles(parentDir, false);
    } else if (await fileExists(parentIndexPath)) {
      // パーシャルもサブディレクトリもない場合は_index.scssを削除
      await fs.promises.unlink(parentIndexPath);
      logger.debug(`Removed empty parent _index.scss in ${parentDir}`);

      // 親の親も更新（再帰的に）
      await updateParentIndexFiles(parentDir, true);
    }
  } catch (error) {
    logger.error(`Error updating parent _index.scss: ${error}`);
  }
}

/**
 * ファイルが存在するかチェック
 * @param {string} filePath - チェックするファイルパス
 * @returns {Promise<boolean>} ファイルが存在するかどうか
 */
async function fileExists(filePath) {
  try {
    await access(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * SCSSディレクトリ構造を初期化
 */
async function initializeScssStructure() {
  logger.info("Initializing SCSS directory structure...");

  // sassディレクトリが存在するか確認
  try {
    await access(SASS_ROOT, fs.constants.F_OK);
  } catch (err) {
    // sassディレクトリが存在しない場合は作成
    await mkdir(SASS_ROOT, { recursive: true });
    logger.info(`Created ${SASS_ROOT} directory`);
  }

  // sassディレクトリ直下の_index.scssを削除（不要なため）
  const rootIndexPath = path.join(SASS_ROOT, "_index.scss");
  if (await fileExists(rootIndexPath)) {
    await fs.promises.unlink(rootIndexPath);
    logger.debug(`Removed unnecessary _index.scss in ${SASS_ROOT}`);
  }

  // すべてのディレクトリを再帰的に処理
  await processDir(SASS_ROOT);

  // メインのstyle.scssを更新
  await updateMainStyleScss();

  logger.info("SCSS directory structure initialized");
}

/**
 * ディレクトリを再帰的に処理し、_index.scssファイルを生成
 * @param {string} dirPath - 処理するディレクトリのパス
 */
async function processDir(dirPath) {
  try {
    // sassルートディレクトリの場合は_index.scssを生成しない
    if (dirPath === SASS_ROOT) {
      return;
    }

    // ディレクトリ内のすべてのエントリを取得
    const entries = await readdir(dirPath, { withFileTypes: true });

    // サブディレクトリを取得
    const subDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    // サブディレクトリを先に処理（深さ優先）
    for (const subDir of subDirs) {
      await processDir(path.join(dirPath, subDir));
    }

    // パーシャルファイルを取得
    const partials = entries
      .filter(
        (entry) =>
          !entry.isDirectory() &&
          entry.name.startsWith("_") &&
          entry.name !== "_index.scss" &&
          entry.name.endsWith(".scss")
      )
      .map((entry) => entry.name.slice(0, -5)); // .scssを除去

    // 各サブディレクトリに_index.scssが存在するか確認
    const validSubDirs = [];
    for (const subDir of subDirs) {
      const subDirIndexPath = path.join(dirPath, subDir, "_index.scss");
      try {
        await access(subDirIndexPath, fs.constants.F_OK);
        validSubDirs.push(subDir);
      } catch (err) {
        // _index.scssが存在しないサブディレクトリはスキップ
      }
    }

    // パーシャルファイルまたは有効なサブディレクトリがある場合は_index.scssを作成/更新
    if (partials.length > 0 || validSubDirs.length > 0) {
      const indexPath = path.join(dirPath, "_index.scss");

      // _index.scss内容を生成
      let indexContent = `// このファイルは自動生成されています。直接編集しないでください。
// ${path.relative(
        SASS_ROOT,
        dirPath
      )}ディレクトリのパーシャルとサブディレクトリ\n`;

      // パーシャルファイルの@forward
      if (partials.length > 0) {
        indexContent += "\n// パーシャルファイル\n";
        indexContent += partials
          .map((partial) => `@forward "${partial.substring(1)}";`)
          .join("\n");
      }

      // サブディレクトリの@forward
      if (validSubDirs.length > 0) {
        indexContent += "\n\n// サブディレクトリ\n";
        indexContent += validSubDirs
          .map((subDir) => `@forward "${subDir}";`)
          .join("\n");
      }

      // _index.scssファイルを書き込み
      await writeFile(indexPath, indexContent, "utf8");
      logger.debug(`Created/Updated _index.scss in ${dirPath}`);
    }
  } catch (error) {
    logger.error(`Error processing directory ${dirPath}: ${error}`);
  }
}

/**
 * メインのstyle.scssファイルを更新
 */
async function updateMainStyleScss() {
  const styleScssPath = path.join(SASS_ROOT, "style.scss");

  try {
    // style.scssが存在しない場合は作成
    try {
      await access(styleScssPath, fs.constants.F_OK);
    } catch (err) {
      // ディレクトリが存在することを確認
      await mkdir(path.dirname(styleScssPath), { recursive: true });

      // 空のstyle.scssを作成
      await writeFile(styleScssPath, "", "utf8");
    }

    // 直下のディレクトリを取得
    const entries = await readdir(SASS_ROOT, { withFileTypes: true });
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    // 各ディレクトリの_index.scssをインポート
    const imports = [];

    for (const dir of directories) {
      const indexPath = path.join(SASS_ROOT, dir, "_index.scss");
      try {
        await access(indexPath, fs.constants.F_OK);
        imports.push(`@use "${dir}";`);
      } catch (err) {
        // _index.scssが存在しない場合はスキップ
      }
    }

    // 直下のパーシャルファイルも含める
    const rootPartials = entries
      .filter(
        (entry) =>
          !entry.isDirectory() &&
          entry.name.startsWith("_") &&
          entry.name !== "_index.scss" &&
          entry.name !== "style.scss" &&
          entry.name.endsWith(".scss")
      )
      .map((entry) => `@use "${entry.name.slice(1, -5)}";`);

    imports.push(...rootPartials);

    // style.scssの内容を更新
    const styleContent = `// このファイルは自動生成されています。直接編集しないでください。
// SCSSモジュールのインポート
${imports.join("\n")}`;

    await writeFile(styleScssPath, styleContent, "utf8");
    logger.debug("Updated main style.scss with all modules");
  } catch (error) {
    logger.error(`Error updating style.scss: ${error}`);
  }
}

export default autoForwardScssFiles;
