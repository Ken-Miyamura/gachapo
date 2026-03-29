# ガチャポ (Gachapo)

さまざまなテーマのアイテムをガチャで引いてコレクションするモバイルアプリ。

<p align="center">
  <img src="assets/images/screenshot-gacha.png" alt="ガチャ画面" width="300" />
</p>

## テーマ

| テーマ | 内容 |
|---|---|
| 💬 名言ガチャ | アニメ・映画の名セリフをコレクション |
| 🗣️ トークガチャ | 話のネタに困ったらコレ！ |
| 🎬 今日なに観る？ | 映画・アニメをランダムに選ぶ |
| 🍸 東京 Bar ガチャ | 今夜行く Bar をガチャで決めよう（マップ対応） |

## 機能

- **ガチャ** — レアリティ加重抽選（★50% / ★★35% / ★★★15%）、レアリティ別演出
- **コレクション** — テーマ別カード管理、コンプ率表示、未取得カードはシークレット表示
- **お気に入り** — テーマ横断でお気に入りカードを一覧管理
- **マップ連携** — 位置情報付きテーマで Google Maps を開く
- **ダークモード** — システム連動 + 手動切替
- **1日10回制限** — 深夜0時リセット

## 技術スタック

- [Expo](https://expo.dev/) (React Native) + Expo Router
- TypeScript
- AsyncStorage（オフラインキャッシュ & ユーザーデータ）
- Reanimated（アニメーション）
- expo-haptics（触覚フィードバック）
- Google Sheets CSV（データソース）
- [Biome](https://biomejs.dev/)（Lint / Format）

## セットアップ

```bash
git clone https://github.com/Ken-Miyamura/gachapo.git
cd gachapo
npm install
npx expo start
```

## スクリプト

| コマンド | 用途 |
|---|---|
| `npm start` | Expo 開発サーバー起動 |
| `npm run web` | Web 版で起動 |
| `npm run lint` | Biome Lint + Format チェック |
| `npm run lint:fix` | 自動修正 |
| `npm run typecheck` | TypeScript 型チェック |

## ライセンス

Private
