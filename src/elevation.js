#!/usr/bin/env node

// Parse the command line
const argv = require('minimist')(process.argv.slice(2), {
  string: [ 'hgt' ],
  boolean: [ ],
  alias: { h: 'help',
           v: 'verbose' },
});
//console.log(argv);

//console.log(argv._.length);

if (argv.h || argv.help || (argv._.length != 2 && argv._.length != 4 && argv._.length != 6)) {
  console.log('usage: elevation [-h|--help] [-v|--verbose] [--hgt HGT-Folder] lat lon');
  process.exit(1);
}

const TileSet = require('.').TileSet;
const fs = require('fs');
const ImagicoElevationDownloader = require('.').ImagicoElevationDownloader;

const tilesPath = argv.hgt ? argv.hgt : '/opt/brouter/hgt';
fs.accessSync(tilesPath, fs.constants.R_OK);
const tileDownloader = new ImagicoElevationDownloader(tilesPath);
const tileset = new TileSet(tilesPath, {
        downloader:tileDownloader
});

var lat = 0;
var lon = 0;

if (argv._.length == 2) {
  lat = parseFloat(argv._[0]);
  lon = parseFloat(argv._[1]);
} else if (argv._.length == 4) {
  lat = abs(parseFloat(argv._[0])) + abs(parseFloat(argv._[1]/60));
  lat = sign(argv._[0]) * lat;
  lon = abs(parseFloat(argv._[2])) + abs(parseFloat(argv._[3]/60));
  lon = sign(argv._[2]) * lon;
} else if (argv._.length == 6) {
  lat = abs(parseFloat(argv._[0])) + abs(parseFloat(argv._[1]/60)) + abs(parseFloat(argv._[2]/3600));
  lat = sign(argv._[0]) * lat;
  lon = abs(parseFloat(argv._[3])) + abs(parseFloat(argv._[4]/60)) + abs(parseFloat(argv._[5]/3600));
  lon = sign(argv._[3]) * lon;
}
//console.log('lat=' + lat + ', lon=' + lon);

tileset.getElevation([lat, lon], function(err, elevation) {
  if (err) {
    console.log('getElevation failed: ' + err.message);
   } else {
     console.log(elevation.toFixed(1));
   }
});

function sign(x) {
  return x ? x < 0 ? -1 : 1 : 0;
}

function abs(x) {
  return Math.abs(x);
}

