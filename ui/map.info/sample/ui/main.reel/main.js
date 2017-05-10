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
    },

    bounds: {
        get: function () {
            return this._bounds;
        },
        set: function (value) {
            this._bounds = value;
            console.log("Set main's bounds with value (", value, ")");
        }
    },

    center: {
        get: function () {
            return this._center;
        },
        set: function (value) {
            this._center = value;
            console.log("Set main's center with value (", value.coordinates, ")");
        }
    },

    zoom: {
        get: function () {
            return this._zoom;
        },
        set: function (value) {
            this._zoom = value;
            console.log("Setting main's zoom level with value (", value, ")");
        }
    }

});
