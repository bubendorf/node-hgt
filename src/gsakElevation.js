#!/usr/bin/env node

// Parse the command line
const argv = require('minimist')(process.argv.slice(2), {
  string: [ 'database', 'hgt' ],
  boolean: [ ],
  alias: { h: 'help',
           f: 'force',
           v: 'verbose' },
});
//console.log(argv);

if (argv.h || argv.help) {
  console.log('usage: gsakElevation [-h|--help] [-f|--force] [-v|--verbose] [--database database] [--hgt HGT-Folder]');
  process.exit(1);
}

const sqlite3 = require('sqlite3').verbose();
//const TileSet = require('node-hgt').TileSet;
const TileSet = require('.').TileSet;
const fs = require('fs');
//const ImagicoElevationDownloader = require('node-hgt').ImagicoElevationDownloader;
const ImagicoElevationDownloader = require('.').ImagicoElevationDownloader;

const tilesPath = argv.hgt ? argv.hgt : 'C:/Geo/GCRouter/data/dem/99-Download';
fs.accessSync(tilesPath, fs.constants.R_OK);
const tileDownloader = new ImagicoElevationDownloader(tilesPath);
const tiles = new TileSet(tilesPath, {
	downloader:tileDownloader
});

const dbPath = argv.database ? argv.database : 'C:/Users/Markus/AppData/Roaming/GSAK8/data/Default/sqlite.db3';
fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
const db = new sqlite3.Database(dbPath);
console.log('Connected to the database at ' + dbPath);

let updateCount = 0;

async function updateElevation(row) {
	if (argv.verbose) {
		console.log('Processing ' + row.Code + ' (' + row.Latitude + ', ' + row.Longitude + ')');
	}
	tiles.getElevation([row.Latitude, row.Longitude], function (err, elevation) {
		if (err) {
			console.log('Error: ' + JSON.stringify(err));
		} else {
//        console.log('[' + Number(row.Latitude).toFixed(6) + ", " + Number(row.Longitude).toFixed(6) + " ==> " +  elevation.toFixed(1) + "m");
			const ele = elevation.toFixed(1);
			if (argv.force || ele !== row.Elevation || row.Resolution !== 'GCRouter') {
				console.log('Update ' + row.Code + ' from ' + row.Elevation + 'm to ' + ele + 'm');
				let sqlUpdate = "update Caches set Elevation=" + ele + ", Resolution='GCRouter' where code='" + row.Code + "';";
//                console.log(sqlUpdate);
				db.run(sqlUpdate);
				updateCount++;
			}
		}
	});
}

async function updateAllRows(rows) {
	await Promise.all(rows.map(updateElevation));
}

async function updateAll() {
	let sql = "select Code, Latitude, Longitude, Elevation from Caches";
	if (!argv.force) {
	  sql = sql + " where Resolution <> 'GCRouter'";
	}
	sql = sql + " order by round(Latitude-0.5), Longitude+0.0;";

	db.all(sql, [], (err, rows) => {
		if (err) {
			throw err;
		}

		// Keep the next line. The program throws a seg fault otherwise!
		db.run('update Caches set Elevation=376.8 where code=\'xxxxxx\';');
		updateAllRows(rows);
	});
}

updateAll();

db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Updated ' + updateCount + ' elevations.');
});
