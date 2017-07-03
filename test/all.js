console.log('montage-testing', 'Start');
module.exports = require("montage-testing").run(require, [
    "spec/cluster-organizer",
    "spec/feature-cluster",
    "spec/point"

]).then(function () {
    console.log('montage-testing', 'End');
}, function (err) {
    console.log('montage-testing', 'Fail', err, err.stack);
});
