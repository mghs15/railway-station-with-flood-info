import child_process from 'child_process';
import fs from 'fs';
import sharp  from 'sharp';
import fetch from 'node-fetch';

/* 
 * タイル座標と経緯度の変換
 * Reference: Slippy map tilenames
 * https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
 */
const lon2tile = (lon,zoom) => { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }

const lat2tile = (lat,zoom) => { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }

const lon2tiled = (lon,zoom) => { return ((lon+180)/360*Math.pow(2,zoom)); }

const lat2tiled = (lat,zoom) => { return ((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)); }

const tile2long = (x,z) => { return (x/Math.pow(2,z)*360-180); }

const tile2lat  = (y,z) => {
  const n=Math.PI-2*Math.PI*y/Math.pow(2,z);
  return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}

/* 
 * ラスタタイルから、対象の経緯度に相当するピクセルの色を抽出する。
 */
const getRasterPixel = (lnglat, tileUrl, z=14, size=256) => {
  
  const tileDetailX = lon2tiled(lnglat[0], z);
  const tileDetailY = lat2tiled(lnglat[1], z);
  
  const x = Math.floor(tileDetailX);
  const y = Math.floor(tileDetailY);
  
  const pixelX = Math.floor((tileDetailX - x) * 255);
  const pixelY = Math.floor((tileDetailY - y) * 255);
  
  let url = tileUrl.replace(/\{z\}/, z)
    .replace(/\{x\}/, x)
    .replace(/\{y\}/, y);
    
  console.log(url);
  
  return fetch( url )
    .then(response => {
      console.log(`${z}/${x}/${y} -> ${response.statusText}`);
      return response.arrayBuffer();
    })
    .then( data => {
      const buf = Buffer.from(data);
      return sharp( buf )
        .raw()
        .toBuffer()
    })
    .then( buf => {
      const ch = buf.length / ( size * size );
      const t = pixelX + pixelY * 256;
      const [ r, g, b ] = [ buf[ t * ch ], buf[ t * ch + 1 ], buf[ t * ch + 2 ] ];
      return new Promise((resolve, reject) => {
        resolve( [r, g, b] );
      });
    });
  
}

/* 
 * 色の rgb 値から、情報を付与する。
 */
const infoFromColor = ( r, g, b ) => {
  
  if(r == 247, g == 245, b == 169){
    return {"rank": 1, "interval": "<0.5", "r":r, "g": g, "b": b};
  }else if(r == 255, g == 216, b == 192){
    return {"rank": 2, "interval": "0.5-3", "r":r, "g": g, "b": b};
  }else if(r == 255, g == 183, b == 183){
    return {"rank": 3, "interval": "3-5", "r":r, "g": g, "b": b};
  }else if(r == 255, g == 145, b == 145){
    return {"rank": 4, "interval": "5-10", "r":r, "g": g, "b": b};
  }else if(r == 242, g == 133, b == 201){
    return {"rank": 5, "interval": "10-20", "r":r, "g": g, "b": b};
  }else if(r == 220, g == 122, b == 220){
    return {"rank": 6, "interval": "20<", "r":r, "g": g, "b": b};
  }else if(r == 0, g == 0, b == 0){
    return {"rank": -99, "interval": "#no-pixel", "r":r, "g": g, "b": b}; // no data in cell
  }else if(r == 1, g == 1, b == 1){
    return {"rank": -99, "interval": "#no-tile", "r":r, "g": g, "b": b}; // no tile
  }else{
    return {"rank": -99, "interval": "#not-match", "r":r, "g": g, "b": b}; // not match table
  }
  
  /*****************************
  <0.5  #F7F5A9 247, 245, 169
  0.5-3 #FFD8C0 255, 216, 192
  3-5   #FFB7B7 255, 183, 183
  5-10  #FF9191 255, 145, 145
  10-20 #F285C9 242, 133, 201
  20<   #DC7ADC 220, 122, 220
  
  ???
  0.5-1         248, 225, 166
  
  *****************************/
  
}

/* 
 * ラインデータの代表点の経緯度を返す。
 */
const makeLineRepresentative = (coords) => {
  
  if(coords.length == 2){
    const point = [
      (coords[0][0] + coords[1][0]) / 2,
      (coords[0][1] + coords[1][1]) / 2
    ];
    return point;
  }
  
  if(coords.length > 2){
    const point = coords[Math.ceil(coords.length/2) - 1];
    return point;
  }
  
  return null;
  
}



/* 
 * 出典：
 * 「重ねるハザードマップ」のデータ配信について
 * https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html
 * 洪水浸水想定区域（想定最大規模）、高潮浸水想定区域
 */
const url = `https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png`;
//const url = `https://disaportaldata.gsi.go.jp/raster/03_hightide_l2_shinsuishin_data/{z}/{x}/{y}.png`;


const geojson = {
  "type": "FeatureCollection",
  "features": []
};

const dataText = fs.readFileSync("./data/N02-22_Station.geojson", "utf-8");
const data = JSON.parse(dataText);

const promiseSet = [];

/* 
 * rgb 値から得られた情報を GeoJSON へ付与する。
 */
const bindRgbInfo = ( f, rgb ) => {
  const info = infoFromColor(...rgb);
  f.properties = { ...f.properties, ...info  };
  geojson.features.push(f);
  
  console.log(`${f.properties["N02_005"]}`);
  return(`${f.properties["N02_005"]}`);
}

/* 
 * 地物（線）のリストから代表点と抽出し、
 * 代表点を含むラスタタイルを取得し、
 * 代表点に相当するピクセルの色を取得する。
 */
data.features.forEach( f => {
  
  const point = makeLineRepresentative(f.geometry.coordinates);
  if( !point || 
      point[0] < 139.658203 || //139.746437
      point[0] > 140.009422 ||
      point[1] < 35.603440 ||
      point[1] > 35.817535
  ){
    return;
  }
  
  const ff = {
    "type": "Feature",
    "geometry": { "type": "Point", "coordinates": point},
    "properties": f.properties
  };
  
  const pm = getRasterPixel(point, url, 17)
    .then( rgb => {
      
      return( bindRgbInfo(ff, rgb) );
      
    })
    .catch( e => {
      
      console.log(`Error: ${JSON.stringify(ff.properties)}`);
      console.log(e);
      
      return( bindRgbInfo(ff, [1, 1, 1]) );
      
    });
  
  promiseSet.push(pm);
  
});

/* 
 * 全ての地物の処理が終わったら結果を書き出す。
 */
Promise.all(promiseSet)
  .then( values => {
    fs.writeFile(`./result.json`, JSON.stringify(geojson), (e) => {
      if(e){
        console.log(`ERROR ${z}/${x}/${y} (write file)`);
        console.error(e);
      }
    });
    console.log(values);
    console.log(`COMPLETED`);
  })
  .catch( e => {
    console.log(`ERROR`);
    console.log(e);
  });


