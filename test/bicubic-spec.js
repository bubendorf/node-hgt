var test = require('tape'),
    almostEqual = function(t, actual, expected, delta, msg) {
        var d = Math.abs(actual - expected);
        delta = delta || 1e-9;
        if (d > delta) {
            t.equal(actual, expected, msg);
        } else {
            t.ok(true, 'Should be almost equal');
        }
    },
    Hgt = require('../').Hgt;



test('can interpolate the top of Switzerland (Dom)', function(t) {
    var hgt = new Hgt(__dirname + '/data/N46E007.hgt', [46, 7], {
        interpolation: Hgt.bicubic
    });

    almostEqual(t, hgt.getElevation([46.09403, 7.85883]), 4530.253052367);
    almostEqual(t, hgt.getElevation([46.0940278, 7.8587501]), 4527.823842628);

    hgt.destroy();
    t.end();
});
