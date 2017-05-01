var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox,
    LeafletEngine = require("ui/leaflet-engine.reel").LeafletEngine,
    Point = require("montage-geo/logic/model/point").Point;

/**
 * @class Map
 * @extends Component
 */
exports.Map = Component.specialize(/** @lends Map# */ {

    /*****************************************************
     * Properties
     */

    bounds: {
        value: undefined
    },

    center: {
        get: function () {
            return this._center;
        },
        set: function (value) {
            if (Array.isArray(value)) {
                value = Point.withCoordinates(value);
            }
            if (value) this._center = value;
        }
    },

    maxBounds: {
        get: function () {
            return this._maxBounds;
        },
        set: function (value) {
            if (Array.isArray(value)) {
                value = BoundingBox.withCoordinates.apply(BoundingBox, value);
            }
            this._maxBounds = value;
        }
    },

    zoom: {
        get: function () {
            return this._zoom;
        },
        set: function (value) {
            if (!isNaN(value)) {
                this._zoom = value;
            }
        }
    },

    /*****************************************************
     * Private Variables
     */

    _engine: {
        get: function () {
            if (!this.__engine) {
                this.__engine = new LeafletEngine();
                // this.__engine.maxBounds = BoundingBox.withCoordinates(-20, -20, 20, 20);
                this.__engine.maxBounds = this.maxBounds || BoundingBox.withCoordinates(
                    -Infinity, -85.05112878, Infinity, 85.05112878
                );
                this.defineBindings({
                    "bounds": {"<->": "bounds", source: this.__engine},
                    "zoom": {"<->": "zoom", source: this.__engine},
                    "center": {"<->": "center", source: this.__engine}
                });
            }
            return this.__engine;
        },
        set: function (value) {
            if (value && value !== this.__engine) {
                this.cancelBinding("bounds");
                this.cancelBinding("center");
                this.cancelBinding("zoom");
                this.__engine = value;
                this.defineBindings({
                    "bounds": {"<->": "bounds", source: this.__engine},
                    "zoom": {"<->": "zoom", source: this.__engine},
                    "center": {"<->": "center", source: this.__engine}
                });
            }
        }
    },

    // In the future, this will be used to specify the current engine.
    _engineKey: {
        value: undefined
    },

    /**
     * Sets this map to the specified bounds.
     * @method
     * @param {BoundingBox || array<number>} bounds - The bounds to move this map to.
     */
    setBounds: {
        value: function () {
            var bbox;
            if (arguments.length === 1) {
                bbox = arguments[0].bbox;
            } else {
                bbox = arguments;
            }
            this.dispatchBeforeOwnPropertyChange("bounds", this.bounds);
            this.bounds.xMin = bbox[0];
            this.bounds.yMin = bbox[1];
            this.bounds.xMax = bbox[2];
            this.bounds.yMax = bbox[3];
            this.dispatchOwnPropertyChange("bounds", this.bounds);
        }
    },

    setCenter: {
        value: function (longitude, latitude) {
            var position = this.center.coordinates;
            this.dispatchBeforeOwnPropertyChange("center", this.center);
            position.longitude = longitude;
            position.latitude = latitude;
            this.dispatchOwnPropertyChange("center", this.center);
        }
    },

    setZoom: {
        value: function (value) {
            this.zoom = value;
        }
    }

});
