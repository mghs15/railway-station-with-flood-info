import child_process from 'child_process';
import fs from 'fs';

const result = {};


/* 
 * main.js で作成したデータ（駅の代表点に、ラスタタイルから得られた情報を付与したもの）を使う。
 * 検索しやすいように整形しておく。
 */
const beadsText = fs.readFileSync("./stations-kozui-l2-v2.json", "utf-8");
const beadsArray = JSON.parse(beadsText).features;
const beads = {};

beadsArray.forEach( bead => {
  const companyName = bead.properties["N02_004"];
  const stationName = bead.properties["N02_005"];
  if(!beads[companyName]) beads[companyName] = [];
  // 同じ会社に同名駅があると上書きされる。
  //（最後の上書きされた駅を代表情報として用いる。）
  beads[companyName][stationName] = bead;
});

/* 
 * 出典:
 * 第12回大都市交通センサス調査結果集計表
 * https://www.mlit.go.jp/sogoseisaku/transport/sosei_transport_tk_000035.html
 * 路線別着時間帯別駅間輸送定員表 を加工（ヘッダー削除、CSV変換）
 */
const stringText = fs.readFileSync("./data/001178999.csv", "utf-8");


/* 
 * センサスの「下り」のデータを用いて、その路線の駅と順番を取得する。
 * 各駅の情報については、"beads" から取得できたものを付与する。 
 * 駅間の定員については、ある駅に対して、前の駅から当駅までの定員を付与する。
 * （そのため、最初の駅は定員情報を持たない。）
 */
let companyName; let lineName; let noboriKudari; let from; let to;

stringText.split("\n").forEach( line => {
  
  const csv = line.split(",");
  
  // 会社名、路線名、上り下りは前の行のデータを保持
  companyName = csv[0] || companyName;
  lineName = csv[1] || lineName;
  noboriKudari = csv[2] || noboriKudari; 
  let from = csv[3];
  let to = csv[4];
  let capacity = csv[5];
  
  // 例外処理
  if(companyName == "東京都交通局") companyName = "東京都";
  
  if(noboriKudari == "上り") return;
  
  // 会社名が "beads" にない場合、駅の名前がない場合は無視。
  if(!beads[companyName]){
    return;
  }
  if(!from && !to) return;
  
  // 表記ゆれの調整
  from =  from.replace("ケ", "ヶ");
  to =  to.replace("ケ", "ヶ");
  
  // 当該会社の初めての行の処理
  if(csv[0]){
    if(!result[companyName]) result[companyName] = {};
  }
  
  // "beads" に駅のデータがなかった場合の処理用
  const mkDummy = (stationName) => {
    return {
      properties: {
        N02_001: '＊ダミー＊',
        N02_002: '＊ダミー＊',
        N02_003: companyName,
        N02_004: lineName,
        N02_005: stationName,
        N02_005c: '＊ダミー＊',
        N02_005g: '＊ダミー＊',
        rank: -999,
        interval: null,
        r: 200,
        g: 200,
        b: 200
      }
    };
  }
  
  // 当該路線の初めての行（始発駅）の処理
  if(csv[1]){
    const targetFrom = (beads[companyName][from]) ? JSON.parse(JSON.stringify(beads[companyName][from])) : mkDummy(from);
    result[companyName][lineName] = [];
    result[companyName][lineName].push(targetFrom);
  }
  
  // 始発駅以外の処理
  const targetTo = (beads[companyName][to]) ? JSON.parse(JSON.stringify(beads[companyName][to])) : mkDummy(to);
  targetTo.properties.capacity = +capacity;
  result[companyName][lineName].push(targetTo);
  
});


/* 
 * 中間結果の書き出し
 */
fs.writeFile(`./resultLineupStations.json`, JSON.stringify(result, null, 2), (e) => {
  if(e){
    console.log(`ERROR ${z}/${x}/${y} (write file)`);
    console.error(e);
  }
});

/******************************************************************************/


/* 
 * PresentationML のテンプレートを取得
 */
const slideTemplate = fs.readFileSync("./pptx-template/slide.xml", "utf-8");
// テンプレート中の"{{CONTENTS}}"を置き換える

const defaultColor = "2F15F3"

/* 
 * テキストボックスの生成
 */
const makeTextBox = (text, id, color, x, y, scale) => {
  if(!scale) scale = 1;
  const hex = color.match(/^#/) ? color.replace("#", "") : color;
  const temp = `<p:sp><p:nvSpPr>
    <p:cNvPr id="${id}" name="テキスト ボックス ${id}">
    <a:extLst><a:ext uri="{${id}}">
    <a16:creationId xmlns:a16="http://schemas.microsoft.com/office/drawing/2014/main" id="{${id}}"/>
    </a:ext></a:extLst></p:cNvPr>
    <p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>
    <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="386904" cy="${Math.floor(1202202 * scale)}"/></a:xfrm>
    <a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>
    <a:solidFill><a:srgbClr val="${hex}"/></a:solidFill>
    <a:ln w="19050"><a:solidFill><a:srgbClr val="${defaultColor}"/></a:solidFill></a:ln>
    </p:spPr><p:style><a:lnRef idx="2"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="lt1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></p:style><p:txBody><a:bodyPr vert="eaVert" wrap="none" lIns="36000" tIns="36000" rIns="36000" bIns="36000" rtlCol="0" anchor="ctr"><a:spAutoFit/></a:bodyPr><a:lstStyle/><a:p><a:pPr algn="dist"/><a:r><a:rPr lang="ja-JP" altLang="en-US" dirty="0"/><a:t>${text}</a:t></a:r><a:endParaRPr kumimoji="1" lang="ja-JP" altLang="en-US" dirty="0"/></a:p></p:txBody></p:sp>`;
  
  return temp;
}

/* 
 * コネクタの生成
 */
const makeConnection = (id, fromId, toId, x, y, w) => {
  if(!x) x = -654654;
  if(!y) y = 0;
  if(!w) w = 19050;
  const temp = `<p:cxnSp><p:nvCxnSpPr>
    <p:cNvPr id="${id}" name="直線コネクタ ${id}">
    <a:extLst><a:ext uri="{${id}}">
    <a16:creationId xmlns:a16="http://schemas.microsoft.com/office/drawing/2014/main" id="{${id}}"/>
    </a:ext></a:extLst></p:cNvPr>
    <p:cNvCxnSpPr>
    <a:stCxn id="${fromId}" idx="3"/>
    <a:endCxn id="${toId}" idx="1"/>
    </p:cNvCxnSpPr>
    <p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="654654" cy="0"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="${w}"><a:solidFill><a:srgbClr val="${defaultColor}"/></a:solidFill></a:ln></p:spPr><p:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef></p:style></p:cxnSp>`;
  
  return temp;
}

/* 
 * RGB 値を DrawingML で使える形式へ変更
 */
const rgb2hex = (r, g, b) => {
  let rr = r.toString(16).padStart(2,'0');
  let gg = g.toString(16).padStart(2,'0');
  let bb = b.toString(16).padStart(2,'0');
  if(r < 10 && g < 10 && b < 10){
    rr="FF";
    gg="FF";
    bb="FF";
  }
  return `${rr}${gg}${bb}`;
}

/* 
 * 路線ごとに、駅の情報（および駅間の情報）に基づいてスタイルを調整し、
 * スライド用の XML として書き出し。
 */

let slideCount = 0;
let idCount = 0;

for(companyName in result){
  const railLines = result[companyName];
  for(lineName in railLines){
    slideCount += 1;
    let res = "";
    const stations = railLines[lineName];
    const stationLength = stations.length;
    for( let i=0; i<stationLength; i++){
      
      const station = stations[i];
      
      //console.log(station);
      
      const prop = station.properties;
      const color = rgb2hex(prop.r, prop.g, prop.b);
      
      const offX = 333555 + 654654 * (i % 16 + 1);
      const offY = 123123 + 1891891 * Math.floor(i/16);
      
      if(i < 1){
        // 最初のみ、鉄道会社と路線名のテキストボックスを生成
        idCount += 1;
        const firstTextBox = makeTextBox(`${companyName}（${lineName}）`, idCount, "FFFFFF", 0, 0, 4);
        res += firstTextBox;
      }else{
        // 最初の駅以外が対象。
        // 前の駅と対象駅（i 番目）を結ぶコネクタを生成する。
        // id は、駅->コネクタ->駅の順になるので、(コネクタの ID - 1), (コネクタの ID + 1) を結ぶことになる。
        // 線幅は、ID が(コネクタの ID + 1)となる駅の定員に合わせて調整する。
        idCount += 1;
        const capacity = prop.capacity;
        const w = 10000 + Math.floor( 10 * 19050 * (capacity/631680) );
        const connection = makeConnection(idCount, idCount - 1, idCount + 1, offX - 654654 + 386904, offY + 601101, w);
        res += connection;
      }
      
      // 文字数に合わせてテキストボックスのサイズ調整
      const mojisu = prop["N02_005"].length;
      const scale = (mojisu < 5) ? 1 : (mojisu < 7) ? 1.25 : 1.5;
      
      // 駅のテキストボックスを生成する。
      idCount += 1;
      const textBox = makeTextBox(prop["N02_005"], idCount, color, offX, offY, scale);
      res += textBox;
      
      res += "\n";
      
    }
    
    const slideXml = slideTemplate.replace(/\{\{CONTENTS\}\}/, res);
    
    const slideFilename = `slide${slideCount}`;
    fs.writeFile(`./pptx-slides/${slideFilename}.xml`, slideXml, (e) => {
      if(e){
        console.log(`ERROR: ${slideFilename} / ${companyName} ${lineName} (write file)`);
        console.error(e);
      }
    });
    
  }
}


