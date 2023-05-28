import child_process from 'child_process';
import fs from 'fs';


const dataText = fs.readFileSync("./stations-kozui-l2-v2.json", "utf-8");
const data = JSON.parse(dataText);

const geojson = {
  "type": "FeatureCollection",
  "features": []
};

const rgb2hex = (r, g, b) => {
  const rr = r.toString(16).padStart(2,'0');
  const gg = g.toString(16).padStart(2,'0');
  const bb = b.toString(16).padStart(2,'0');
  return `#${rr}${gg}${bb}`;
}

data.features.forEach( f => {
  
  const style = {
    "_markerType": "CircleMarker",
    "_color": "#000000",
    "_opacity": 0.5,
    "_weight": 1,
    "_fillColor": (f.properties.r>1 && f.properties.g>1 && f.properties.b>1) ? rgb2hex(f.properties.r, f.properties.g, f.properties.b) : "#FFFFFF",
    "_fillOpacity": 1,
    "_radius": 4,
  };
  
  f.properties = { ...f.properties, ...style };
  if(f.properties.rank < 0) f.properties.rank = -99;
  
  geojson.features.push(f);
  
});

fs.writeFile(`./stations-kozui-l2-with-gsistyle.geojson`, JSON.stringify(geojson), (e) => {
  if(e){
    console.log(`ERROR ${z}/${x}/${y} (write file)`);
    console.error(e);
  }
});

