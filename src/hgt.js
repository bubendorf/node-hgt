var fs = require('fs'),
    extend = require('extend'),
    _latLng = require('./latlng'),
	spline = require('cubic-spline');

function Hgt(path, swLatLng, options) {
    var fd = fs.openSync(path, 'r'),
        stat;

    try {
        stat = fs.fstatSync(fd);

        this.options = extend({}, {
            interpolation: Hgt.bicubic
        }, options);

        if (stat.size === 12967201 * 2) {
            this._resolution = 1;
            this._size = 3601;
        } else if (stat.size === 1442401 * 2) {
            this._resolution = 3;
            this._size = 1201;
        } else if (stat.size === 0) {
            this._resolution = 0;
            this._size = 0;
        } else {
            throw new Error('Unknown tile format (1 arcsecond and 3 arcsecond supported).');
        }

        this._buffer = fs.readFileSync(fd);
        this._swLatLng = _latLng(swLatLng);
    } finally {
        fs.closeSync(fd);
    }
}

Hgt.nearestNeighbour = function(row, col) {
    return this._rowCol(Math.round(row), Math.round(col));
};

Hgt.bilinear = function(row, col) {
    var avg = function(v1, v2, f) {
            return v1 + (v2 - v1) * f;
        },
        rowLow = Math.floor(row),
        rowHi = rowLow + 1,
        rowFrac = row - rowLow,
        colLow = Math.floor(col),
        colHi = colLow + 1,
        colFrac = col - colLow,
        v00 = this._rowCol(rowLow, colLow),
        v10 = this._rowCol(rowLow, colHi),
        v11 = this._rowCol(rowHi, colHi),
        v01 = this._rowCol(rowHi, colLow),
        v1 = avg(v00, v10, colFrac),
        v2 = avg(v01, v11, colFrac);

    // console.log('row = ' + row);
    // console.log('col = ' + col);
    // console.log('rowLow = ' + rowLow);
    // console.log('rowHi = ' + rowHi);
    // console.log('rowFrac = ' + rowFrac);
    // console.log('colLow = ' + colLow);
    // console.log('colHi = ' + colHi);
    // console.log('colFrac = ' + colFrac);
    // console.log('v00 = ' + v00);
    // console.log('v10 = ' + v10);
    // console.log('v11 = ' + v11);
    // console.log('v01 = ' + v01);
    // console.log('v1 = ' + v1);
    // console.log('v2 = ' + v2);

    return avg(v1, v2, rowFrac);
};

Hgt.bicubic = function(row, col) {
    var cubic = function(p0, p1, p2, p3, x) {
			return p1 + 0.5 * x * (p2 - p0 + x * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + x * (3.0 * (p1 - p2) + p3 - p0)));
		},
        rowLow = Math.floor(row),
        rowFrac = row - rowLow,
        colLow = Math.floor(col),
        colFrac = col - colLow,
        v00 = this._rowCol(rowLow - 1, colLow - 1),
        v01 = this._rowCol(rowLow - 1, colLow),
        v02 = this._rowCol(rowLow - 1, colLow + 1),
        v03 = this._rowCol(rowLow - 1, colLow + 2),
        v10 = this._rowCol(rowLow, colLow - 1),
        v11 = this._rowCol(rowLow, colLow),
        v12 = this._rowCol(rowLow, colLow + 1),
        v13 = this._rowCol(rowLow, colLow + 2),
        v20 = this._rowCol(rowLow + 1, colLow - 1),
        v21 = this._rowCol(rowLow + 1, colLow),
        v22 = this._rowCol(rowLow + 1, colLow + 1),
        v23 = this._rowCol(rowLow + 1, colLow + 2),
        v30 = this._rowCol(rowLow + 2, colLow - 1),
        v31 = this._rowCol(rowLow + 2, colLow),
        v32 = this._rowCol(rowLow + 2, colLow + 1),
        v33 = this._rowCol(rowLow + 2, colLow + 2),
        v0 = cubic(v00, v01, v02, v03, colFrac),
        v1 = cubic(v10, v11, v12, v13, colFrac),
        v2 = cubic(v20, v21, v22, v23, colFrac),
        v3 = cubic(v30, v31, v32, v33, colFrac);

/*		console.log('row=' + row + ' col=' + col);
		console.log('v00=' + v00 + ', v01=' + v01 + ', v02=' + v02 + ', v03=' + v03 + ' ==> v0=' + v0);
		console.log('v10=' + v10 + ', v11=' + v11 + ', v12=' + v12 + ', v13=' + v13 + ' ==> v1=' + v1);
		console.log('v20=' + v20 + ', v21=' + v21 + ', v22=' + v22 + ', v23=' + v23 + ' ==> v2=' + v2);
		console.log('v30=' + v30 + ', v31=' + v31 + ', v32=' + v32 + ', v33=' + v33 + ' ==> v3=' + v3);*/
		
/*		var h0 = cubic(v00, v10, v20, v30, rowFrac),
        h1 = cubic(v01, v11, v21, v31, rowFrac),
        h2 = cubic(v02, v12, v22, v32, rowFrac),
        h3 = cubic(v03, v13, v23, v33, rowFrac),
        vv =  cubic(v0, v1, v2, v3, rowFrac),
        hh =  cubic(h0, h1, h2, h3, colFrac);		
		console.log('vv=' + vv + ', hh=' + hh);*/
		
		return cubic(v0, v1, v2, v3, rowFrac);
};

Hgt.spline = function(row, col) {
        const rowLow = Math.floor(row);
        const rowFrac = row - rowLow;
        const colLow = Math.floor(col);
        const colFrac = col - colLow;
		
		const points = 8;
		
		var xr = [];
		var yr = [];
		for (rowIndex = rowLow - points / 2 + 1; rowIndex <= rowLow + points / 2; rowIndex++) {

			var xc = [];
			var yc = [];
			for (colIndex = colLow - points / 2 + 1; colIndex <= colLow + points / 2; colIndex++) {
				var height = this._rowCol(rowIndex, colIndex);
//				console.log('height=' + height);
				xc.push(colIndex);
				yc.push(height);
			}
			var rowHeight = spline(col, xc, yc);
//			console.log('rowHeight=' + rowHeight);
			xr.push(rowIndex);
			yr.push(rowHeight);
		}

		return spline(row, xr, yr);
}

Hgt.prototype.destroy = function() {
    delete this._buffer;
};

Hgt.prototype.getElevation = function(latLng) {
    if (this._size == 0) {
	return 0;
    }
    var size = this._size - 1,
        ll = _latLng(latLng),
        row = (ll.lat - this._swLatLng.lat) * size,
        col = (ll.lng - this._swLatLng.lng) * size;

    if (row < 0 || col < 0 || row > size || col > size) {
        throw new Error('Latitude/longitude is outside tile bounds (row=' +
            row + ', col=' + col + '; size=' + size);
    }

    return this.options.interpolation.call(this, row, col);
};

Hgt.prototype._rowCol = function(row, col) {
    var size = this._size;
//	console.log("Pre  row=" + row + ", col=" + col + ", size=" + size);
// Prevent OutOfBounds problems: Not perfect, but good enough
    row = Math.min(Math.max(row, 0), size - 1);
    col = Math.min(Math.max(col, 0), size - 1);
//	console.log("Post row=" + row + ", col=" + col);
    var offset = ((size - row - 1) * size + col) * 2;

    return this._buffer.readInt16BE(offset);
};

module.exports = Hgt;
