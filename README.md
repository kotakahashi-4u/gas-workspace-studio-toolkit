# Workspace Studio Toolkit

Workspace Studioの機能を限界まで拡張するための、高度なカスタムアクション（ステップ）集です。

[![Developed by 4U, Inc.](https://img.shields.io/badge/Developed_by-4U,_Inc.-1abc9c.svg)](https://corp-4u.com/)
[![YouTube](https://img.shields.io/badge/YouTube-こーすけ先生のGoogle塾-FF0000.svg)](https://www.youtube.com/@google-school)

> **💡 Tips: リンクを別タブで開くには**  
> GitHubの仕様上、各種リンクは同じタブで開かれます。現在のマニュアルを残したままリンク先を閲覧したい場合は、**`Ctrl` キー（Macの場合は `Command` キー）を押しながらクリック**するか、マウスのホイールボタンでクリックしてください。  

## 📦 必須コアライブラリ: StudioWrapper

本ツールキットのアクションを動作させるには、複雑なRaw JSONの生成やレスポンス構築を隠蔽するコアライブラリ **`StudioWrapper`** が必要です。

- **ライブラリID (Script ID):** `1XhLWjQhiO25oEYIf_ygF_AZ7GKOLvXMz1VF8ivqXB-vkkvx8d0H5IrWD`
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
