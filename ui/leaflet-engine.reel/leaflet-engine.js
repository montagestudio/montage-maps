var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox,
    L = require("leaflet"),
    Point = require("montage-geo/logic/model/point").Point,
    Position = require("montage-geo/logic/model/position").Position;

/**
 * @class LeafletEngine
 * @extends Component
 */
exports.LeafletEngine = Component.specialize(/** @lends LeafletEngine# */ {

    /**
     * @private
     * @type {Leaflet.Map}
     */
    _map: {
        value: undefined
    },

    /**
     * @public
     * @type {array<BoundingBox>}
     */
    bounds: {
        get: function () {
            if (!this._bounds) {
                this._bounds = BoundingBox.withCoordinates(0, 0, 0, 0);
            }
            return this._bounds;
        }
    },

    center: {
        get: function () {
            if (!this._center) {
                this._center = Point.withCoordinates([0, 0]);
                this._center.addPathChangeListener("coordinates.longitude", this._validateCenter.bind(this));
                this._center.addPathChangeListener("coordinates.latitude", this._validateCenter.bind(this));
            }
            return this._center;
        },
        set: function (value) {
            var thisPosition, newPosition;
            if (value instanceof Point) {
                newPosition = value.coordinates;
            } else if (value instanceof Object) {
                newPosition = value;
            }
            if (newPosition) {
                thisPosition = this._center.coordinates;
                thisPosition.latitude = newPosition.latitude;
                thisPosition.longitude = newPosition.longitude;
                this._map.setView({
                    lon: thisPosition.longitude,
                    lat: thisPosition.latitude
                });
            }
        }
    },

    _validateCenter: {
        value: function () {
            var north = this.bounds.yMax,
                south = this.bounds.yMin,
                isTooFarNorth = north > 85.05112878,
                isTooFarSouth = south < -85.05112878,
                center = this._center.coordinates,
                delta;
            if (isTooFarNorth) {
                delta = 85.05112878 - (north - center.latitude) * 1.1;
                this.center = {
                    longitude: center.longitude,
                    latitude: delta
                };
            } else if (isTooFarSouth) {
                delta = -(85.05112878 - (Math.abs(south) - Math.abs(center.latitude)) * 1.1);
                this.center = {
                    longitude: center.longitude,
                    latitude: delta
                };
            }
        }
    },

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
            this._map.addEventListener("moveend", this._handleMoveEnd.bind(this));
            this._map.addEventListener("resize", this._handleResize.bind(this));
        }
    },

    _handleMoveEnd: {
        value: function () {
            var mapBounds = this._map.getBounds(),
                mapCenter = this._map.getCenter(),
                bounds = this.bounds,
                position = this.center.coordinates;
            bounds.xMin = mapBounds.getWest();
            bounds.yMin = mapBounds.getSouth();
            bounds.xMax = mapBounds.getEast();
            bounds.yMax = mapBounds.getNorth();
            position.longitude = mapCenter.lng;
            position.latitude = mapCenter.lat;
            // this._logBoundingBox(this.bounds);
            // this._logPoint(this.center);
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

    _mapSizeForZoom: {
        value: function (zoom) {
            return Math.pow(2, zoom) * 256;
        }
    },

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
    }

}, {

});
