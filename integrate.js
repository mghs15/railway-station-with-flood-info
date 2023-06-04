import child_process from 'child_process';
import fs from 'fs';

const allset = {
  "flood" : JSON.parse(fs.readFileSync("./resultLineupStationsKozui.json", "utf-8")),
  "tsunami" : JSON.parse(fs.readFileSync("./resultLineupStationsTsunami.json", "utf-8")),
  "hightide" : JSON.parse(fs.readFileSync("./resultLineupStationsTakashio.json", "utf-8"))
};

const resSet = {};

console.log(allset);

for( const hazard in allset ){
  const companySet = allset[hazard];
  for( const company in companySet ){
    const lineSet = companySet[company];
    for( const line in lineSet ){
      const stations = lineSet[line];
      stations.forEach( station => {
        const stationName = station.properties.N02_005;
        if(!resSet[company]) resSet[company] = {};
        if(!resSet[company][line]) resSet[company][line] = {};
        if(!resSet[company][line][stationName]) resSet[company][line][stationName] = {
          "type": station.type,
          "geometry": station.geometry,
          "properties": {
            "N02_001": station.properties.N02_001,
            "N02_002": station.properties.N02_002,
            "N02_003": station.properties.N02_003,
            "N02_004": station.properties.N02_004,
            "N02_005": station.properties.N02_005,
            "N02_005c": station.properties.N02_005c,
            "N02_005g": station.properties.N02_005g
          }
        }
        
        resSet[company][line][stationName].properties[`${hazard}-r`] = station.properties.r;
        resSet[company][line][stationName].properties[`${hazard}-g`] = station.properties.g;
        resSet[company][line][stationName].properties[`${hazard}-b`] = station.properties.b;
        
      });
    }
  }
}

const result = JSON.parse(JSON.stringify(allset.flood));
for( const company in result ){
  const lineSet = result[company];
  for( const line in lineSet ){
    const stations = lineSet[line];
    stations.forEach( station => {
      const stationName = station.properties.N02_005;
      
      delete station.properties.r;
      delete station.properties.g;
      delete station.properties.b;
      delete station.properties.rank;
      delete station.properties.interval;
      
      ["flood", "hightide", "tsunami"].forEach( hazard => {
        const r = resSet[company][line][stationName].properties[`${hazard}-r`];
        const g = resSet[company][line][stationName].properties[`${hazard}-g`];
        const b = resSet[company][line][stationName].properties[`${hazard}-b`];
        station.properties[`${hazard}-r`] = (r>1) ? r : 255;
        station.properties[`${hazard}-g`] = (g>1) ? g : 255;
        station.properties[`${hazard}-b`] = (b>1) ? b : 255;
      });
      
    });
  }
}


fs.writeFile(`./resultLineupStationsIntegrated.json`, JSON.stringify(result, null, 2), (e) => {
  if(e){
    console.error(e);
  }
});

