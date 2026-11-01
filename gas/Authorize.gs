// Google Driveへのアクセス許可(初回のみ・手動)を付与するための入口。
// Sheets.gsは容量が大きく、Apps Scriptエディタの関数一覧が読み込めない
// (「関数なし」と表示される)ことがあるため、この小さな別ファイルから
// getBizPlanDriveRootFolder_() を呼び出せるようにしている。
// 使い方: このファイルを開いた状態で、関数選択から authorizeDriveAccess を選び「実行」。
// 初回は承認画面が出るので許可する。ログに「Drive access OK」と出れば完了。
function authorizeDriveAccess() {
  getBizPlanDriveRootFolder_();
  Logger.log("Drive access OK");
}
