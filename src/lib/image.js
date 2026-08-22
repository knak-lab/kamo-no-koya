// 選んだ画像ファイルを長辺maxDimension以下に縮小し、data URLとして返す。
// mimeTypeが"image/jpeg"ならJPEGとして(品質0.85)、それ以外はPNGとして再エンコードする
export function resizeToDataUrl(file, maxDimension) {
  const mimeType = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("画像として読み込めませんでした"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(mimeType, mimeType === "image/jpeg" ? 0.85 : undefined));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// 任意のファイルをそのままdata URLとして読み込む(リサイズなし。ドキュメント・写真添付用)
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
