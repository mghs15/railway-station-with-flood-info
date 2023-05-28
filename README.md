# railway-station-with-flood-info
鉄道駅と浸水想定図の関係を可視化

**鉄道駅の代表点が、浸水想定図でどの程度の浸水深となるかをざっくり把握するものです。利用の際は自己責任でお願いします** 

## 使い方

* `main.js`: 駅のデータ（国土数値情報の GeoJSON ）から、代表点を抽出し、ハザードマップポータルサイトの浸水想定図のライスタイルから浸水深さを取得するツール。**ハザードマップポータルサイトの API を叩くため、サーバ側の負荷とならないようにご注意ください。**
* `mkGsimapsMarker.js`: 地理院地図で表示できるようにスタイルを調整するツール。
* `lineup.js`: 得られた結果を路線図のような形で見られるように、pptx の構成ファイルへ変換するツール。

最初だけ
```
npm install
```

データは、`data` ディレクトリを作成して格納。
必要なのは、以下の通り。
* 国土数値情報　鉄道データのうち、`N02-22_Station.geojson`（UTF-8。ファイル名は令和4年度の場合）。
* 第12回大都市交通センサス調査結果集計表（路線別着時間帯別駅間輸送定員表）を加工（ヘッダー削除、CSV変換、5列名に1日の定員合計を算出等、数値のコンマを削除）したもの。`001178999.csv` として入れることを想定したコードになっている。

一式作成
```
node main.js
cp result.json stations-kozui-l2-v2.json
node mkGsimapsMarker.js
mkdir pptx-slides
node lineup.js
```

## 利用したデータ
* 国土数値情報　鉄道データ 令和4年度
	* https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-v3_1.html
	* UTF8 版の GeoJSON 利用
* 第12回大都市交通センサス調査結果集計表
	* https://www.mlit.go.jp/sogoseisaku/transport/sosei_transport_tk_000035.html
	* 路線別着時間帯別駅間輸送定員表 を加工（ヘッダー削除、CSV変換）
* 重ねるハザードマップ
	* https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html
	* 洪水浸水想定区域（想定最大規模）、高潮浸水想定区域
