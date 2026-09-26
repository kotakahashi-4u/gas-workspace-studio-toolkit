/**
 * =========================================================
 * DriveEx: 1. ファイル移動アクション
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
    "",
    [
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "file_id", 
        title: "移動するアイテム*",
        hint: "前のステップの ID またはリンク変数を選択します", 
        itemTypes: [] // すべてのアイテムを許可
      },
      { 
        type: StudioWrapper.DRIVE_PICKER,
        id: "folder_id", 
        title: "移動先フォルダ*",
        hint: "ドライブから場所を選択するか、前のステップの ID またはリンク変数を選択します", 
        itemTypes: [StudioWrapper.PICKER_FOLDERS]
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
    // 1. イベントオブジェクトから入力値（ID）を取得
    const itemId = e.workflow.actionInvocation.inputs["file_id"].stringValues[0];
    const folderId = e.workflow.actionInvocation.inputs["folder_id"].stringValues[0];
    
    if (!itemId || !folderId) {
      throw new Error("アイテムまたはフォルダが選択されていません。");
    }

    // 2. DriveAppを使用して対象アイテムと移動先フォルダを取得
    const item = getDriveItem(itemId);
    const destFolder = DriveApp.getFolderById(folderId);
    const itemName = item.getName();
    const folderUrl = destFolder.getUrl();
    
    // 3. アイテムを指定フォルダへ移動
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

  // 4. StudioWrapperを使用して、結果文字列とログ設定をマッピングして返却
  return StudioWrapper.buildExecuteResponse({ 
    "result_status": resultMessage 
  }, logConfig);
}


/**
 * =========================================================
 * DriveEx: 2. ルート直下判定アクション
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
    "",
    [
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "item_id", 
        title: "判定対象のアイテムを選択", 
        itemTypes: []
      },
      { 
        type: StudioWrapper.DRIVE_PICKER,
        id: "root_folder_id", 
        title: "ルートフォルダの場所", 
        itemTypes: [StudioWrapper.PICKER_FOLDERS]
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
    // 1. 入力値の取得
    const itemId = e.workflow.actionInvocation.inputs["item_id"].stringValues[0];
    const rootFolderId = e.workflow.actionInvocation.inputs["root_folder_id"].stringValues[0];

    if (!itemId || !rootFolderId) {
      throw new Error(`アイテムまたはルートフォルダが選択されていません。`);
    }

    // 2. 判定対象アイテムを取得
    const item = getDriveItem(itemId); 
    const itemName = item.getName();
    const itemUrl = item.getUrl();
    
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
 * DriveEx: 3. PDF分割アクション
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
    "",
    [
      { 
        type: StudioWrapper.DRIVE_PICKER,
        id: "split_file_id", 
        title: "分割対象のPDFファイル", 
        itemTypes: [StudioWrapper.PICKER_PDFS]
      },
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "chunk_size", 
        title: "分割するページ数 (固定値のみ)", 
        hint: "例: 10 （※変数は使用できません）",
        includeVariables: false // 変数マッピングを禁止
      },
      { 
        type: StudioWrapper.DRIVE_PICKER,
        id: "dest_folder_id", 
        title: "分割後の保存先フォルダの場所", 
        itemTypes: [StudioWrapper.PICKER_FOLDERS]
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
    const fileId = e.workflow.actionInvocation.inputs["split_file_id"].stringValues[0];
    const chunkSizeStr = e.workflow.actionInvocation.inputs["chunk_size"].stringValues[0];
    const folderId = e.workflow.actionInvocation.inputs["dest_folder_id"].stringValues[0];

    const chunkSize = parseInt(chunkSizeStr, 10);

    if (!fileId || !folderId || isNaN(chunkSize)) {
      throw new Error("ファイル、フォルダ、またはページ数の指定が正しくありません。");
    }

    const file = DriveApp.getFileById(fileId);
    const destFolder = DriveApp.getFolderById(folderId);
    const originalName = file.getName();
    const folderUrl = destFolder.getUrl();

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
  return StudioWrapper.buildExecuteResponse({ 
    "created_file_urls": createdUrls 
  }, logConfig);
}


/**
 * =========================================================
 * SheetsEx: JSONデータから行を追加するアクション (Sheets拡張 - 動的UI版)
 * =========================================================
 * このプロジェクトは、Workspace Studioのカスタムステップとして機能し、
 * 指定されたJSON配列のキーとスプレッドシートのヘッダー行を自動的に照合して
 * データを指定位置へ書き込むための高度な拡張アクションを提供します。
 */

/**
 * 1. 初回ロード（またはリロード）時にWorkspace Studioから呼び出される設定画面構築関数。
 * マニフェストファイルの "onConfigFunction": "onAppendRowsConfig" に対応します。
 * 
 * 過去に保存された設定値が存在する場合は、それを取得して
 * 自動的にスプレッドシートへアクセスし、対象シート名のドロップダウンリストを復元します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 構築された設定画面のカードレスポンス(push_card)
 */
function onAppendRowsConfig(e) {
  let sheetOptions = [
    { text: "先にスプレッドシートを選択してください", value: "", selected: true }
  ];
  let savedSheetName = "";

  try {
    // 画面リロード時等にWorkspace Studioから渡される正しいデータパス(elementConfiguration)から
    // 過去に保存されたIDとシート名を安全に抽出する
    const savedId = e?.formInput?.spreadsheet_id || 
                     e?.workflow?.elementConfiguration?.inputs?.spreadsheet_id?.stringValues?.[0] ||
                     null;
                     
    savedSheetName = e?.formInput?.sheet_name || 
                     e?.workflow?.elementConfiguration?.inputs?.sheet_name?.stringValues?.[0] ||
                     "";

    // 保存されているIDが存在する場合は、スプレッドシートへアクセスしシート一覧を取得する
    if (savedId) {
      const ss = SpreadsheetApp.openById(savedId);
      const sheets = ss.getSheets();
      
      // 取得したシート一覧をドロップダウン用のオプション配列(text, value, selected)にマッピング
      sheetOptions = sheets.map(sheet => {
        const name = sheet.getName();
        return {
          text: name,
          value: name,
          // 過去に保存されたシート名と一致するものを初期選択状態にする
          selected: savedSheetName ? (name === savedSheetName) : false
        };
      });
      
      // フェールセーフ：保存されていたシート名が削除等で一覧に存在しなかった場合は、強制的に1枚目を選択
      if (!sheetOptions.some(opt => opt.selected)) {
        sheetOptions[0].selected = true;
      }
    }
  } catch (error) {
    // 権限エラー等でシートが取得できなかった場合は、エラーメッセージをドロップダウンに表示
    sheetOptions = [
      { text: `エラー: ${error.message}`, value: "", selected: true }
    ];
  }

  // 共通のカード構築ロジックへオプション配列を渡し、新規追加(isUpdate=false)として描画
  return buildDynamicCard(sheetOptions, false);
}

/**
 * 2. 入力欄から値が変更された時 (onChangeAction) に呼び出されるコールバック関数。
 * ユーザーがPickerで新しいファイルを選択した際に、動的にシート一覧を取得してUIを再描画します。
 * 
 * @param {Object} e - フォーム入力値(e.formInput)を含むイベントオブジェクト
 * @returns {Object} 構築された設定画面のカードレスポンス(update_card)
 */
function onUrlChange(e) {
  let newSheetOptions = [];
  
  try {
    // フォーム入力値からIDを取得
    const ssId = e.formInput ? e.formInput.spreadsheet_id : null;
    if (!ssId) throw new Error("スプレッドシートが選択されていません");

    const ss = SpreadsheetApp.openById(ssId);
    const sheets = ss.getSheets();

    // 取得したシート一覧をドロップダウン用オプションに変換（onChange時は常に1枚目をデフォルト選択）
    newSheetOptions = sheets.map((sheet, index) => ({
      text: sheet.getName(),
      value: sheet.getName(),
      selected: index === 0
    }));

  } catch (error) {
    newSheetOptions = [
      { text: `エラー: ${error.message}`, value: "", selected: true }
    ];
  }

  // 共通のカード構築ロジックへオプション配列を渡し、カード更新(isUpdate=true)として再描画
  return buildDynamicCard(newSheetOptions, true);
}


/**
 * [ヘルパー関数] 設定画面のカードUI構造を構築します。
 * 初回表示時(onAppendRowsConfig)と動的更新時(onUrlChange)で同一のUIを保証するために共通化しています。
 * 
 * @param {Array<Object>} sheetOptions - 対象シート名のドロップダウンに表示する選択肢の配列
 * @param {boolean} isUpdate - カードを更新(update_card)するか新規追加(push_card)するかのフラグ
 * @returns {Object} StudioWrapperを通じて構築されたアクションレスポンス
 */
function buildDynamicCard(sheetOptions, isUpdate) {
  return StudioWrapper.buildConfigCard(
    "",
    [
      { 
        type: StudioWrapper.DRIVE_PICKER,
        id: "spreadsheet_id", 
        title: "対象のスプレッドシートを選択", 
        itemTypes: [StudioWrapper.PICKER_SPREADSHEETS],
        onChangeAction: "onUrlChange", // 値の変更を検知してUIを再描画するためのトリガー 
      },
      { 
        type: StudioWrapper.SELECTION,
        id: "sheet_name", 
        title: "対象シート名", 
        selectionType: StudioWrapper.DROPDOWN,
        options: sheetOptions,
        includeVariables: false 
      },
      { 
        type: StudioWrapper.SELECTION,
        id: "insert_position", 
        title: "行を追加",
        selectionType: StudioWrapper.DROPDOWN,
        options: [
          { text: "最後のデータ行の後", value: "after_last", selected: true },
          { text: "最初の行の後", value: "after_first" }
        ],
        includeVariables: false 
      },
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "json_data", 
        title: "追加するデータ (JSON配列)", 
        hint: '例: [{"お名前": "山田", "年齢": 30}]',
        multiline: true
      }
    ],
    isUpdate 
  );
}

/**
 * Workspace Studioから呼び出され、実際にJSON配列をパースしてシートにデータを追加します。
 * マニフェストファイルの "onExecuteFunction": "onAppendRowsExecute" に対応します。
 * 
 * 複数のフローから同時に呼び出された場合でもデータが上書きされないよう、
 * LockServiceを用いた厳密な排他制御（キューイング）を実装しています。
 * 
 * @param {Object} e - 入力値(inputs)を含むイベントオブジェクト
 * @returns {Object} 処理結果メッセージ(result_status)を格納したレスポンス
 */
function onAppendRowsExecute(e) {
  let resultMessage = "";
  let logConfig = {}; // 実行履歴へのログ出力設定用オブジェクト

  try {
    // 1. 入力値の受け取り
    // UI側の不整合等で値が未定義(undefined)の場合のクラッシュを防ぐため、オプショナルチェーニングを適用
    const inputs = e.workflow.actionInvocation.inputs || {};
    const ssId = inputs["spreadsheet_id"]?.stringValues?.[0];
    const sheetName = inputs["sheet_name"]?.stringValues?.[0];
    const insertPosition = inputs["insert_position"]?.stringValues?.[0] || "after_last";
    const jsonString = inputs["json_data"]?.stringValues?.[0];

    // 必須項目の入力チェック
    if (!ssId) throw new Error("スプレッドシートが選択されていません。");
    if (!sheetName) throw new Error("対象シート名が入力されていません。");
    if (!jsonString) throw new Error("追加するJSONデータが入力されていません。");

    // スプレッドシートと対象シートのオブジェクトを取得
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`シート「${sheetName}」が見つかりません。`);

    const spreadsheetUrl = ss.getUrl();

    // 2. JSONデータのパースと検証
    let jsonData = [];
    try {
      jsonData = JSON.parse(jsonString);
      // Workspace Studioから単一のJSONオブジェクトが渡された場合でも処理できるよう配列にラップする
      if (!Array.isArray(jsonData)) {
        jsonData = [jsonData];
      }
    } catch (parseError) {
      throw new Error(`JSONの形式が正しくありません: ${parseError.message}`);
    }
    
    if (jsonData.length === 0) {
      throw new Error("追加するデータ（JSON配列）が空です。");
    }

    // 3. 1行目（ヘッダー）の取得とマッピング用辞書の作成
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) throw new Error("シートにヘッダー行（1行目）が設定されていません。");
    
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const headerMap = {};
    headers.forEach((header, index) => {
      // 空白列を除外して、「ヘッダー名」をキー、「列インデックス」を値とする辞書を作成
      if (header !== "") headerMap[String(header).trim()] = index;
    });

    // 4. JSONデータからスプレッドシート書き込み用の2次元配列を構築
    const dataToInsert = [];
    jsonData.forEach(obj => {
      // シートの全列幅と同じサイズの空配列(1行分)を初期化
      const row = new Array(headers.length).fill("");
      
      // JSONオブジェクトのキーを走査し、ヘッダーに存在するキーであれば対応する列インデックスに値をセット
      for (const key in obj) {
        if (headerMap.hasOwnProperty(key)) {
          row[headerMap[key]] = obj[key];
        }
      }
      dataToInsert.push(row);
    });

    const numRowsToInsert = dataToInsert.length;
    const numColsToInsert = headers.length;

    // ========================================================
    // 5. 排他制御（LockService）を用いた安全なデータ書き込み
    // ========================================================
    const lock = LockService.getScriptLock();
    try {
      // 競合を防ぐためスクリプトの実行をロック。他プロセスが実行中の場合は最大30秒待機する。
      lock.waitLock(30000);

      // 書き込み位置の分岐
      if (insertPosition === "after_first") {
        // 先頭(ヘッダーの直後)に空行を挿入してから書き込む
        sheet.insertRowsAfter(1, numRowsToInsert);
        sheet.getRange(2, 1, numRowsToInsert, numColsToInsert).setValues(dataToInsert);
      } else {
        // 最新の最終行をロック獲得後に再取得し、その後ろに書き込む
        const latestLastRow = sheet.getLastRow();
        sheet.getRange(latestLastRow + 1, 1, numRowsToInsert, numColsToInsert).setValues(dataToInsert);
      }

      // スプレッドシートへの変更を強制的に反映（確定）させる。
      // これにより、ロック解除直後に別プロセスが古い最終行を読み取るのを防ぐ。
      SpreadsheetApp.flush();

    } catch (lockError) {
      throw new Error(`同時処理が集中したため書き込みに失敗しました（タイムアウト）`);
    } finally {
      // 処理の成否に関わらず、必ずロックを解放する
      lock.releaseLock();
    }

    resultMessage = `【成功】${numRowsToInsert}件のデータを追加しました。`;

    // 成功時のログ出力設定
    logConfig = {
      isError: false,
      message: `${numRowsToInsert}行のデータを追加しました。`,
      chip: {
        label: `シート「${sheetName}」を開く`,
        url: spreadsheetUrl,
        icon: StudioWrapper.ICON_SHEETS
      }
    };

  } catch (error) {
    resultMessage = `【エラー】${error.message}`;

    // エラー時のログ出力設定
    logConfig = {
      isError: true,
      message: `行の追加に失敗しました: ${error.message}`,
      chip: {
        label: "エラーの詳細",
        icon: StudioWrapper.ICON_ERROR
      }
    };
  }

  // 6. 処理結果とログ設定をStudioWrapperに渡して返却
  return StudioWrapper.buildExecuteResponse({ 
    "result_status": resultMessage 
  }, logConfig);
}

/**
 * =========================================================
 * DocsEx: JSONデータから書類を生成するアクション (Docs拡張 - 差し込み印刷)
 * =========================================================
 */

/**
 * Workspace Studioのフロー設定画面（差し込み印刷アクション用）を構築します。
 * 
 * @returns {Object} StudioWrapperで構築された設定画面のカードレスポンス
 */
function onMailMergeConfig() {
  return StudioWrapper.buildConfigCard(
    "",
    [
      { 
        type: StudioWrapper.DRIVE_PICKER,
        id: "template_id", 
        title: "テンプレートのGoogleドキュメント", 
        itemTypes: [StudioWrapper.PICKER_DOCUMENTS]
      },
      { 
        type: StudioWrapper.DRIVE_PICKER,
        id: "dest_folder_id", 
        title: "保存先フォルダの場所", 
        itemTypes: [StudioWrapper.PICKER_FOLDERS]
      },
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "json_data", 
        title: "差し込みデータ (JSON配列)", 
        hint: '例: [{"会社名": "A社", "金額": 100}, {"会社名": "B社", "金額": 200}]',
        multiline: true
      },
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "output_filename", 
        title: "出力ファイル名", 
        hint: "例: 請求書一括出力_202610（※拡張子は不要です）" 
      },
      { 
        type: StudioWrapper.SELECTION,
        id: "export_format", 
        title: "出力フォーマット",
        selectionType: StudioWrapper.DROPDOWN,
        options: [
          { text: "PDFとして出力する", value: "pdf", selected: true },
          { text: "Googleドキュメントとして出力する", value: "doc" }
        ],
        includeVariables: false 
      }
    ]
  );
}

/**
 * Workspace Studioから呼び出され、JSON配列をもとにテンプレートのプレースホルダーを置換し、
 * 単一のファイル（ページ区切り）としてPDFまたはドキュメントを生成します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 処理結果（ファイルURL）とアクティビティログを格納したレスポンス
 */
function onMailMergeExecute(e) {
  let createdFileUrl = "";
  let logConfig = null;

  try {
    // 1. 入力値の受け取り
    const inputs = e.workflow.actionInvocation.inputs || {};
    const templateId = inputs["template_id"]?.stringValues?.[0];
    const destFolderId = inputs["dest_folder_id"]?.stringValues?.[0];
    const jsonString = inputs["json_data"]?.stringValues?.[0];
    const outputFilename = inputs["output_filename"]?.stringValues?.[0] || "自動生成ドキュメント";
    const exportFormat = inputs["export_format"]?.stringValues?.[0] || "pdf";

    if (!templateId || !destFolderId || !jsonString) {
      throw new Error("テンプレート、保存先フォルダ、JSONデータのいずれかが不足しています。");
    }

    // 2. JSONデータのパースと検証
    let jsonData = [];
    try {
      jsonData = JSON.parse(jsonString);
      if (!Array.isArray(jsonData)) jsonData = [jsonData];
    } catch (parseError) {
      throw new Error(`JSONの形式が正しくありません: ${parseError.message}`);
    }

    if (jsonData.length === 0) throw new Error("処理するデータが空です。");

    // 3. ドキュメントとフォルダの取得
    const templateDoc = DocumentApp.openById(templateId);
    const templateBody = templateDoc.getBody();
    const templateElements = templateBody.getNumChildren();
    const destFolder = DriveApp.getFolderById(destFolderId);

    // 4. 結合用の一時ドキュメントを作成
    const tempDoc = DocumentApp.create(`【一時ファイル】${outputFilename}`);
    const tempDocId = tempDoc.getId();
    const tempBody = tempDoc.getBody();
    
    let isFirstPage = true;

    // 5. データ行ごとにループして差し込み印刷を実行
    for (let i = 0; i < jsonData.length; i++) {
      const rowObj = jsonData[i];
      
      // 2件目以降は改ページを挿入
      if (!isFirstPage) {
        tempBody.appendPageBreak();
      }
      isFirstPage = false;
      
      // テンプレートの各要素をコピーして一時ドキュメントに追加
      for (let j = 0; j < templateElements; j++) {
        const element = templateBody.getChild(j).copy();
        const type = element.getType();
        let appendedElement = null;
        
        if (type === DocumentApp.ElementType.PARAGRAPH) {
          appendedElement = tempBody.appendParagraph(element);
        } else if (type === DocumentApp.ElementType.TABLE) {
          appendedElement = tempBody.appendTable(element);
        } else if (type === DocumentApp.ElementType.LIST_ITEM) {
          appendedElement = tempBody.appendListItem(element);
        } else if (type === DocumentApp.ElementType.HORIZONTAL_RULE) {
          tempBody.appendHorizontalRule(element);
        }
        
        // 追加した要素内のプレースホルダー（{{キー名}}）をJSONの値で置換
        if (appendedElement && appendedElement.replaceText) {
          for (const key in rowObj) {
            let value = rowObj[key];
            if (value === null || value === undefined) value = "";
            
            const placeholder = `{{${key}}}`;
            appendedElement.replaceText(placeholder, String(value));
          }
        }
      }
    }

    // 初期空行（1行目）を削除
    const firstChild = tempBody.getChild(0);
    if (firstChild.getType() === DocumentApp.ElementType.PARAGRAPH && firstChild.getText() === '') {
      tempBody.removeChild(firstChild);
    }
    
    // 一時ドキュメントの変更を確定
    tempDoc.saveAndClose();
    const tempFile = DriveApp.getFileById(tempDocId);

    // 6. 出力形式に応じた保存処理
    let finalFile;
    if (exportFormat === "pdf") {
      // PDFとして保存
      const pdfBlob = tempFile.getAs('application/pdf');
      finalFile = destFolder.createFile(pdfBlob).setName(`${outputFilename}.pdf`);
      // 一時ドキュメントをゴミ箱へ
      tempFile.setTrashed(true);
    } else {
      // ドキュメントとして指定フォルダへ移動してリネーム
      tempFile.moveTo(destFolder);
      tempFile.setName(outputFilename);
      finalFile = tempFile;
    }

    createdFileUrl = finalFile.getUrl();

    // 成功時のログ出力設定
    const isPdf = exportFormat === "pdf";
    logConfig = {
      isError: false,
      message: `${jsonData.length}件のデータを差し込み、「${finalFile.getName()}」を作成しました。`,
      chip: {
        label: "作成したファイルを開く",
        url: createdFileUrl,
        icon: isPdf ? StudioWrapper.ICON_PDF : StudioWrapper.ICON_DOCS
      }
    };

  } catch (error) {
    // エラー時のログ出力設定
    logConfig = {
      isError: true,
      message: `書類の生成に失敗しました: ${error.message}`,
      chip: {
        label: "エラーの詳細",
        icon: StudioWrapper.ICON_ERROR
      }
    };
  }

  // 7. StudioWrapperを使用して出力URLとログを返却
  return StudioWrapper.buildExecuteResponse({ 
    "created_file_url": createdFileUrl 
  }, logConfig);
}

/**
 * =========================================================
 * 共通ヘルパー関数
 * =========================================================
 */

/**
 * URL文字列、またはPickerから渡されたID文字列から、Google Driveの一意のIDを安全に抽出します。
 * 
 * @param {string} input - 抽出対象の文字列（URL または ID）
 * @returns {string|null} 抽出されたDrive ID。無効な形式の場合はnullを返します。
 */
function extractDriveId(input) {
  if (!input) return null;
  // 15文字以上の英数字、ハイフン、アンダースコアの連続をIDとして抽出
  // ※URLが渡された場合も、生のIDが渡された場合も正しくマッチします
  const match = input.match(/[-\w]{15,}/);
  return match ? match[0] : null;
}

/**
 * 指定されたURLまたはIDから、ファイルまたはフォルダのオブジェクトを自動判別して取得します。
 * 
 * @param {string} input - Google DriveのアイテムID または URL
 * @returns {GoogleAppsScript.Drive.File | GoogleAppsScript.Drive.Folder} 取得したアイテムオブジェクト
 * @throws {Error} IDが存在しない、抽出できない、またはアクセス権限がない場合にエラーをスローします。
 */
function getDriveItem(input) {
  const id = extractDriveId(input);
  if (!id) {
    throw new Error("有効なGoogle DriveのIDまたはURLを抽出できませんでした。");
  }

  try {
    // まずファイルとして取得を試みる
    return DriveApp.getFileById(id);
  } catch (e) {
    // ファイル取得に失敗した場合はフォルダであるとみなし、フォルダとして取得する
    return DriveApp.getFolderById(id);
  }
}