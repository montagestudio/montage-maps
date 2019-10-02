var Component = require("montage/ui/component").Component,
    MapPane = require("logic/model/map-pane").MapPane,
    MultiLineString = require("montage-geo/logic/model/multi-line-string").MultiLineString,
    MultiPoint = require("montage-geo/logic/model/multi-point").MultiPoint,
    MultiPolygon = require("montage-geo/logic/model/multi-polygon").MultiPolygon,
    Point = require("montage-geo/logic/model/point").Point;


/**
 * @class HeatmapOverlay
 * @extends Component
 */
exports.HeatmapOverlay = Component.specialize(/** @lends HeatmapOverlay.prototype */{

    constructor: {
        value: function HeatmapOverlay() {
            var self = this,
                redraw = function () {
                    self.needsDraw = true;
                };
            this.addOwnPropertyChangeListener("_isEnabled", redraw);
            this.addRangeAtPathChangeListener("collection.features", redraw);
        }
    },

    /**************************************************************************
     * Properties
     */

    // DEFAULT_BLUR: {
    //     value: 20
    // },
    //
    // DEFAULT_RADIUS: {
    //     value: 20
    // },

    // DEFAULT_GRADIENT: {
    //     value: {
    //         0.4: 'blue',
    //         0.6: 'cyan',
    //         0.7: 'lime',
    //         0.8: 'yellow',
    //         1.0: 'red'
    //     }
    // },

    /**
     * @type {number}
     * @default {20}
     */
    blur: {
        value: 20
    },

    gradientScale: {
        value: {
            0.4: 'blue',
            0.6: 'cyan',
            0.7: 'lime',
            0.8: 'yellow',
            1.0: 'red'
        }
    },

    radius: {
        value: 20
    },

    /**
     * The color scale used for symbolizing the heat map's density.
     * To set the
     */
    gradient: {
        get: function () {
            if (!this._gradient) {
                this._gradient = this._createGradientWithColorRange(this.gradientScale);
            }
            return this._gradient;
        },
        set: function (value) {
            if (value) {
                this._gradient = this._createGradientWithColorRange(value);
            }
        }
    },

    /**
     * The features to draw as a heatmap.
     * @type {FeatureCollection}
     */
    collection: {
        value: undefined
    },

    /**
     * The map that this overlays features are symbolized on.
     * @type {Map}
     */
    map: {
        get: function () {
            return this._map;
        },
        set: function (value) {
            if (this._map) {
                this._map.removeEventListener("didMove", this);
                this._map.removeEventListener("zoom", this);
            }
            this._map = value;
            if (this._map) {
                this._map.addEventListener("didMove", this);
                this._map.addEventListener("zoom", this);
            }
            this.needsDraw = true;
        }
    },

    pane: {
        value: MapPane.Overlay
    },

    /**
     * @type {Canvas}
     */
    _circle: {
        get: function () {
            if (!this.__circle) {
                this.__circle = this._initializeCircle(this.radius, this.blur);
            }
            return this.__circle;
        }
    },

    /**
     * Flag indicating if the map is being resized.
     * @type {boolean}
     */
    _isRegistered: {
        value: false
    },

    /**
     * The array of points to draw on the overlay.  Calculated from the
     * feature's geometry.
     * @type {Point2D[]}
     */
    _points: {
        value: undefined
    },

    /***********************************************************************
     * Listeners
     */

    handleZoom: {
        value: function (event) {
            if (this._isEnabled && this.map) {
                this._calculatePoints();
                this._paint();
            }
        }
    },

    handleDidMove: {
        value: function (event) {
            if (this._isEnabled && this.map) {
                this._calculatePoints();
                this._paint();
            }
        }
    },

    _addMapListeners: {
        value: function () {
            var map;
            if (map = this.map) {
                map.addEventListener("didMove", this);
                map.addEventListener("didZoom", this);
            }
        }
    },

    _cancelMapListeners: {
        value: function () {
            var map;
            if (map = this.map) {
                map.removeEventListener("didMove", this);
                map.removeEventListener("didZoom", this);
            }
        }
    },

    /***********************************************************************
     * Component Delegate Methods
     */

    draw: {
        value: function () {
            if (this._isEnabled && this.map) {
                this._paint();
            } else {
                this._clear();
            }
        }
    },

    enterDocument: {
        value: function () {
            this._isEnabled = true;
        }
    },

    exitDocument: {
        value: function () {
            this._isEnabled = false;
        }
    },

    willDraw: {
        value: function () {
            if (this._isEnabled && this.map) {
                this._calculatePoints();
            }
        }
    },

    _calculatePoints: {
        value: function () {
            var self = this,
                features = this.collection && this.collection.features || [],
                map = this.map;

            // TODO: Switch to features.
            this._points = features.reduce(function (accumlator, feature) {
                var geometry = feature.geometry;
                if (self._isMultiPartGeometry(geometry)) {
                    geometry.coordinates.forEach(function (subcomponent) {
                        if (typeof subcomponent.bounds === "function") {
                            accumlator.push(map.positionToContainerPoint(subcomponent.bounds().center));
                        } else {
                            accumlator.push(map.positionToContainerPoint(subcomponent));
                        }
                    });
                } else {
                    accumlator.push(map.positionToContainerPoint(feature.geometry.bounds().center));
                }
                return accumlator;
            }, []);

        }
    },

    _isMultiPartGeometry: {
        value: function (geometry) {
            return  geometry instanceof MultiLineString ||
                    geometry instanceof MultiPolygon ||
                    geometry instanceof MultiPoint;
        }
    },

    /**************************************************************************
     * Drawing the overlay
     */

    _clear: {
        value: function () {
            var element = this.element,
                context = element.getContext("2d");
            context.clearRect(0, 0, element.width, element.height);
        }
    },

    _colorize: {
        value: function (pixels, gradient) {
            var i, j, len;
            for (i = 3, len = pixels.length, j; i < len; i += 4) {
                j = pixels[i] * 4; // get gradient color from opacity value

                if (j) {
                    pixels[i - 3] = gradient[j];
                    pixels[i - 2] = gradient[j + 1];
                    pixels[i - 1] = gradient[j + 2];
                }
            }
        }
    },

    _createGradientWithColorRange: {
        value: function (colorRange) {

            var canvas = document.createElement('canvas'),
                ctx = canvas.getContext('2d'),
                gradient = ctx.createLinearGradient(0, 0, 0, 256),
                index;

            canvas.width = 1;
            canvas.height = 256;

            for (index in colorRange) {
                gradient.addColorStop(index, colorRange[index]);
            }

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1, 256);

            return ctx.getImageData(0, 0, 1, 256).data;
        }
    },

    _initializeCircle: {
        value: function (radius, blur) {

            var circle = document.createElement('canvas'),
                context = circle.getContext('2d'),
                blurredRadius = this._radius = radius + blur;

            circle.width = circle.height = blurredRadius * 2;

            context.shadowOffsetX = context.shadowOffsetY = 200;
            context.shadowBlur = blur;
            context.shadowColor = 'black';

            context.beginPath();
            context.arc(blurredRadius - 200, blurredRadius - 200, radius, 0, Math.PI * 2, true);
            context.closePath();
            context.fill();

            return circle;
        }
    },

    _paint: {
        value: function () {
            var element = this.element,
                context = element.getContext("2d"),
                height = element.height,
                width = element.width,
                circle = this._circle,
                self = this,
                colored;

            this._clear();
            this._points.forEach(function (point) {
                context.globalAlpha = 0.1;
                context.drawImage(circle, point.x - self._radius, point.y - self._radius);
            });

            colored = context.getImageData(0, 0, width, height);
            this._colorize(colored.data, this.gradient);
            context.putImageData(colored, 0, 0);
        }
    }

});
