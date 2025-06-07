/**
 * Viteプラグインの基本クラス
 */
export class BaseVitePlugin {
  /**
   * コンストラクタ
   * @param {string} name - プラグイン名
   */
  constructor(name) {
    this.name = name;
    this._context = null; // Rollupコンテキストを保存するためのプロパティ
  }

  /**
   * プラグインオブジェクトを生成
   * @returns {object} - Viteプラグインオブジェクト
   */
  createPlugin() {
    const plugin = {
      name: this.name,
    };

    // thisの参照を保持
    const self = this;

    // buildStartフックを追加
    if (this.buildStart) {
      plugin.buildStart = function (...args) {
        return self.buildStart.apply(self, args);
      };
    }

    // configureServerフックを追加
    if (this.configureServer) {
      plugin.configureServer = function (...args) {
        return self.configureServer.apply(self, args);
      };
    }

    // transformIndexHtmlフックを追加
    if (this.transformIndexHtml) {
      plugin.transformIndexHtml = function (...args) {
        return self.transformIndexHtml.apply(self, args);
      };
    }

    // generateBundleフックを追加
    if (this.generateBundle) {
      plugin.generateBundle = function (options, bundle, isWrite) {
        // Rollupコンテキストを保存
        self._context = this; // ここでthisはRollupプラグインコンテキスト
        return self.generateBundle.call(self, options, bundle, isWrite);
      };
    }

    // emitFileメソッドを追加
    plugin.emitFile = (emittedFile) => {
      if (this._context && this._context.emitFile) {
        return this._context.emitFile(emittedFile);
      } else {
        console.error(
          `Error: emitFile is not available in plugin ${this.name}`
        );
      }
    };

    // enforceプロパティを設定
    if (this.enforce) {
      plugin.enforce = this.enforce;
    }

    return plugin;
  }

  /**
   * ファイルを出力
   * @param {object} emittedFile - 出力するファイル情報
   */
  emitFile(emittedFile) {
    if (this._context && this._context.emitFile) {
      return this._context.emitFile(emittedFile);
    } else {
      console.error(`Error: emitFile is not available in plugin ${this.name}`);
    }
  }
}
