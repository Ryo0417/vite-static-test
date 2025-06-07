import autoForwardScssFiles from "./autoForwardScssFiles.mjs";
import watchAndConvertImages from "./watchAndConvertImages.mjs";
import scssEntryPlugin from "./scssEntryPlugin.mjs";
import staticHtmlServe from "./staticHtmlServe.mjs";
import copyImagesPlugin from "./copyImagesPlugin.mjs";
import copyHtmlPlugin from "./copyHtmlPlugin.mjs";
import transformHtmlPlugin from "./transformHtmlPlugin.mjs";
import removeSrcFolderPlugin from "./removeSrcFolderPlugin.mjs";
import copyScriptJsPlugin from "./copyScriptJsPlugin.mjs";
import copyCssPlugin from "./copyCssPlugin.mjs";

/**
 * 必要なプラグインのみをエクスポート
 */
export {
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
};
