var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox,
    LeafletEngine = require("ui/leaflet-engine.reel").LeafletEngine;

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
        value: undefined
    },

    zoom: {
        value: undefined
    },

    /*****************************************************
     * Private Variables
     */

    _engine: {
        get: function () {
            if (!this.__engine) {
                this.__engine = new LeafletEngine();
                this.__engine.maxBounds = BoundingBox.withCoordinates(
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

    _engineKey: {
        value: undefined
    },

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
