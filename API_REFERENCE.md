# StudioWrapper API Reference

`StudioWrapper` は、Google Workspace Studio のカスタムステップ開発を効率化するためのコアライブラリです。このドキュメントでは、提供されるすべてのメソッドと定数の仕様を解説します。

---

## コアメソッド (Core Methods)

### `buildConfigCard(headerConfig, inputConfigs, isUpdate, isValidationError)`
Workspace Studioの設定画面（Config）を構築し、CardServiceの複雑な階層構造を隠蔽します。

#### **引数:**
- `headerConfig` *(string | Object)*: カードのヘッダータイトル、または `{ title: "..." }` 形式のオブジェクト。
- `inputConfigs` *(Array)*: 入力ウィジェットの設定オブジェクトの配列（後述の「ウィジェット設定」を参照）。
- `isUpdate` *(boolean)*: `true` の場合はカードを更新 (`updateCard`)、`false` の場合は新規追加 (`pushCard`) します。デフォルトは `false`。
- `isValidationError` *(boolean)*: `true` の場合、CRITICALエラー通知を付与し、フローの保存を強制的にブロックします。デフォルトは `false`。

#### **戻り値:**
  *(Object)* Workspace Studioが解釈可能なRenderActionレスポンス。

### `buildExecuteResponse(variables, logConfig)`
実行時（Execute）完了時の出力変数のマッピングと、アクティビティログの出力を1行で行います。

#### **引数:**
- `variables` *(Object)*: `{ "出力ID": "値" }` の形式。値が配列の場合は自動的に `MULTIPLE` (リスト出力) として処理され、`null` や深いオブジェクトは安全に文字列化されます。
- `logConfig` *(Object)*: アクティビティログの設定。
  - `isError` *(boolean)*: エラー扱いにするかどうか。
  - `message` *(string)*: ログに表示するメッセージ本文。
  - `chip` *(Object)*: リンクチップの設定。`{ label: "開く", url: "https...", icon: StudioWrapper.ICON_FILE }`

#### **戻り値:**
*(Object)* 変数とログをセットしたActionレスポンス。

### `parseInputs(event)`
あらゆるイベントオブジェクト（Config初回、値変更時、Save時、Execute時）から、ユーザーの入力値をフラットな連想配列として一括抽出する万能パーサーです。

#### **引数:**
- `event` *(Object)*: Workspace Studioから渡されるイベントオブジェクト。

#### **戻り値:**
*(Object)* `{ "入力ID": "値" }` 形式のオブジェクト。複数選択は配列で、未選択は `null` で返ります。

---

## バリデーション用メソッド (Validation Methods)

サーバー側バリデーション（`onSaveFunction`）で利用する専用のヘルパーメソッドです。

### `buildSaveSuccess()`
入力値の検証に成功し、設定を保存して次のステップへ進むためのレスポンスを返します。

#### **戻り値:**
*(Object)* SaveWorkflowActionレスポンス。

### `buildSaveError(headerConfig, inputConfigs, isUpdate)`
入力値の検証に失敗した場合に、エラーメッセージを差し込んで画面を再描画し、保存をブロックします。
#### **引数:**
`buildConfigCard` と同等（`isUpdate` のデフォルトは `true`）。

#### **戻り値:**
*(Object)* CRITICALエラー通知を付与した再描画レスポンス。

---

## ウィジェット設定 (Input Configs)

`buildConfigCard` の `inputConfigs` に渡すオブジェクトの構造です。

```javascript
{ 
  type: StudioWrapper.TEXT_INPUT, // ウィジェットのタイプ (必須)
  id: "variable_id",              // 変数ID (必須: マニフェストと一致させる)
  title: "表示名",                // UI上のラベル
  hint: "入力のヒント",           // (任意)
  multiline: true,                // (任意) TEXT_INPUTのみ。複数行入力を許可
  includeVariables: false,        // (任意) 変数挿入ボタンを隠す場合はfalse
  onChangeAction: "関数名",       // (任意) 値変更時に発火する関数
  itemTypes: [StudioWrapper.PICKER_FOLDERS], // (任意) DRIVE_PICKERの絞り込み
  options: [ { text: "A", value: "a", selected: true } ], // (任意) SELECTIONの選択肢
  validation: {                   // (任意) TEXT_INPUTのクライアント側制限
    characterLimit: 100, 
    inputType: StudioWrapper.INPUT_TYPE_EMAIL 
  }
}
```

---

## 定数一覧 (Constants)

コード補完やタイプミス防止のため、設定値は以下の定数を使用してください。

### ウィジェットタイプ (`type`)
- `TEXT_INPUT`: テキスト入力（デフォルト）
- `SELECTION`: 選択メニュー（ドロップダウン等）
- `DRIVE_PICKER`: Google Driveファイル選択UI
- `TEXT_PARAGRAPH`: 説明文やエラーメッセージの表示
- `DATE_PICKER` / `TIME_PICKER` / `DATETIME_PICKER` / `SWITCH` / `BUTTON`

### セレクションタイプ (`selectionType`)
- `DROPDOWN`: ドロップダウンメニュー（デフォルト）
- `CHECK_BOX`: チェックボックス
- `RADIO_BUTTON`: ラジオボタン

### Pickerアイテムタイプ (`itemTypes`)
- `PICKER_FOLDERS`: フォルダのみ
- `PICKER_DOCUMENTS`: Google ドキュメントのみ
- `PICKER_SPREADSHEETS`: Google スプレッドシートのみ
- `PICKER_PRESENTATIONS`: Google スライドのみ
- `PICKER_PDFS`: PDFファイルのみ
- `PICKER_FORMS`: Google フォームのみ

### バリデーション入力タイプ (`inputType`)
- `INPUT_TYPE_TEXT`: 制限なし（デフォルト）
- `INPUT_TYPE_EMAIL`: メールアドレス形式
- `INPUT_TYPE_INTEGER`: 整数のみ
- `INPUT_TYPE_FLOAT`: 小数を含む数値のみ

### マテリアルアイコン (`icon`)
`logConfig.chip` で使用できるアイコン群です。
- **Google系:** `ICON_SHEETS`, `ICON_DOCS`, `ICON_SLIDES`, `ICON_DRIVE`, `ICON_FOLDER`, `ICON_MAIL`
- **ファイル系:** `ICON_FILE`, `ICON_PDF`, `ICON_IMAGE`, `ICON_CODE`, `ICON_VIDEO`, `ICON_AUDIO`, `ICON_ZIP`
- **ステータス・操作系:** `ICON_SUCCESS`, `ICON_ERROR`, `ICON_WARNING`, `ICON_INFO`, `ICON_LINK`, `ICON_OPEN`, `ICON_EDIT`, `ICON_ADD`, `ICON_DELETE`, `ICON_DOWNLOAD`, `ICON_UPLOAD`
