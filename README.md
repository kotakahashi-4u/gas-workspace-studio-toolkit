# Workspace Studio Toolkit

Workspace Studioの機能を限界まで拡張するための、高度なカスタムアクション（ステップ）集です。

[![Developed by 4U, Inc.](https://img.shields.io/badge/Developed_by-4U,_Inc.-1abc9c.svg)](https://corp-4u.com/)
[![YouTube](https://img.shields.io/badge/YouTube-こーすけ先生のGoogle塾-FF0000.svg)](https://www.youtube.com/@google-school)

> **💡 Tips: リンクを別タブで開くには**  
> GitHubの仕様上、各種リンクは同じタブで開かれます。現在のマニュアルを残したままリンク先を閲覧したい場合は、**`Ctrl` キー（Macの場合は `Command` キー）を押しながらクリック**するか、マウスのホイールボタンでクリックしてください。  

## 📦 必須コアライブラリ: StudioWrapper

本ツールキットのアクションを動作させるには、複雑なRaw JSONの生成やレスポンス構築を隠蔽するコアライブラリ **`StudioWrapper`** が必要です。

- **ライブラリID (Script ID):** `1ka8vVJSaKyYjuGXyJMMxqESfKgV9R6fKCP6kroTIRBZ_0jrIaswR_Sch`
- 各プロジェクトの `appsscript.json` に依存関係として定義済みですが、手動でスクリプトを作成する場合は、GASエディタの「ライブラリ」から上記IDを追加し、最新バージョンを選択してください。

---

## ✨ 共通仕様 (Common Features)
- **リッチな実行履歴:** 実行成功時やエラー時には、Workspace Studioの「アクティビティ」タブに、分かりやすいマテリアルアイコン付きのサマリーやリンクチップが美しく出力されるよう設計されています。

---

## 🛠️ モジュール一覧

本リポジトリは、用途ごとに2つのGASプロジェクト（ディレクトリ）に分かれています。

### 1. DriveEx (Google Drive 拡張アクション)
Google Drive内のファイル・フォルダ操作を自動化するアクション群です。

| アクション名 | 役割 | 入力 (Inputs) | 出力 (Outputs) |
| :--- | :--- | :--- | :--- |
| **アイテム移動** | 指定したファイルやフォルダを、目的のフォルダへ移動します。 | `file_url`: 移動対象のURL<br>`folder_url`: 移動先のURL | `result_status`: 実行結果メッセージ（成功時はリンクチップ付きのログを出力） |
| **ルート直下判定** | 対象アイテムが、指定した親フォルダの直下（1階層目）に存在するかをブール値で返します。 | `item_url`: 判定対象のURL<br>`root_folder_url`: 親フォルダのURL | `is_direct_child`: 判定結果 (Boolean) |
| **PDF分割** | 指定したPDFファイルを、指定ページ数ごとに分割して別ファイルとして保存します。(pdf-lib使用) | `split_file_url`: PDFのURL<br>`chunk_size`: 分割単位(整数)<br>`dest_folder_url`: 保存先URL | `created_file_urls`: 分割生成されたPDFのURLリスト (Array) |

### 2. SheetsEx (Google Sheets 拡張アクション)
Google Sheetsに対する高度なデータ書き込みを自動化するアクションです。

| アクション名 | 役割 | 入力 (Inputs) | 出力 (Outputs) |
| :--- | :--- | :--- | :--- |
| **JSONデータから行を追加** | 任意のJSON配列を受け取り、スプレッドシートの1行目のヘッダー名と自動照合して、一致する列へデータを追記します。不要なJSONキーは自動でスキップされます。 | `spreadsheet_url`: スプシURL<br>`sheet_name`: 対象シート名<br>`insert_position`: 挿入位置<br>`json_data`: JSON配列データ | `result_status`: 実行結果メッセージ（成功時は対象シートへのリンクチップ付きのログを出力） |

💡 **SheetsExの特長（技術的ハイライト）**
- **動的UI (onChangeAction):** URLを入力してカーソルを外すと、GASが裏側でスプレッドシートにアクセスし、存在するシート一覧をドロップダウンメニューとして動的に展開します。
- **完全な排他制御 (LockService):** Workspace Studioから同時に複数の書き込みリクエストが発生した場合でも、自動で順番待ち（キューイング）を行い、データの欠損や上書きを防ぎます。

---

## 🚀 導入手順 (Setup Guide)
以下では、`SheetsEx` を例としてご説明します。`DriveEx`も同様です。

### Step 1: Google Apps Script (GAS) への適用
1. [Google Apps Script](https://script.google.com/) にアクセスし、新しいプロジェクトを作成します。
2. 本リポジトリの対象フォルダ内にある [code.gs](https://github.com/kotakahashi-4u/gas-workspace-studio-toolkit/blob/main/SheetsEx/code.gs) の中身をコピーし、エディタに貼り付けます。
3. プロジェクト設定の歯車アイコンから「`appsscript.json` マニフェスト ファイルをエディタで表示する」にチェックを入れます。
4. エディタに表示された `appsscript.json` に、本リポジトリの [同名ファイルの中身](https://github.com/kotakahashi-4u/gas-workspace-studio-toolkit/blob/main/SheetsEx/appsscript.json) を上書き保存します。
5. （手動の場合）エディタ左側の「ライブラリ」の「＋」を押し、`StudioWrapper` のIDを追加します。
6. 右上の「デプロイ」>「デプロイをテスト」を選択し、アプリケーションの種類から「Google Workspace アドオン」として「インストール」をクリックします。

### Step 2: Google Workspace Studio への適用
1. Google Workspace Studio のフロー編集画面を開きます。
2. アクションを追加したい箇所で「＋ ステップを追加」または「ステップの選択」をクリックします。
3. 右側に表示されるアクション一覧パネルから、インストールした拡張機能のカテゴリ（例: `Drive拡張` や `Sheets拡張`）を探します。
4. その中から、追加したいアクション（例: `JSONデータから行を追加`）のカードをクリックして選択します。
5. 設定画面（Config）が開くので、前段のステップの出力変数（PDFのURLリストや、Geminiが生成したJSONなど）を各入力項目にマッピングし、「Save」を押します。

---

## ⚠️ 注意事項と制限
- PDF分割処理（DriveEx）は、GASの実行時間制限（6分）の影響を受けるため、極端にページ数の多いPDFや重いファイルの処理にはご注意ください。

---

## 📚 付録: 独自ライブラリ「StudioWrapper」について

本ツールキットの基盤として独自開発した `StudioWrapper` は、Workspace Studioのカスタムアクション開発における「GAS特有の冗長な記述」や「UIの仕様制限」をハックし、直感的な開発体験を提供する強力なラッパーライブラリです。

### 1. StudioWrapperの特長
- **Raw JSONレンダリングエンジン:** 公式の `CardService` が抱えるバグ（ドロップダウンが強制的にテキストボックスにダウングレードされる問題など）を回避するため、Workspace Studioが要求する厳密なRaw JSONを直接構築して返却します。
- **出力処理の隠蔽:** 配列（リスト）か単一値かを自動判別し、冗長な `AddOnsResponseService` の記述を一行のオブジェクト形式に圧縮します。
- **リッチログの標準化:** マテリアルアイコンやリンクチップを含むアクティビティログの生成を標準サポートしています。

### 2. 劇的なコードの簡略化（Before / After）
Workspace Studioで「実行結果を変数として返しつつ、ログを出力する」という単純な処理を行う場合、ネイティブのGASでは非常に深くネストされた冗長なコードを書く必要があります。

**❌ Before (GASネイティブによる記述):**
```javascript
/**
 * 1. 設定画面（Config）の定義を返す関数
 * appsscript.json の "onConfigFunction": "onWorkflowConfig" に対応
 */
function onWorkflowConfig() {
  
  // 入力フォームの作成
  let textInput = CardService.newTextInput()
    // マニフェストの inputs > id: "input_text" と一言一句合わせる必要がある
    .setFieldName("input_text")
    
    // 画面に表示されるラベル（マニフェストには書けないUI要素はここで定義）
    .setTitle("加工するテキスト")
    .setHint("ここに文字を入力してください")
    .setHostAppDataSource(CardService.newHostAppDataSource().setWorkflowDataSource(CardService.newWorkflowDataSource().setIncludeVariables(true)));

  // カードの構築
  let card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("テキスト加工設定"))
    .addSection(
      CardService.newCardSection()
        .addWidget(textInput)
    )
    .build();

  // Workflowsの設定画面として描画するアクションを返す
  return CardService.newActionResponseBuilder()
                    .setNavigation(CardService.newNavigation().pushCard(card))
                    .build();
}

/**
 * 2. 実際の処理（Execute）を行う関数
 * appsscript.json の "onExecuteFunction": "onWorkflowExecute" に対応
 */
function onWorkflowExecute(e) {
  // 1. 入力値の受け取り
  const inputVal = e.workflow.actionInvocation.inputs["input_text"].stringValues[0];

  // 2. 結果の返却
  const variableDataMap = { "result_text": AddOnsResponseService.newVariableData().addStringValue(`【処理済】${inputVal}`) }, // マニフェストの outputs > id: "result_text" とキー名を合わせる必要がある。
        workflowAction = AddOnsResponseService.newReturnOutputVariablesAction().setVariableDataMap(variableDataMap),
        hostAppAction = AddOnsResponseService.newHostAppAction().setWorkflowAction(workflowAction),
        renderAction = AddOnsResponseService.newRenderActionBuilder().setHostAppAction(hostAppAction).build();

 return renderAction;
}
```

**✅ After (StudioWrapperを使用した場合):**
```javascript
function onWorkflowConfig() {
  return StudioWrapper.buildConfigCard("テキスト加工設定", [
    { type: StudioWrapper.TEXT_INPUT, id: "input_text", title: "加工するテキスト", hint: "ここに文字を入力してください" }
  ]);
}

function onWorkflowExecute(e) {
  const inputVal = e.workflow.actionInvocation.inputs["input_text"].stringValues[0];
  return StudioWrapper.buildExecuteResponse({ "result_text": `【処理済】${inputVal}` });
}
```

### 3. コーディング・スニペット集
ご自身のGASプロジェクトで `StudioWrapper` を呼び出してUIや処理を構築する際の、代表的な記述例です。

**① シンプルなテキスト入力UIを作る**
```javascript
function onConfigFunction() {
  return StudioWrapper.buildConfigCard("基本設定", [
    { 
      type: StudioWrapper.TEXT_INPUT,
      id: "user_name", 
      title: "お名前", 
      hint: "姓名を入力してください" 
    }
  ]);
}
```

**② ドロップダウンメニューUIを作る**
```javascript
function onConfigFunction() {
  return StudioWrapper.buildConfigCard("選択設定", [
    { 
      type: StudioWrapper.SELECTION,
      id: "fruit_choice", 
      title: "好きなフルーツ", 
      selectionType: StudioWrapper.DROPDOWN,
      options: [
        { text: "りんご", value: "apple", selected: true },
        { text: "みかん", value: "orange" }
      ]
    }
  ]);
}
```

**③ 単一の変数（文字列・数値）を返す**
```javascript
function onExecuteFunction(e) {
  // 処理ロジック...
  return StudioWrapper.buildExecuteResponse({ 
    "status_code": 200,
    "response_text": "処理が完了しました" 
  });
}
```

**④ リスト（配列）を変数として返す（ループ処理用）**
```javascript
function onExecuteFunction(e) {
  // マニフェスト側で "cardinality": "MULTIPLE" に設定したキーに配列を渡すだけで、
  // 自動的にリスト出力としてパースされます。
  const urlList = ["https://url-1.com", "https://url-2.com"];
  
  return StudioWrapper.buildExecuteResponse({ 
    "generated_urls": urlList 
  });
}
```

**⑤ エラー発生時に、処理を中断してエラーログを出力する**
```javascript
function onExecuteFunction(e) {
  try {
    throw new Error("APIの認証に失敗しました。");
  } catch(error) {
    // isError: true を渡すことで、後続のステップを停止しエラーログを赤色で表示します。
    return StudioWrapper.buildExecuteResponse({}, {
      isError: true,
      message: error.message,
      chip: { label: "エラー詳細", icon: StudioWrapper.ICON_ERROR }
    });
  }
}
```
