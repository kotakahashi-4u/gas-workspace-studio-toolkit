/**
 * =========================================================
 * 1. ファイル移動アクション
 * =========================================================
 */

/**
 * Workspace Studioのフロー設定画面（アイテム移動アクション用）を構築します。
 * マニフェストファイルの "onConfigFunction": "onWorkflowConfig" に対応します。
 * 
 * @returns {GoogleAppsScript.Card_Service.ActionResponse} 構築された設定画面のカードレスポンス
 */
function onWorkflowConfig() {
  return StudioWrapper.buildConfigCard(
    "アイテム移動設定",
    [
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "file_url", 
        title: "移動するアイテム(ファイル/フォルダ)のリンク", 
        hint: "例: https://docs.google.com/... や https://drive.google.com/drive/folders/..." 
      },
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "folder_url", 
        title: "移動先のフォルダのリンク (URL)", 
        hint: "例: https://drive.google.com/drive/folders/..." 
      }
    ]
  );
}

/**
 * Workspace Studioから呼び出され、実際のアイテム移動処理を実行します。
 * マニフェストファイルの "onExecuteFunction": "onWorkflowExecute" に対応します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} AddOnsResponseServiceを用いた実行結果とアクティビティログのレスポンス
 */
function onWorkflowExecute(e) {
  let resultMessage = "";
  let logConfig = null; // 実行履歴へのログ出力設定用オブジェクト

  try {
    // 1. イベントオブジェクトから入力値（URL文字列）を取得
    const itemUrl = e.workflow.actionInvocation.inputs["file_url"].stringValues[0];
    const folderUrl = e.workflow.actionInvocation.inputs["folder_url"].stringValues[0];
    
    // 2. URLからDrive IDを抽出
    const itemId = extractDriveId(itemUrl);
    const folderId = extractDriveId(folderUrl);

    if (!itemId || !folderId) {
      throw new Error("URLからIDを抽出できませんでした。");
    }

    // 3. DriveAppを使用して対象アイテムと移動先フォルダを取得
    const item = getDriveItem(itemId);
    const destFolder = DriveApp.getFolderById(folderId);
    const itemName = item.getName();
    
    // 4. アイテムを指定フォルダへ移動
    item.moveTo(destFolder);

    resultMessage = `【成功】アイテムを指定フォルダに移動しました`;
    
    // 成功時のログ出力設定（移動先のフォルダへのリンクチップを付与）
    logConfig = {
      isError: false,
      message: `アイテム「${itemName}」を指定のフォルダに移動しました。`,
      chip: {
        label: "移動先フォルダを開く",
        url: folderUrl,
        icon: StudioWrapper.ICON_FOLDER
      }
    };

  } catch (error) {
    resultMessage = `【エラー】${error.message}`;
    
    // エラー時のログ出力設定
    logConfig = {
      isError: true,
      message: `アイテムの移動に失敗しました: ${error.message}`,
      chip: {
        label: "エラーの詳細",
        icon: StudioWrapper.ICON_ERROR
      }
    };
  }

  // 5. StudioWrapperを使用して、結果文字列とログ設定をマッピングして返却
  return StudioWrapper.buildExecuteResponse({ 
    "result_status": resultMessage 
  }, logConfig);
}


/**
 * =========================================================
 * 2. ルート直下判定アクション
 * =========================================================
 */

/**
 * Workspace Studioのフロー設定画面（ルート直下判定アクション用）を構築します。
 * マニフェストファイルの "onConfigFunction": "onCheckRootConfig" に対応します。
 * 
 * @returns {GoogleAppsScript.Card_Service.ActionResponse} 構築された設定画面のカードレスポンス
 */
function onCheckRootConfig() {
  return StudioWrapper.buildConfigCard(
    "ルート直下判定設定",
    [
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "item_url", 
        title: "判定対象のアイテムリンク (URL)", 
        hint: "例: https://docs.google.com/... や https://drive.google.com/drive/folders/..." 
      },
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "root_folder_url", 
        title: "ルートフォルダのリンク (URL)", 
        hint: "例: https://drive.google.com/drive/folders/..." 
      }
    ]
  );
}

/**
 * Workspace Studioから呼び出され、アイテムが指定フォルダの直下にあるかを判定します。
 * マニフェストファイルの "onExecuteFunction": "onCheckRootExecute" に対応します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 判定結果（true/false）とアクティビティログを格納したレスポンス
 */
function onCheckRootExecute(e) {
  // デフォルトは直下ではない（false）として初期化
  let isChild = false;
  let logConfig = null; // 実行履歴へのログ出力設定用オブジェクト

  try {
    // 1. 入力値の取得とIDの抽出
    const itemUrl = e.workflow.actionInvocation.inputs["item_url"].stringValues[0];
    const rootFolderUrl = e.workflow.actionInvocation.inputs["root_folder_url"].stringValues[0];

    const itemId = extractDriveId(itemUrl);
    const rootFolderId = extractDriveId(rootFolderUrl);

    if (!itemId || !rootFolderId) {
      throw new Error(`URLからIDを抽出できませんでした。itemUrl: ${itemUrl}, rootFolderUrl: ${rootFolderUrl}`);
    }

    // 2. 判定対象アイテムを取得
    const item = getDriveItem(itemId); 
    const itemName = item.getName();
    
    // 3. アイテムの親フォルダ一覧（通常は1つですが複数存在するケースも考慮）を取得
    const parents = item.getParents();
    
    // 4. 親フォルダの中に指定したルートフォルダのIDが含まれているかを反復してチェック
    while (parents.hasNext()) {
      const parent = parents.next();
      if (parent.getId() === rootFolderId) {
        // 一致した場合、対象アイテムは指定ルートフォルダの直下にあると判定
        isChild = true;
        break;
      }
    }

    // 成功時のログ出力設定（対象アイテムへのリンクチップを付与）
    logConfig = {
      isError: false,
      message: `「${itemName}」は指定ルートフォルダの直下に${isChild ? "存在します" : "存在しません"}。`,
      chip: {
        label: "対象アイテムを確認",
        url: itemUrl,
        icon: StudioWrapper.ICON_FILE
      }
    };

  } catch (error) {
    isChild = false; 
    
    // エラー時のログ出力設定
    logConfig = {
      isError: true,
      message: `判定処理に失敗しました: ${error.message}`,
      chip: {
        label: "エラーの詳細",
        icon: StudioWrapper.ICON_ERROR
      }
    };
  }

  // 5. StudioWrapperを使用して、真偽値（Boolean）とログ設定をマッピングして返却
  return StudioWrapper.buildExecuteResponse({ 
    "is_direct_child": isChild 
  }, logConfig);
}


/**
 * =========================================================
 * 3. PDF分割アクション
 * =========================================================
 */

/**
 * Workspace Studioのフロー設定画面（PDF分割アクション用）を構築します。
 * マニフェストファイルの "onConfigFunction": "onSplitPdfConfig" に対応します。
 * 
 * @returns {GoogleAppsScript.Card_Service.ActionResponse} 構築された設定画面のカードレスポンス
 */
function onSplitPdfConfig() {
  return StudioWrapper.buildConfigCard(
    "PDF分割設定",
    [
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "split_file_url", 
        title: "分割対象のPDFファイルリンク", 
        hint: "例: https://drive.google.com/..." 
      },
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "chunk_size", 
        title: "分割するページ数 (固定値のみ)", 
        hint: "例: 10 （※変数は使用できません）",
        includeVariables: false // 変数マッピングを禁止
      },
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "dest_folder_url", 
        title: "分割後の保存先フォルダリンク", 
        hint: "例: https://drive.google.com/drive/folders/..." 
      }
    ]
  );
}

/**
 * Workspace Studioから呼び出され、PDFファイルを指定ページ数で分割する処理を実行します。
 * マニフェストファイルの "onExecuteFunction": "onSplitPdfExecute" に対応します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 分割されたPDFファイルのURLリスト（LIST形式）とアクティビティログを格納したレスポンス
 */
async function onSplitPdfExecute(e) {
  const createdUrls = []; // 分割後のURLを格納する配列（LIST返却用）
  let logConfig = null; // 実行履歴へのログ出力設定用オブジェクト

  try {
    // 1. 入力値の受け取り
    const fileUrl = e.workflow.actionInvocation.inputs["split_file_url"].stringValues[0];
    const chunkSizeStr = e.workflow.actionInvocation.inputs["chunk_size"].stringValues[0];
    const folderUrl = e.workflow.actionInvocation.inputs["dest_folder_url"].stringValues[0];

    const fileId = extractDriveId(fileUrl);
    const folderId = extractDriveId(folderUrl);
    const chunkSize = parseInt(chunkSizeStr, 10);

    if (!fileId || !folderId || isNaN(chunkSize)) {
      throw new Error("URLまたはページ数の指定が正しくありません。");
    }

    const file = DriveApp.getFileById(fileId);
    const destFolder = DriveApp.getFolderById(folderId);
    const originalName = file.getName();

    // 2. pdf-lib のロードと初期化
    globalThis.setTimeout = function(callback, delay) { callback(); };
    const url = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
    const pdfLibCode = UrlFetchApp.fetch(url).getContentText();
    eval(pdfLibCode);
    const { PDFDocument } = PDFLib;

    // 3. 元PDFの読み込み
    const fileBytes = new Uint8Array(file.getBlob().getBytes());
    const srcPdfDoc = await PDFDocument.load(fileBytes);
    const totalPages = srcPdfDoc.getPageCount();

    // 4. 分割処理ループ
    for (let i = 0; i < totalPages; i += chunkSize) {
      const newPdfDoc = await PDFDocument.create();
      
      const pageIndices = [];
      for (let j = i; j < i + chunkSize && j < totalPages; j++) {
        pageIndices.push(j);
      }
      
      const copiedPages = await newPdfDoc.copyPages(srcPdfDoc, pageIndices);
      copiedPages.forEach((page) => {
        newPdfDoc.addPage(page);
      });
      
      const newPdfBytes = await newPdfDoc.save();
      const partNumber = Math.floor(i / chunkSize) + 1;
      const newFileName = `分割_${partNumber}_${originalName}`;
      
      const newBlob = Utilities.newBlob(newPdfBytes, 'application/pdf', newFileName);
      const newFile = destFolder.createFile(newBlob);
      
      // 作成したファイルのURLを配列にPush
      createdUrls.push(newFile.getUrl());
    }

    // 成功時のログ出力設定（分割されたファイルを格納したフォルダへのリンクチップを付与）
    logConfig = {
      isError: false,
      message: `PDF「${originalName}」を ${createdUrls.length} 個のファイルに分割しました。`,
      chip: {
        label: "保存先フォルダを開く",
        url: folderUrl,
        icon: StudioWrapper.ICON_FOLDER
      }
    };

  } catch (error) {
    // エラー時のログ出力設定
    logConfig = {
      isError: true,
      message: `PDFの分割処理中にエラーが発生しました: ${error.message}`,
      chip: {
        label: "エラーの詳細",
        icon: StudioWrapper.ICON_ERROR
      }
    };
  }

  // 5. StudioWrapperを使用してURLの配列（LIST）とログ設定を返却
  // マニフェストで "cardinality": "MULTIPLE" としているため、この配列がそのままStudioのループに渡ります
  return StudioWrapper.buildExecuteResponse({ 
    "created_file_urls": createdUrls 
  }, logConfig);
}


/**
 * =========================================================
 * 共通ヘルパー関数
 * =========================================================
 */

/**
 * URL文字列からGoogle Driveの一意のIDを抽出するヘルパー関数です。
 * 共有ドライブ等の15文字以上の短いIDにも対応しています。
 * 
 * @param {string} url - 抽出対象のURL文字列
 * @returns {string|null} 抽出されたDrive ID。無効なURLの場合はnullを返します。
 */
function extractDriveId(url) {
  if (!url) return null;
  // 15文字以上の英数字、ハイフン、アンダースコアの連続をIDとして抽出
  const match = url.match(/[-\w]{15,}/);
  return match ? match[0] : null;
}

/**
 * 指定されたDrive IDから、ファイルまたはフォルダのオブジェクトを自動判別して取得します。
 * 
 * @param {string} id - Google DriveのアイテムID
 * @returns {GoogleAppsScript.Drive.File | GoogleAppsScript.Drive.Folder} 取得したアイテムオブジェクト
 * @throws {Error} IDが存在しない、またはアクセス権限がない場合にエラーをスローします。
 */
function getDriveItem(id) {
  try {
    // まずファイルとして取得を試みる
    return DriveApp.getFileById(id);
  } catch (e) {
    // ファイル取得に失敗した場合はフォルダであるとみなし、フォルダとして取得する
    return DriveApp.getFolderById(id);
  }
}