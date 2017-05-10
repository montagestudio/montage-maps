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

    /**
     * The current bounds of the map.  To set this value use
     * Map#setBounds
     *
     * @type {BoundingBox}
     */
    bounds: {
        value: undefined
    },

    /**
     * The current center of the map.  Setting this value will
     * update the map's position.
     *
     * @type {Point}
     */
    center: {
        get: function () {
            return this._center;
        },
        set: function (value) {
            if (Array.isArray(value) && value.length > 1) {
                value = Point.withCoordinates(value);
            }
            if (value && value instanceof Point) {
                this._center = value;
            }
        }
    },

    maxBounds: {
        get: function () {
            return this._maxBounds;
        },
        set: function (value) {
            if (Array.isArray(value) && value.length === 4) {
                value = BoundingBox.withCoordinates(value[0], value[1], value[2], value[3]);
            }
            if (value instanceof BoundingBox) {
                this._maxBounds = value;
            }
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
                this.__engine.maxBounds = this.maxBounds || BoundingBox.withCoordinates(
                    -Infinity, -85.05112878, Infinity, 85.05112878
                );
                this.defineBindings({
                    "bounds": {"<-": "bounds", source: this.__engine},
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
                    "bounds": {"<-": "bounds", source: this.__engine},
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
            var newBounds;
            if (arguments.length === 1 && arguments[0] instanceof BoundingBox) {
                newBounds = arguments[0]
            } else if (arguments.length === 4) {
                newBounds = BoundingBox.withCoordinates(arguments[0], arguments[1], arguments[2], arguments[3]);
            }
            if (newBounds) {
                this.bounds = newBounds;
            }
        }
    },

    /**
     * Center the map on the specified position.  The position can either be a
     * Point object or a pair of coordinates.
     * @method
     * @param {Point || number} bounds|longitude
     * @param {?number} latitude
     */
    setCenter: {
        value: function () {
            var newCenter;
            if (arguments.length === 1 && arguments[0] instanceof Point) {
                newCenter = arguments[0];
            } else if (arguments.length === 2) {
                newCenter = Point.withCoordinates([arguments[0], arguments[1]]);
            }
            if (newCenter) {
                this.center = newCenter;
            }
        }
    },

    setZoom: {
        value: function (value) {
            this.zoom = value;
        }
    }

});
