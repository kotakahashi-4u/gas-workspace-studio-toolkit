/**
 * =========================================================
 * 1. JSONデータから行を追加するアクション
 * =========================================================
 */


/**
 * 1. 初回ロード（またはリロード）時にWorkspace Studioから呼び出される設定画面構築関数。
 * マニフェストファイルの "onConfigFunction": "onAppendRowsConfig" に対応します。
 * 
 * 過去に保存された設定値（特にスプレッドシートURL）が存在する場合は、それを取得して
 * 自動的にスプレッドシートへアクセスし、対象シート名のドロップダウンリストを復元します。
 * 
 * @param {Object} e - Workspace Studioから渡されるイベントオブジェクト
 * @returns {Object} 構築された設定画面のカードレスポンス(push_card)
 */
function onAppendRowsConfig(e) {
  let sheetOptions = [
    { text: "先にスプレッドシートURLを入力してください", value: "", selected: true }
  ];
  let savedSheetName = "";

  try {
    // 画面リロード時等にWorkspace Studioから渡される正しいデータパス(elementConfiguration)から
    // 過去に保存されたURLとシート名を安全に(オプショナルチェーニングを用いて)抽出する
    const savedUrl = e?.formInput?.spreadsheet_url || 
                     e?.workflow?.elementConfiguration?.inputs?.spreadsheet_url?.stringValues?.[0] ||
                     null;
                     
    savedSheetName = e?.formInput?.sheet_name || 
                     e?.workflow?.elementConfiguration?.inputs?.sheet_name?.stringValues?.[0] ||
                     "";

    // 保存されているURLが存在する場合は、スプレッドシートへアクセスしシート一覧を取得する
    if (savedUrl) {
      const ssId = extractSpreadsheetId(savedUrl);
      if (ssId) {
        const ss = SpreadsheetApp.openById(ssId);
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
 * 2. URL入力欄からカーソルが外れた時 (onChangeAction) に呼び出されるコールバック関数。
 * ユーザーが新しいURLを入力した際に、動的にシート一覧を取得してUIを再描画します。
 * 
 * @param {Object} e - フォーム入力値(e.formInput)を含むイベントオブジェクト
 * @returns {Object} 構築された設定画面のカードレスポンス(update_card)
 */
function onUrlChange(e) {
  let newSheetOptions = [];
  
  try {
    // フォーム入力値からURLを取得
    const url = e.formInput ? e.formInput.spreadsheet_url : null;
    if (!url) throw new Error("URLが空です");

    const ssId = extractSpreadsheetId(url);
    if (!ssId) throw new Error("IDを抽出できませんでした");

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
    "JSONデータから行を追加",
    [
      { 
        type: StudioWrapper.TEXT_INPUT,
        id: "spreadsheet_url", 
        title: "スプレッドシートのリンク (URL)", 
        hint: "URLをペーストしてカーソルを外すとシート一覧を取得します",
        onChangeAction: "onUrlChange", // 値の変更を検知してUIを再描画するためのトリガー
        includeVariables: false 
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
    const spreadsheetUrl = inputs["spreadsheet_url"]?.stringValues?.[0];
    const sheetName = inputs["sheet_name"]?.stringValues?.[0];
    const insertPosition = inputs["insert_position"]?.stringValues?.[0] || "after_last";
    const jsonString = inputs["json_data"]?.stringValues?.[0];

    // 必須項目の入力チェック
    if (!spreadsheetUrl) throw new Error("スプレッドシートのURLが入力されていません。");
    if (!sheetName) throw new Error("対象シート名が入力されていません。");
    if (!jsonString) throw new Error("追加するJSONデータが入力されていません。");

    // URLからIDを抽出し、スプレッドシートと対象シートのオブジェクトを取得
    const ssId = extractSpreadsheetId(spreadsheetUrl);
    if (!ssId) throw new Error("スプレッドシートのURLからIDを抽出できませんでした。");

    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`シート「${sheetName}」が見つかりません。`);

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
 * 共通ヘルパー関数
 * =========================================================
 */

/**
 * 入力されたURL文字列からGoogleスプレッドシートのID部分を抽出します。
 * 
 * @param {string} url - 抽出対象のURL文字列
 * @returns {string|null} 抽出されたスプレッドシートID。無効な形式の場合はnullを返します。
 */
function extractSpreadsheetId(url) {
  if (!url) return null;
  // Drive等で共通の、15文字以上の英数字やハイフンの連続をIDとして抽出
  const match = url.match(/[-\w]{15,}/);
  return match ? match[0] : null;
}