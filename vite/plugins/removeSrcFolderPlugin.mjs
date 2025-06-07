/**
 * srcフォルダの生成を防止するプラグイン
 * @returns {object} Viteプラグイン
 */
function removeSrcFolderPlugin() {
  return {
    name: "remove-src-folder-plugin",
    enforce: "post", // 他のプラグインの後に実行
    generateBundle(options, bundle) {
      // srcフォルダ内のファイルを削除
      const filesToDelete = [];

      for (const fileName in bundle) {
        if (fileName.startsWith("src/") || fileName.includes("/src/")) {
          filesToDelete.push(fileName);
        }
      }

      // 削除リストからファイルを削除
      filesToDelete.forEach((fileName) => {
        console.log(`Removing unnecessary file: ${fileName}`);
        delete bundle[fileName];
      });

      console.log(
        `Removed ${filesToDelete.length} unnecessary files from src folder`
      );
    },
  };
}

export default removeSrcFolderPlugin;
