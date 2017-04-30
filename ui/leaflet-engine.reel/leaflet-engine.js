var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox,
    CartesianPoint = require("logic/model/point").Point,
    L = require("leaflet"),
    Point = require("montage-geo/logic/model/point").Point;
/**
 * @class LeafletEngine
 * @extends Component
 */
exports.LeafletEngine = Component.specialize(/** @lends LeafletEngine# */ {

    /*****************************************************
     * Properties
     */

    /**
     *
     * The current bounds of the map.
     *
     * @public
     * @type {array<BoundingBox>}
     */
    bounds: {
        get: function () {
            if (!this._bounds) {
                this._bounds = BoundingBox.withCoordinates(0, 0, 0, 0);
            }
            return this._bounds;
        },
        set: function (value) {
            this.bounds.xMin = value.xMin;
            this.bounds.xMax = value.xMax;
            this.bounds.yMin = value.yMin;
            this.bounds.yMax = value.yMax;
            if (this._map) {
                this._map.fitBounds([
                    [value.xMin, value.yMin],
                    [value.xMax, value.yMax]
                ]);
            }
        }
    },

    /**
     *
     * The current center of the map.
     *
     * @public
     * @type {Point}
     */
    center: {
        get: function () {
            if (!this._center) {
                this._initializeCenter();
            }
            return this._center;
        },
        set: function (value) {
            var thisPosition, newPosition;
            if (this._map && value instanceof Point) {
                thisPosition = this.center.coordinates;
                newPosition = value.coordinates;
                thisPosition.latitude = newPosition.latitude;
                thisPosition.longitude = newPosition.longitude;
                this._setCenter(thisPosition.longitude, thisPosition.latitude);
            }
        }
    },

    _initializeCenter: {
        value: function () {
            var mapCenter = this._map && this._map.getCenter(),
                coordinates = mapCenter && [mapCenter.lng, mapCenter.lat] || [0, 0];
            this._center = Point.withCoordinates(coordinates);
            if (this.maxBounds && this.maxBounds.xMin > -Infinity || this.maxBounds.xMax < Infinity) {
                this._center.addPathChangeListener("coordinates.longitude", this._validateLongitude.bind(this));
            }
            if (this.maxBounds && this.maxBounds.yMin > -Infinity || this.maxBounds.yMax < Infinity) {
                this._center.addPathChangeListener("coordinates.latitude", this._validateLatitude.bind(this));
            }
        }
    },

    maxBounds: {
        value: undefined
    },

    /**
     * The current origin of the map.
     * @public
     * @type {montage-maps/logic/model/Point}
     * @readonly
     */
    pixelOrigin: {
        get: function () {
            if (!this._pixelOrigin) {
                this._pixelOrigin = CartesianPoint.withCoordinates(0, 0);
            }
            return this._pixelOrigin;
        }
    },

    zoom: {
        get: function () {
            return this._zoom;
        },
        set: function (value) {
            if (value !== this._zoom) {
                this._zoom = value;
                this._map.setZoom(value);
            }
        }
    },

    _zoom: {
        value: 0
    },

    _validateLatitude: {
        value: function () {
            var north = this.bounds.yMax,
                south = this.bounds.yMin,
                maxNorth = this.maxBounds.yMax,
                maxSouth = this.maxBounds.yMin,
                isTooFarNorth = north > maxNorth,
                isTooFarSouth = south < maxSouth,
                position = (isTooFarNorth || isTooFarSouth) && this._center.coordinates,
                latitude = position && position.latitude,
                delta;
            if (isTooFarNorth) {
                delta = maxNorth - (north - latitude) * 1.1;
            } else if (isTooFarSouth) {
                delta = -(Math.abs(maxSouth) - (Math.abs(south) - Math.abs(latitude)) * 1.1);
            }
            if (delta) {
                this._setCenter(position.longitude, delta);
            }
        }
    },

    _validateLongitude: {
        value: function () {
            var west = this.bounds.xMin,
                east = this.bounds.xMax,
                maxEast = this.maxBounds.xMax,
                maxWest = this.maxBounds.xMin,
                isTooFarEast = east > maxEast,
                isTooFarWest = west < maxWest,
                position = (isTooFarWest || isTooFarEast) && this._center.coordinates,
                longitude = position && position.longitude,
                delta;

            if (isTooFarEast) {
                delta = maxEast - (east - longitude) * 1.1;
            } else if (isTooFarWest) {
                delta = -(Math.abs(maxWest) - (Math.abs(west) - Math.abs(longitude)) * 1.1);
            }
            if (delta) {
                this._setCenter(delta, position.latitude);
            }
        }
    },

    _setCenter: {
        value: function (longitude, latitude) {
            this._map && this._map.setView({
                lng: longitude,
                lat: latitude
            });
        }
    },

    /*****************************************************
     * Internal Variables
     */

    /**
     * @private
     * @type {Leaflet.Map}
     */
    _map: {
        value: undefined
    },

    /*****************************************************
     * Delegate methods
     */

    enterDocument: {
        value: function (firstTime) {
            if (firstTime) {
                this._initialize();
            }
        }
    },

    /**
     * @private
     * @method
     */
    _initialize: {
        value: function () {
            this._initializeMap();
            this._initializeBaseMap();
            this._initializeEvents();

        }
    },

    _initializeMap: {
        value: function () {
            var width = this.element.offsetWidth,
                height = this.element.offsetHeight,
                minZoom = this._minZoomForDimensions(width, height);
            this._map = L.map(this.element, {
                center: [0, 0],
                doubleClickZoom: true,
                dragging: true,
                minZoom: minZoom,
                zoom: minZoom > 4 ? minZoom : 4,
                zoomControl: false
            });
        }
    },

    _initializeBaseMap: {
        value: function () {
            var map = this._map;
            if (map) {
                L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);
            }
        }
    },

    _initializeEvents: {
        value: function () {
            this._map.addEventListener("load", this._handleLoad.bind(this));
            this._map.addEventListener("viewreset", this._handleViewReset.bind(this));
            this._map.addEventListener("moveend", this._handleMoveEnd.bind(this));
            this._map.addEventListener("resize", this._handleResize.bind(this));
            // this._map.addEventListener("zoomstart", this._handleZoomStart.bind(this));
            // this._map.addEventListener("zoom", this._handleZoom.bind(this));
            // this._map.addEventListener("zoomend", this._handleZoomEnd.bind(this));
            this._map.addEventListener("zoomanim", this._handleZoomAnimation.bind(this));

        }
    },

    /*****************************************************
     * Event handlers
     */

    _handleLoad: {
        value: function (event) {
            console.log("Handle load (", event, ")");
        }
    },

    _handleMoveEnd: {
        value: function () {
            var mapBounds = this._map.getBounds(),
                mapCenter = this._map.getCenter(),
                bounds = this.bounds,
                position = this.center.coordinates;
            this.dispatchBeforeOwnPropertyChange("bounds", this.bounds);
            bounds.xMin = mapBounds.getWest();
            bounds.yMin = mapBounds.getSouth();
            bounds.xMax = mapBounds.getEast();
            bounds.yMax = mapBounds.getNorth();
            this.dispatchOwnPropertyChange("bounds", this.bounds);
            this.dispatchBeforeOwnPropertyChange("center", this.center);
            position.longitude = mapCenter.lng;
            position.latitude = mapCenter.lat;
            this.dispatchOwnPropertyChange("center", this.center);
        }
    },

    _handleResize: {
        value: function () {
            var map = this._map,
                size = map.getSize(),
                minZoom = this._minZoomForDimensions(size.x, size.y);
            if (map.options.minZoom !== minZoom) {
                map.options.minZoom = minZoom;
                if(map.getZoom() < minZoom) {
                    map.setZoom(minZoom);
                }
            }
        }
    },

    _handleViewReset: {
        value: function () {
            var map = this._map,
                pixelOrigin = map.getPixelOrigin(),
                zoom = map.getZoom(),
                point = map.unproject(pixelOrigin),
                origin = map.project(point, zoom).round();
            this.pixelOrigin.x = origin.x;
            this.pixelOrigin.y = origin.y;
        }
    },

    _handleZoom: {
        value: function (event) {
            // console.log("Handle zoom (", event, ") current zoom (", this._map.getZoom(), ")");
        }
    },

    _handleZoomAnimation: {
        value: function (event) {
            var center = event.center;
            this.zoom = event.zoom;
            this.dispatchBeforeOwnPropertyChange("center", this.center);
            this._center.latitude = center.lat;
            this._center.longitude = center.lng;
            this.dispatchOwnPropertyChange("center", this.center);
            // console.log("Handle zoom animation (", this.center, ") current zoom (", this.zoom, ")");
        }
    },

    _handleZoomEnd: {
        value: function (event) {
            console.log("Handle zoom end (", event, ") current zoom (", this._map.getZoom(), ")");
        }
    },

    _handleZoomStart: {
        value: function (event) {
            console.log("Handle zoom start (", event, ") current zoom (", this._map.getZoom(), ")");
        }
    },

    _mapSizeForZoom: {
        value: function (zoom) {
            return Math.pow(2, zoom) * 256;
        }
    },

    _minZoomForDimensions: {
        value: function (width, height) {
            var minZoom = 0,
                dimensions = this._mapSizeForZoom(minZoom);
            while (dimensions < width || dimensions < height) {
                minZoom += 1;
                dimensions = this._mapSizeForZoom(minZoom);
            }
            return minZoom;
        }
    },

    _normalizeLongitude: {
        value: function (longitude) {
            while (longitude > 180) {
                longitude -= 360;
            }
            while (longitude < -180) {
                longitude += 360;
            }
            return longitude;
        }
    },

    /*****************************************************
     * Logging
     */

    _logBoundingBox: {
        value: function (boundingBox) {
            var rawWest = boundingBox.xMin,
                rawEast = boundingBox.xMax,
                normalizedWest = this._normalizeLongitude(rawWest),
                normalizedEast = this._normalizeLongitude(rawEast);
            console.log("Bounds Min (", rawWest, "), Max (", rawEast, ")");
            console.log("Normalized Bounds (", normalizedWest, ") Max (", normalizedEast, ")");
        }
    },

    _logPoint: {
        value: function (point) {
            var position = point.coordinates,
                rawLongitude = position.longitude,
                normalizedLongitude = this._normalizeLongitude(rawLongitude);
            console.log("Raw Point Longitude (", rawLongitude, ")");
            console.log("Normalized Point Longitude (", normalizedLongitude, ")");
        }
    }

}, {

});
