var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    extend = require('extend'),
    Promise = require('promise'),
    request = require('request'),
    yauzl = require('yauzl'),
    _latLng = require('./latlng');

function ImagicoElevationDownloader(cacheDir, options) {
    this.options = extend({}, options);
    this._cacheDir = cacheDir;
    this._downloads = {};
}

ImagicoElevationDownloader.prototype.download = function(tileKey, latLng, cb) {
console.log('ImagicoElevationDownloader.download(' + tileKey + ', ' + JSON.stringify(latLng) + ')');
    var cleanup = function() {
            delete this._downloads[tileKey];
            fs.unlinkSync(tempPath);
        }.bind(this),
        download = this._downloads[tileKey],
        tempPath,
        stream;

    if (!download) {
        download = this.search(latLng)
            .then(function(tileZips) {
                if (!tileZips.length) {
                    throw new Error('No tiles found for latitude ' + latLng.lat + ', longitude ' + latLng.lng);
                }

console.log('Found ' + JSON.stringify(tileZips));
                tempPath = path.join(os.tmpdir(), tileZips[0].name);
console.log('Download ' + tileZips[0].link + ' to ' + tempPath);
                stream = fs.createWriteStream(tempPath);
                return this._download(tileZips[0].link, stream);
            }.bind(this))
            .then(function() {
                return this._unzip(tempPath, this._cacheDir);
            }.bind(this))
            .then(cleanup)
            .catch(function(err) {
                cleanup();
                throw err;
            });
        this._downloads[tileKey] = download;
    }

    download.then(function() {
        cb(undefined);
    }).catch(function(err) {
        cb(err);
    });
};

ImagicoElevationDownloader.prototype.search = function(latLng) {
    var ll = _latLng(latLng);
    return new Promise(function(fulfill, reject) {

console.log('Search http://www.imagico.de/map/dem_json.php?date=&lon=' +
            ll.lng + '&lat=' + ll.lat + '&lonE=' + ll.lng +
            '&latE=' + ll.lat + '&vf=1');

        request('http://www.imagico.de/map/dem_json.php?date=&lon=' +
            ll.lng + '&lat=' + ll.lat + '&lonE=' + ll.lng +
            '&latE=' + ll.lat + '&vf=1', function(err, response, body) {
                if (!err && response.statusCode === 200) {
                    try {
                        var data = JSON.parse(body);
                        fulfill(data);
                    } catch (e) {
                        reject('Could not parse response from imagico: ' + body);
                    }
                } else {
                    reject(err || response);
                }
            });
    });
};

ImagicoElevationDownloader.prototype._download = function(url, stream) {
    return new Promise(function(fulfill, reject) {
        request(url, function(err, response) {
            if (!err && response.statusCode === 200) {
                fulfill(stream);
            } else {
                reject(err || response);
            }
        }).pipe(stream);
    });
};

ImagicoElevationDownloader.prototype._unzip = function(zipPath, targetPath) {
console.log('Unzip ' + zipPath + ' to ' + targetPath);
    return new Promise(function(fulfill, reject) {
        var unzips = [];

        yauzl.open(zipPath, function(err, zipfile) {
            if (err) {
                reject(err);
                return;
            }
            zipfile
            .on('entry', function(entry) {
                if (/\/$/.test(entry.fileName)) {
                    return;
                }
                zipfile.openReadStream(entry, function(err, readStream) {
                    var lastSlashIdx = entry.fileName.lastIndexOf('/'),
                        fileName = entry.fileName.substr(lastSlashIdx + 1),
                        filePath = path.join(targetPath, fileName);
console.log('Unzipping ' + entry.fileName + ' to ' + filePath);
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (fs.existsSync(filePath)) {
                        console.log('File already exists. Skipping it.');
                        return;
                    }
                    unzips.push(new Promise(function(fulfill, reject) {
                        readStream.on('end', fulfill);
                        readStream.on('error', reject);
                    }));
                    readStream.pipe(fs.createWriteStream(filePath));
                });
            });
            zipfile.on('end', function() {
                Promise.all(unzips)
                    .then(function() {
                        fulfill();
                    })
                    .catch(reject);
            });
        });
    });
};

module.exports = ImagicoElevationDownloader;
