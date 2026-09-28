/**
 * =========================================================
 * DriveEx: 1. ファイル移動アクション
 * =========================================================
 */

/**
 * [UI構築ヘルパー] 移動アクションの設定画面UIを構築します。
 * 初回表示とエラー時の再描画で共通利用します。
 * 
 * @param {string} [errorMessage=""] - エラー時に表示するメッセージ（HTMLタグ可）
 * @returns {Object} 構築されたカード配列
 */
function buildMoveFileConfigUI(errorMessage = "") {
  const inputs = [];
  
  if (errorMessage) {
    inputs.push({ type: StudioWrapper.TEXT_PARAGRAPH, text: errorMessage });
  }

  inputs.push(
    { 
      type: StudioWrapper.TEXT_INPUT,
      id: "file_id", 
      title: "移動するアイテム*",
      hint: "前のステップの ID またはリンク変数を選択します"
      // ※TEXT_INPUTのためマニフェストのrequired: trueによる自動検証(赤枠)が有効
    },
    { 
      type: StudioWrapper.DRIVE_PICKER,
      id: "folder_id", 
      title: "移動先フォルダ*", // マニフェスト検証が効かないため明示
      hint: "ドライブから場所を選択するか、前のステップの ID またはリンク変数を選択します", 
      itemTypes: [StudioWrapper.PICKER_FOLDERS]
    }
  );

  return StudioWrapper.buildConfigCard("", inputs);
}

/**
 * Workspace Studioのフロー設定画面（アイテム移動アクション用）を構築します。
 * マニフェストファイルの "onConfigFunction": "onMoveFileConfig" に対応します。
 * 
 * @returns {Object} 構築された設定画面のカードレスポンス
 */
function onMoveFileConfig() {
  // 初回表示時はエラーメッセージなしでUIを構築
  return buildMoveFileConfigUI();
}

/**
 * 保存時のサーバー側バリデーション処理。
 * マニフェストファイルの "onSaveFunction": "onMoveFileSave" に対応します。
 * DRIVE_PICKERの未選択エラーを補完し、安全な保存を保証します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 成功/失敗に応じたレスポンス
 */
function onMoveFileSave(e) {
  // 1. 万能パーサーで現在の入力値を取得
  const { folder_id } = StudioWrapper.parseInputs(e);

  // 2. DRIVE_PICKERの空欄チェック
  if (!folder_id) {
    // エラーメッセージを差し込んでUIを再構築し、CRITICALエラーとしてブロック
    const errorCard = buildMoveFileConfigUI("<font color=\"#FF0000\"><b>エラー:</b> 移動先フォルダを選択してください。</font>");
    return StudioWrapper.buildSaveError(errorCard);
  }

  // 3. 正常に入力されていれば保存を許可
  return StudioWrapper.buildSaveSuccess();
}

/**
 * Workspace Studioから呼び出され、実際のアイテム移動処理を実行します。
 * マニフェストファイルの "onExecuteFunction": "onMoveFileExecute" に対応します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} AddOnsResponseServiceを用いた実行結果とアクティビティログのレスポンス
 */
function onMoveFileExecute(e) {
  let resultMessage = "";
  let logConfig = null; // 実行履歴へのログ出力設定用オブジェクト

  try {
    // 1. イベントオブジェクトから入力値（ID）を取得
    const { file_id, folder_id } = StudioWrapper.parseInputs(e);
    
    if (!file_id || !folder_id) {
      throw new Error("アイテムまたはフォルダが選択されていません。");
    }

    // 2. DriveAppを使用して対象アイテムと移動先フォルダを取得（URL対応）
    const safeFolderId = extractDriveId(folder_id);
    if (!safeFolderId) throw new Error("移動先フォルダのIDを正しく抽出できませんでした。");

    const item = getDriveItem(file_id);
    const destFolder = DriveApp.getFolderById(safeFolderId);
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
    // GASのコンソールに詳細なエラーログを出力
    console.error(error.stack || error.message);

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
 * DriveEx: 2. 指定直下判定アクション
 * =========================================================
 */

/**
 * [UI構築ヘルパー] 指定直下判定アクションの設定画面UIを構築します。
 * 初回表示時およびバリデーションエラー時の再描画において共通利用されます。
 * 
 * @param {string} [errorMessage=""] - エラー時に表示するメッセージ（HTMLタグ使用可）
 * @returns {Object} StudioWrapperで構築されたカードレスポンス
 */
function buildCheckRootConfigUI(errorMessage = "") {
  const inputs = [];
  
  if (errorMessage) {
    inputs.push({ type: StudioWrapper.TEXT_PARAGRAPH, text: errorMessage });
  }

  inputs.push(
    { 
      type: StudioWrapper.TEXT_INPUT,
      id: "item_id", 
      title: "判定対象のアイテムを選択*", 
      itemTypes: []
    },
    { 
      type: StudioWrapper.DRIVE_PICKER,
      id: "root_folder_id", 
      title: "指定フォルダの場所*", 
      itemTypes: [StudioWrapper.PICKER_FOLDERS]
    }
  );

  return StudioWrapper.buildConfigCard("", inputs);
}

/**
 * Workspace Studioのフロー設定画面（指定直下判定アクション用）を構築します。
 * マニフェストファイルの "onConfigFunction": "onCheckRootConfig" に対応します。
 * 
 * @returns {Object} 構築された設定画面のカードレスポンス
 */
function onCheckRootConfig() {
  return buildCheckRootConfigUI();
}

/**
 * 保存時のサーバー側バリデーション処理。
 * マニフェストファイルの "onSaveFunction": "onCheckRootSave" に対応します。
 * DRIVE_PICKERウィジェットの未選択状態を検知し、安全なデータ保存を保証します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 検証結果に応じたレスポンス（成功時は保存許可、エラー時は画面再描画）
 */
function onCheckRootSave(e) {
  const { root_folder_id } = StudioWrapper.parseInputs(e);

  if (!root_folder_id) {
    const errorCard = buildCheckRootConfigUI("<font color=\"#FF0000\"><b>エラー:</b> 指定フォルダの場所を選択してください。</font>");
    return StudioWrapper.buildSaveError(errorCard);
  }

  return StudioWrapper.buildSaveSuccess();
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
    const { item_id, root_folder_id } = StudioWrapper.parseInputs(e);

    const safeRootFolderId = extractDriveId(root_folder_id);

    if (!item_id || !safeRootFolderId) {
      throw new Error(`アイテムまたは指定フォルダが正しく選択されていません。`);
    }

    // 2. 判定対象アイテムを取得
    const item = getDriveItem(item_id);
    const itemName = item.getName();
    const itemUrl = item.getUrl();
    
    // 3. アイテムの親フォルダ一覧（通常は1つですが複数存在するケースも考慮）を取得
    const parents = item.getParents();
    
    // 4. 親フォルダの中に指定したルートフォルダのIDが含まれているかを反復してチェック
    while (parents.hasNext()) {
      const parent = parents.next();
      if (parent.getId() === safeRootFolderId) {
        // 一致した場合、対象アイテムは指定ルートフォルダの直下にあると判定
        isChild = true;
        break;
      }
    }

    // 成功時のログ出力設定（対象アイテムへのリンクチップを付与）
    logConfig = {
      isError: false,
      message: `「${itemName}」は指定フォルダの直下に${isChild ? "存在します" : "存在しません"}。`,
      chip: {
        label: "対象アイテムを確認",
        url: itemUrl,
        icon: StudioWrapper.ICON_FILE
      }
    };

  } catch (error) {
    // GASのコンソールに詳細なエラーログを出力
    console.error(error.stack || error.message);

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
 * [UI構築ヘルパー] PDF分割アクションの設定画面UIを構築します。
 * 初回表示時およびバリデーションエラー時の再描画において共通利用されます。
 * 
 * @param {string} [errorMessage=""] - エラー時に表示するメッセージ（HTMLタグ使用可）
 * @returns {Object} StudioWrapperで構築されたカードレスポンス
 */
function buildSplitPdfConfigUI(errorMessage = "") {
  const inputs = [];
  
  if (errorMessage) {
    inputs.push({ type: StudioWrapper.TEXT_PARAGRAPH, text: errorMessage });
  }

  inputs.push(
    { 
      type: StudioWrapper.DRIVE_PICKER,
      id: "split_file_id", 
      title: "分割対象のPDFファイル*", 
      itemTypes: [StudioWrapper.PICKER_PDFS]
    },
    { 
      type: StudioWrapper.TEXT_INPUT,
      id: "chunk_size", 
      title: "分割するページ数 (固定値のみ)*", 
      hint: "例: 10 （※変数は使用できません）",
      validation: {
        characterLimit: 2,
        inputType: StudioWrapper.INPUT_TYPE_INTEGER
      },
      includeVariables: false
    },
    { 
      type: StudioWrapper.DRIVE_PICKER,
      id: "dest_folder_id", 
      title: "分割後の保存先フォルダの場所*", 
      itemTypes: [StudioWrapper.PICKER_FOLDERS]
    }
  );

  return StudioWrapper.buildConfigCard("", inputs);
}

/**
 * Workspace Studioのフロー設定画面（PDF分割アクション用）を構築します。
 * マニフェストファイルの "onConfigFunction": "onSplitPdfConfig" に対応します。
 * 
 * @returns {Object} 構築された設定画面のカードレスポンス
 */
function onSplitPdfConfig() {
  return buildSplitPdfConfigUI();
}

/**
 * 保存時のサーバー側バリデーション処理。
 * マニフェストファイルの "onSaveFunction": "onSplitPdfSave" に対応します。
 * 複数のDRIVE_PICKERウィジェットの未選択状態を検知し、安全なデータ保存を保証します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 検証結果に応じたレスポンス（成功時は保存許可、エラー時は画面再描画）
 */
function onSplitPdfSave(e) {
  const { split_file_id, dest_folder_id } = StudioWrapper.parseInputs(e);

  if (!split_file_id || !dest_folder_id) {
    const errorCard = buildSplitPdfConfigUI("<font color=\"#FF0000\"><b>エラー:</b> 分割対象のPDFファイルと、保存先フォルダの両方を選択してください。</font>");
    return StudioWrapper.buildSaveError(errorCard);
  }

  return StudioWrapper.buildSaveSuccess();
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
    const { split_file_id, chunk_size, dest_folder_id } = StudioWrapper.parseInputs(e);

    const chunkSize = parseInt(chunk_size, 10);

    if (!split_file_id || !dest_folder_id || isNaN(chunkSize)) {
      throw new Error("ファイル、フォルダ、またはページ数の指定が正しくありません。");
    }

    // URLが渡された場合でも安全に処理できるよう、ヘルパー関数でIDのみを抽出する
    const safeFileId = extractDriveId(split_file_id);
    const safeFolderId = extractDriveId(dest_folder_id);

    if (!safeFileId || !safeFolderId) {
      throw new Error("ファイルまたはフォルダのURLから正しいIDを抽出できませんでした。");
    }

    const file = DriveApp.getFileById(safeFileId);
    const destFolder = DriveApp.getFolderById(safeFolderId);
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
    // GASのコンソールに詳細なエラーログを出力
    console.error(error.stack || error.message);

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
 * [ヘルパー関数] イベントオブジェクトから設定値を抽出し、シート一覧のオプション配列を生成します。
 * Config初回表示、onChange更新、Save時のエラー再描画のすべてで共通利用されます。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Array<Object>} ドロップダウン用のオプション配列
 */
function getSheetOptions(e) {
  let sheetOptions = [
    { text: "先にスプレッドシートを選択してください", value: "", selected: true }
  ];
  let savedSheetName = "";

  try {
    // StudioWrapperの万能パーサーで、過去の保存値または現在の入力値から安全に抽出
    const { spreadsheet_id: savedId = null, sheet_name = "" } = StudioWrapper.parseInputs(e);
    savedSheetName = sheet_name;

    // スプレッドシートIDが存在する場合はアクセスしてシート一覧を取得（URL対応）
    const safeSavedId = extractDriveId(savedId);
    if (safeSavedId) {
      const ss = SpreadsheetApp.openById(safeSavedId);
      const sheets = ss.getSheets();
      
      sheetOptions = sheets.map((sheet, index) => {
        const name = sheet.getName();
        // 保存されたシート名がない（初回選択時など）場合は、自動的に1枚目を選択状態にする
        const isSelected = savedSheetName ? (name === savedSheetName) : (index === 0);
        return {
          text: name,
          value: name,
          selected: isSelected
        };
      });
      
      if (!sheetOptions.some(opt => opt.selected)) {
        sheetOptions[0].selected = true;
      }
    }
  } catch (error) {
    sheetOptions = [
      { text: `エラー: ${error.message}`, value: "", selected: true }
    ];
  }
  return sheetOptions;
}

/**
 * [UI構築ヘルパー] JSONデータ追加アクションの設定画面UI（入力フォーム配列）を構築します。
 * 
 * @param {Array<Object>} sheetOptions - 対象シート名のドロップダウンに表示する選択肢の配列
 * @param {string} [errorMessage=""] - エラー時に表示するメッセージ（HTMLタグ使用可）
 * @returns {Array<Object>} 構築された入力フォーム設定の配列
 */
function buildAppendAdvancedRowsInputs(sheetOptions, errorMessage = "") {
  const inputs = [];
  
  if (errorMessage) {
    inputs.push({ type: StudioWrapper.TEXT_PARAGRAPH, text: errorMessage });
  }

  inputs.push(
    { 
      type: StudioWrapper.DRIVE_PICKER,
      id: "spreadsheet_id", 
      title: "対象のスプレッドシート*", 
      itemTypes: [StudioWrapper.PICKER_SPREADSHEETS],
      onChangeAction: "onAppendAdvancedRowsUrlChange" 
    },
    { 
      type: StudioWrapper.SELECTION,
      id: "sheet_name", 
      title: "対象シート名*", 
      selectionType: StudioWrapper.DROPDOWN,
      options: sheetOptions,
      includeVariables: false 
    },
    { 
      type: StudioWrapper.SELECTION,
      id: "insert_position", 
      title: "行を追加*",
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
      title: "追加するデータ (JSON配列)*", 
      hint: '例: [{"お名前": "山田", "年齢": 30}]',
      multiline: true
    }
  );
  
  return inputs;
}

/**
 * Workspace Studioの設定画面（Config）初回ロード時に呼び出される関数です。
 * マニフェストファイルの "onConfigFunction": "onAppendAdvancedRowsConfig" に対応します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 構築された設定画面のカードレスポンス(push_card)
 */
function onAppendAdvancedRowsConfig(e) {
  const sheetOptions = getSheetOptions(e);
  const inputs = buildAppendAdvancedRowsInputs(sheetOptions);
  return StudioWrapper.buildConfigCard("", inputs, false);
}

/**
 * スプレッドシートの選択が変更された時 (onChangeAction) に呼び出されるコールバック関数です。
 * シート一覧を動的に取得してUIを再描画します。
 * 
 * @param {Object} e - フォーム入力値を含むイベントオブジェクト
 * @returns {Object} 構築された設定画面のカードレスポンス(update_card)
 */
function onAppendAdvancedRowsUrlChange(e) {
  const sheetOptions = getSheetOptions(e);
  const inputs = buildAppendAdvancedRowsInputs(sheetOptions);
  return StudioWrapper.buildConfigCard("", inputs, true);
}

/**
 * 保存時のサーバー側バリデーション処理です。
 * マニフェストファイルの "onSaveFunction": "onAppendAdvancedRowsSave" に対応します。
 * ピッカーおよびドロップダウンの未選択状態を検知し、安全なデータ保存を保証します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 検証結果に応じたレスポンス
 */
function onAppendAdvancedRowsSave(e) {
  const { spreadsheet_id, sheet_name } = StudioWrapper.parseInputs(e);
  
  if (!spreadsheet_id || !sheet_name) {
    // 画面を差し戻す際も、動的ドロップダウンを復元するためにオプションを再取得してカードを構築
    const sheetOptions = getSheetOptions(e);
    const inputs = buildAppendAdvancedRowsInputs(sheetOptions, "<font color=\"#FF0000\"><b>エラー:</b> スプレッドシートと対象シートを両方選択してください。</font>");
    
    // buildSaveErrorには「ヘッダー」と「入力設定配列」を渡す仕様
    return StudioWrapper.buildSaveError("", inputs);
  }
  
  return StudioWrapper.buildSaveSuccess();
}

/**
 * Workspace Studioから呼び出され、実際にJSON配列をパースしてシートにデータを追加します。
 * マニフェストファイルの "onExecuteFunction": "onAppendAdvancedRowsExecute" に対応します。
 * 
 * 複数のフローから同時に呼び出された場合でもデータが上書きされないよう、
 * LockServiceを用いた厳密な排他制御（キューイング）を実装しています。
 * 
 * @param {Object} e - 入力値(inputs)を含むイベントオブジェクト
 * @returns {Object} 処理結果メッセージ(result_status)を格納したレスポンス
 */
function onAppendAdvancedRowsExecute(e) {
  let resultMessage = "";
  let logConfig = {}; // 実行履歴へのログ出力設定用オブジェクト

  try {
    // 1. 入力値の受け取り
    const {
      spreadsheet_id: ssId,
      sheet_name: sheetName,
      insert_position: insertPosition = "after_last",
      json_data: jsonString
    } = StudioWrapper.parseInputs(e);

    // 必須項目の入力チェック
    if (!ssId) throw new Error("スプレッドシートが選択されていません。");
    if (!sheetName) throw new Error("対象シート名が入力されていません。");
    if (!jsonString) throw new Error("追加するJSONデータが入力されていません。");

    // スプレッドシートと対象シートのオブジェクトを取得（URL対応）
    const safeSsId = extractDriveId(ssId);
    if (!safeSsId) throw new Error("スプレッドシートのIDを正しく抽出できませんでした。");

    const ss = SpreadsheetApp.openById(safeSsId);
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
    
    // ロック取得専用のtry-catch（タイムアウト時のエラーを正確に捕捉）
    try {
      lock.waitLock(30000);
    } catch (lockError) {
      console.error("ロック取得タイムアウト: " + lockError.message);
      throw new Error("同時処理が集中したため書き込みに失敗しました（タイムアウト）");
    }

    // 書き込み処理専用のtry-finally（処理後は必ずロックを解放）
    try {
      if (insertPosition === "after_first") {
        sheet.insertRowsAfter(1, numRowsToInsert);
        sheet.getRange(2, 1, numRowsToInsert, numColsToInsert).setValues(dataToInsert);
      } else {
        const latestLastRow = sheet.getLastRow();
        sheet.getRange(latestLastRow + 1, 1, numRowsToInsert, numColsToInsert).setValues(dataToInsert);
      }

      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    resultMessage = `【成功】${numRowsToInsert}件のデータを追加しました。`;
    console.log(resultMessage);

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
    // GASのコンソールに詳細なエラーログを出力
    console.error(error.stack || error.message);
    
    resultMessage = `【エラー】${error.message}`;

    logConfig = {
      isError: true,
      message: `行の追加に失敗しました: ${error.message}`,
      chip: {
        label: "エラーの詳細",
        icon: StudioWrapper.ICON_ERROR
      }
    };
  }

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
 * [UI構築ヘルパー] 差し込み印刷アクションの設定画面UIを構築します。
 * 初回表示時およびバリデーションエラー時の再描画において共通利用されます。
 * 
 * @param {string} [errorMessage=""] - エラー時に表示するメッセージ（HTMLタグ使用可）
 * @returns {Object} StudioWrapperで構築されたカードレスポンス
 */
function buildDocsJsonImportConfigUI(errorMessage = "") {
  const inputs = [];
  
  if (errorMessage) {
    inputs.push({ type: StudioWrapper.TEXT_PARAGRAPH, text: errorMessage });
  }

  inputs.push(
    { 
      type: StudioWrapper.DRIVE_PICKER,
      id: "template_id", 
      title: "テンプレートのGoogleドキュメント*", 
      itemTypes: [StudioWrapper.PICKER_DOCUMENTS]
    },
    { 
      type: StudioWrapper.DRIVE_PICKER,
      id: "dest_folder_id", 
      title: "保存先フォルダの場所*", 
      itemTypes: [StudioWrapper.PICKER_FOLDERS]
    },
    { 
      type: StudioWrapper.TEXT_INPUT,
      id: "json_data", 
      title: "差し込みデータ (JSON配列)*", 
      hint: '例: [{"会社名": "A社", "金額": 100}, {"会社名": "B社", "金額": 200}]',
      multiline: true
    },
    { 
      type: StudioWrapper.TEXT_INPUT,
      id: "output_filename", 
      title: "出力ファイル名*", 
      hint: "例: 請求書一括出力_202610（※拡張子は不要です）" 
    },
    { 
      type: StudioWrapper.SELECTION,
      id: "export_format", 
      title: "出力フォーマット*",
      selectionType: StudioWrapper.DROPDOWN,
      options: [
        { text: "PDFとして出力する", value: "pdf", selected: true },
        { text: "Googleドキュメントとして出力する", value: "doc" }
      ],
      includeVariables: false 
    }
  );

  return StudioWrapper.buildConfigCard("", inputs);
}

/**
 * Workspace Studioのフロー設定画面（差し込み印刷アクション用）を構築します。
 * マニフェストファイルの "onConfigFunction": "onDocsJsonImportConfig" に対応します。
 * 
 * @returns {Object} 構築された設定画面のカードレスポンス
 */
function onDocsJsonImportConfig() {
  return buildDocsJsonImportConfigUI();
}

/**
 * 保存時のサーバー側バリデーション処理。
 * マニフェストファイルの "onSaveFunction": "onDocsJsonImportSave" に対応します。
 * 複数のDRIVE_PICKERウィジェットの未選択状態を検知し、安全なデータ保存を保証します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 検証結果に応じたレスポンス（成功時は保存許可、エラー時は画面再描画）
 */
function onDocsJsonImportSave(e) {
  const { template_id, dest_folder_id } = StudioWrapper.parseInputs(e);

  if (!template_id || !dest_folder_id) {
    const errorCard = buildDocsJsonImportConfigUI("<font color=\"#FF0000\"><b>エラー:</b> テンプレートと保存先フォルダの両方を選択してください。</font>");
    return StudioWrapper.buildSaveError(errorCard);
  }

  return StudioWrapper.buildSaveSuccess();
}

/**
 * Workspace Studioから呼び出され、JSON配列をもとにテンプレートのプレースホルダーを置換し、
 * 単一のファイル（ページ区切り）としてPDFまたはドキュメントを生成します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 処理結果（ファイルURL）とアクティビティログを格納したレスポンス
 */
function onDocsJsonImportExecute(e) {
  let createdFileUrl = "";
  let logConfig = null;
  let tempDocId = null; // エラー発生時のクリーンアップ用にIDをスコープ外で保持

  try {
    // 1. 入力値の受け取り
    const {
      template_id: templateId,
      dest_folder_id: destFolderId,
      json_data: jsonString,
      output_filename: outputFilename = "自動生成ドキュメント",
      export_format: exportFormat = "pdf",
    } = StudioWrapper.parseInputs(e);

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

    // 3. ドキュメントとフォルダの取得（URL対応）
    const safeTemplateId = extractDriveId(templateId);
    const safeDestFolderId = extractDriveId(destFolderId);

    if (!safeTemplateId || !safeDestFolderId) {
      throw new Error("テンプレートまたは保存先フォルダのIDを正しく抽出できませんでした。");
    }

    const templateDoc = DocumentApp.openById(safeTemplateId);
    const templateBody = templateDoc.getBody();
    const templateElements = templateBody.getNumChildren();
    const destFolder = DriveApp.getFolderById(safeDestFolderId);

    // 4. 結合用の一時ドキュメントを作成
    const tempDoc = DocumentApp.create(`【一時ファイル】${outputFilename}`);
    tempDocId = tempDoc.getId(); // クリーンアップ用にIDを記録
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
      // PDF化が完了したため、一時ドキュメントをゴミ箱へ移動
      tempFile.setTrashed(true);
      tempDocId = null; // クリーンアップ完了
    } else {
      // ドキュメントとして指定フォルダへ移動してリネーム
      tempFile.moveTo(destFolder);
      tempFile.setName(outputFilename);
      finalFile = tempFile;
      tempDocId = null; // 移動完了のためクリーンアップ不要
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
    // GASのコンソールに詳細なエラーログを出力
    console.error(error.stack || error.message);

    // 処理途中でエラーが発生した場合、作成された一時ドキュメントをゴミ箱へ移動してリソースリークを防ぐ
    if (tempDocId) {
      try {
        DriveApp.getFileById(tempDocId).setTrashed(true);
      } catch (cleanupError) {
        console.error("一時ファイルのクリーンアップに失敗しました: " + cleanupError.message);
      }
    }

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
