"use strict";

document.addEventListener("DOMContentLoaded", function () {
  // .testクラスを持つ要素を取得
  const testElement = document.querySelector(".test");

  // 要素が存在するか確認
  if (testElement) {
    // 新しい画像要素を作成
    const newImage = document.createElement("img");

    // 画像のソースを設定（src/assets/images/からの相対パス）
    newImage.src = "/src/assets/images/common/merit1.webp";

    // 代替テキストを設定
    newImage.alt = "追加された画像";

    // スタイルを追加（必要に応じて）
    newImage.style.width = "200px";
    newImage.style.marginTop = "20px";

    // 画像を.test要素の後に挿入
    testElement.insertAdjacentElement("afterend", newImage);

    console.log("画像が追加されました");
  } else {
    console.error(".testクラスを持つ要素が見つかりませんでした");
  }
});
