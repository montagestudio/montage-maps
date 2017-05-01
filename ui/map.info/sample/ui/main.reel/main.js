var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox;

/**
 * @class Main
 * @extends Component
 */
exports.Main = Component.specialize(/** @lends Main.prototype */ {

    maxBounds: {
        get: function () {
            return BoundingBox.withCoordinates(-20, -20, 20, 20);
        }
    }

});
