var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox,
    LeafletEngine = require("ui/leaflet-engine.reel").LeafletEngine,
    Point = require("montage-geo/logic/model/point").Point;

var MAX_BOUNDS = BoundingBox.withCoordinates(
    -Infinity, -85.05112878, Infinity, 85.05112878
);

/**
 * @class Map
 * @extends Component
 */
exports.Map = Component.specialize(/** @lends Map# */ {

    /**************************************************************************
     * Properties
     */

    /**
     * The current bounds of the map.
     *
     * @type {BoundingBox}
     */
    bounds: {
        value: undefined
    },

    /**
     * The current center of the map.  Setting this value will update the map's
     * position.
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

    /**
     * @type {BoundingBox}
     */
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

    /**************************************************************************
     * Private Variables
     */

    _engine: {
        get: function () {
            var engine;
            if (!this.__engine) {
                engine = new LeafletEngine();
                engine.maxBounds = this.maxBounds || MAX_BOUNDS;
                this._startEngine(engine);
                this.__engine = engine;
            }
            return this.__engine;
        },
        set: function (value) {
            if (value && value !== this.__engine) {
                this._shutdownEngine(this.__engine);
                this.__engine = value;
                this._startEngine(value);
            }
        }
    },

    _shutdownEngine: {
        value: function (engine) {
            if (engine) {
                this._cancelEngineBindings(engine);
                this._clearEngineFeatures(engine);
                this._removeEngineEventListeners(engine);
            }
        }
    },

    _startEngine: {
        value: function (engine) {
            this._defineEngineBindings(engine);
            this._drawAllFeatures(engine);
            this._addEngineEventListeners(engine);
        }
    },
    
    _defineEngineBindings: {
        value: function (engine) {
            this.defineBindings({
                "bounds": {"<-": "bounds", source: engine},
                "center": {"<->": "center", source: engine},
                "zoom": {"<->": "zoom", source: engine}
            });
        }
    },

    _cancelEngineBindings: {
        value: function (engine) {
            this.cancelBinding("bounds");
            this.cancelBinding("center");
            this.cancelBinding("zoom");
        }
    },

    _clearEngineFeatures: {
        value: function (engine) {
            var iterator = this._features.values(),
                feature;
            while (feature = iterator.next().value) {
                engine.eraseFeature(feature);
            }
        }
    },

    _drawAllFeatures: {
        value: function (engine) {
            var iterator = this._features.values(),
                feature;
            while (feature = iterator.next().value) {
                engine.drawFeature(feature);
            }
        }
    },

    _removeEngineEventListeners: {
        value: function (engine) {
            engine.removeEventListener("didZoom", this);
            engine.removeEventListener("willZoom", this);
            engine.removeEventListener("featureMouseout", this);
            engine.removeEventListener("featureMouseover", this);
            engine.removeEventListener("featureSelection", this);
        }
    },

    // In the future, this will be used to specify the current engine.
    _engineKey: {
        value: undefined
    },

    _addEngineEventListeners: {
        value: function (engine) {
            engine.addEventListener("didZoom", this);
            engine.addEventListener("willZoom", this);
            engine.addEventListener("featureMouseout", this);
            engine.addEventListener("featureMouseover", this);
            engine.addEventListener("featureSelection", this);
        }
    },

    /**************************************************************************
     * Event Handlers
     */

    handleDidZoom: {
        value: function (event) {
            event.stopPropagation();
            this.dispatchEventNamed("didZoom", true, true, event.detail);
        }
    },

    handleWillZoom: {
        value: function (event) {
            event.stopPropagation();
            this.dispatchEventNamed("willZoom", true, true, event.detail);
        }
    },

    handleFeatureMouseout: {
        value: function (event) {
            event.stopPropagation();
            this.dispatchEventNamed("featureMouseout", true, true, event.detail);
        }
    },

    handleFeatureMouseover: {
        value: function (event) {
            event.stopPropagation();
            this.dispatchEventNamed("featureMouseover", true, true, event.detail);
        }
    },

    handleFeatureSelection: {
        value: function (event) {
            event.stopPropagation();
            this.dispatchEventNamed("featureSelection", true, true, event.detail);
        }
    },

    /**************************************************************************
     * API
     */

    /**
     * Adds a feature to the map.
     * @param {Feature}
     * @param {boolean} [processImmediately = false] If true will execute the
     *                  command without using the deferred draw loop.
     */
    drawFeature: {
        value: function (feature, processImmediately) {
            if (this._engine) {
                this._engine.drawFeature(feature, processImmediately);
            }
            if (!this._features.has(feature)) {
                this._features.add(feature);
            }
        }
    },

    /**
     * Redraws a feature on the map.
     * @param {Feature}
     * @param {boolean} [processImmediately = false] If true will execute the
     *                  command without using the deferred draw loop.
     */
    redrawFeature: {
        value: function (feature, processImmediately) {
            if (this._engine && this._features.has(feature)) {
                this._engine.redrawFeature(feature, processImmediately);
            }
        }
    },

    /**
     * Removes a feature from the map.
     * @param {Feature}
     * @param {boolean} [processImmediately = false] If true will execute the
     *                  command without using the deferred draw loop.
     */
    eraseFeature: {
        value: function (feature, processImmediately) {
            if (this._engine) {
                this._engine.eraseFeature(feature, processImmediately);
            }
            if (this._features.has(feature)) {
                this._features.delete(feature);
            }
        }
    },

    _features: {
        get: function () {
           if (!this.__features) {
               this.__features = new Set();
           }
           return this.__features;
        }
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

    /**
     * @method
     * @param {number} zoom level
     */
    setZoom: {
        value: function (value) {
            this.zoom = value;
        }
    }

});
