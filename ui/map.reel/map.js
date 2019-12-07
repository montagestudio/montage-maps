var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox,
    LeafletEngine = require("ui/leaflet-engine.reel").LeafletEngine,
    Point = require("montage-geo/logic/model/point").Point,
    Promise = require("montage/core/promise").Promise;

var MAX_BOUNDS = BoundingBox.withCoordinates(
    -Infinity, -85.05112878, Infinity, 85.05112878
);

/**
 * @class Map
 * @extends Component
 */
exports.Map = Component.specialize(/** @lends Map# */ {

    constructor: {
        value: function Map() {
            this.addRangeAtPathChangeListener("overlays", this);
        }
    },

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

    overlays: {
        get: function () {
            if (!this._overlays) {
                this._overlays = [];
            }
            return this._overlays;
        },
        set: function (value) {
            this._overlays = value;
        }
    },

    /**
     * @type {Size}
     */
    size: {
        value: undefined
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
            this._addOverlaysToEngine(engine);
        }
    },

    _addOverlaysToEngine: {
        value: function () {
            var self = this,
                overlays = this.overlays || [];
            return Promise.all(overlays.map(function (overlay) {
                return self.addOverlay(overlay).then(function () {
                    overlay.map = self;
                    return null;
                });
            }))
        }
    },

    _defineEngineBindings: {
        value: function (engine) {
            this.defineBindings({
                "bounds": {"<-": "bounds", source: engine},
                "center": {"<->": "center", source: engine},
                "size": {"<->": "size", source: engine},
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
            engine.removeEventListener("didMove", this);
            engine.removeEventListener("zoom", this);
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
            engine.addEventListener("didMove", this);
            engine.addEventListener("zoom", this);
            engine.addEventListener("willZoom", this);
            engine.addEventListener("featureMouseout", this);
            engine.addEventListener("featureMouseover", this);
            engine.addEventListener("featureSelection", this);
        }
    },

    /**************************************************************************
     * Event Handlers
     */

    handleRangeChange: {
        value: function (plus, minus) {
            var engine, self;
            if (engine = this._engine) {
                self = this;
                plus.forEach(function (overlay) {
                    engine.addOverlay(overlay).then(function () {
                        overlay.map = self;
                        return null;
                    });
                });
                minus.forEach(function (overlay) {
                    engine.removeOverlay(overlay).then(function () {
                        overlay.map = null;
                        return null;
                    });
                });
            }
        }
    },

    handleDidMove: {
        value: function (event) {
            event.stopPropagation();
            this.dispatchEventNamed("didMove", true, true, event.detail);
        }
    },

    handleDidZoom: {
        value: function (event) {
            event.stopPropagation();
            this.dispatchEventNamed("didZoom", true, true, event.detail);
        }
    },

    handleZoom: {
        value: function (event) {
            event.stopPropagation();
            this.dispatchEventNamed("zoom", true, true, event.detail);
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
     * Adds an overlay to the map to the specified pane.
     * @param {Component} - the overlay to add.
     * @param {MapPane} - The pane that the component should be added to.
     * @returns {Promise} - A promise that will be fulfilled when the overlay
     *                      is embedded into the map.
     */
    addOverlay: {
        value: function (overlay) {
            this.overlays.push(overlay);
        }
    },

    /**
     * Adds an overlay to the map to the specified pane.
     * @param {Component} - the overlay to add.
     * @param {MapPane} - The pane that the component should be added to.
     * @returns {Promise} - A promise that will be fulfilled when the overlay
     *                      is embedded into the map.
     */
    removeOverlay: {
        value: function (overlay, pane) {
            var index = this.overlays.indexOf(overlay);
            if (index !== -1) {
                this.overlays.splice(index, 1);
            }
        }
    },

    /**
     * Return's the pixel location of the provided position relative to the
     * map's origin pixel.
     *
     * @param {Position}
     * @returns {Point2D}
     */
    positionToPoint: {
        value: function (position) {
            return this._engine && this._engine.positionToPoint(position);
        }
    },

    /**
     * Return's the pixel location of the provided position relative to the
     * map's container.
     *
     * @param {Position}
     * @returns {Point2D}
     */
    positionToContainerPoint: {
        value: function (position) {
            return this._engine && this._engine.positionToContainerPoint(position);
        }
    },

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
            if (this._engine) {
                this._engine.bounds = newBounds;
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


