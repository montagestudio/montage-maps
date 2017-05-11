var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox,
    CartesianPoint = require("logic/model/point").Point,
    L = require("leaflet"),
    Point = require("montage-geo/logic/model/point").Point,
    Set = require("collections/set"),
    DEFAULT_ZOOM = 4;

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
     * @type {BoundingBox}
     */
    bounds: {
        get: function () {
            if (!this._bounds) {
                this._bounds = BoundingBox.withCoordinates(0, 0, 0, 0);
            }
            return this._bounds;
        },
        set: function (value) {
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
            return this._center;
        },
        set: function (value) {
            var isPoint = value instanceof Point,
                position;
            if (isPoint && this._map) {
                position = value.coordinates;
                this._setCenter(position.longitude, position.latitude);
            } else if (isPoint) {
                this._center = value;
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
            var zoomChanged = value !== this._zoom;
            if (zoomChanged && this._map) {
                this._setZoom(value);
            } else if (zoomChanged) {
                this._zoom = value;
            }
        }
    },

    _validateBounds: {
        value: function () {
            if (this._isLatitudeInvalid()) {
                this._fixLatitude();
            } else if (this._isLongitudeInvalid()) {
                this._fixLongitude();
            }
        }
    },

    _isLatitudeInvalid: {
        value: function () {
            var north = this.bounds.yMax,
                south = this.bounds.yMin,
                maxNorth = this.maxBounds.yMax,
                maxSouth = this.maxBounds.yMin,
                isTooFarNorth = north > maxNorth,
                isTooFarSouth = south < maxSouth;
            return isTooFarNorth || isTooFarSouth;
        }
    },

    _isLongitudeInvalid: {
        value: function () {
            var west = this.bounds.xMin,
                east = this.bounds.xMax,
                maxEast = this.maxBounds.xMax,
                maxWest = this.maxBounds.xMin,
                isTooFarEast = east > maxEast,
                isTooFarWest = west < maxWest;
            return isTooFarWest || isTooFarEast;
        }
    },

    _fixLatitude: {
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

    _fixLongitude: {
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

    _setZoom: {
        value: function (zoom) {
            this._map && this._map.setZoom(zoom);
        }
    },

    /*****************************************************
     * Draw Cycle
     */

    draw: {
        value: function () {
            var self = this;
            this._worlds.forEach(function (identifier) {
                if (!self._symbols.get(identifier)) {
                    self._drawFeatures(identifier);
                }
            });
            this._symbols.forEach(function (value, key) {
                if (!self._worlds.has(key)) {
                    self._removeSymbols(value);
                    self._symbols.delete(key);
                }
            })
        }
    },

    _initializeWorldSymbols: {
        value: function (identifier) {
            var offset = identifier * 360,
                featureSymbolsMap = new Map(),
                symbol,
                self = this;
            this._features.forEach(function (feature) {
                symbol = self._drawFeature(feature, offset);
                featureSymbolsMap.set(feature, symbol);
            });
            this._symbols.set(identifier, symbols);
        }
    },

    _drawFeatures: {
        value: function (features) {
            var self = this,
                feature, i, n;
            for (i = 0, n = features.length; i < n; i += 1) {
                feature = features[i];
                this._symbols.forEach(function (featureSymbolMap, identifier) {
                    var symbol = self._drawFeature(feature, identifier *= 360);
                    featureSymbolMap.set(feature, symbol);
                });
            }
        }
    },

    _removeSymbols: {
        value: function (symbols) {
            var i, n;
            for (i = 0, n = symbols.length; i < n; i += 1) {
                this._map.removeLayer(symbols[i]);
            }
        }
    },

    _drawFeature: {
        value: function (feature, offset) {
            var coordinate = feature.geometry.coordinates,
                longitude = offset === 0 ? coordinate[0] : coordinate[0] + offset;
            console.log("Longitude (", longitude, ")");
            return L.marker([coordinate[1], longitude]).addTo(this._map);
        }
    },

    _removeFeatures: {
        value: function (features) {
            var i, n;
            for (i = 0, n = features.length; i < n; i += 1) {
                this._removeFeature(features[i]);
            }
        }
    },

    _removeFeature: {
        value: function (feature) {
            var self = this,
                symbol;
            this._symbols.forEach(function (featureSymbolMap) {
                symbol = featureSymbolMap.get(feature);
                self._map.removeLayer(symbol);
                featureSymbolMap.delete(feature);
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

    _worlds: {
        get: function () {
            if (!this.__worlds) {
                this.__worlds = new Set();
            }
            return this.__worlds;
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

    _symbols: {
        get: function () {
            if (!this.__symbols) {
                this.__symbols = new Map();
            }
            return this.__symbols;
        }
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
            // this._initializeCenter();
            this._initializeMap();
            this._initializeEvents();
            this._initializeBaseMap();
        }
    },

    _initializeMap: {
        value: function () {
            var width = this.element.offsetWidth,
                height = this.element.offsetHeight,
                position = this.center.coordinates,
                zoom = isNaN(this.zoom) ? DEFAULT_ZOOM : this.zoom,
                minZoom = this._minZoomForDimensions(width, height),
                center = [position.latitude, position.longitude],
                feature = {
                    geometry: {
                        type: "Point",
                        coordinates: [position.longitude, position.latitude]
                    },
                    id: 1,
                    properties: {
                        name: "Lahaina"
                    }
                };

            this._map = L.map(this.element, {
                doubleClickZoom: true,
                dragging: true,
                minZoom: minZoom,
                zoomControl: false
            });
            this._map.addEventListener("load", this._updateCenterAndBounds.bind(this));
            this._map.setView(center, (minZoom > zoom ? minZoom : zoom));
            this._features.add(feature);
            this._updateWorlds();
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
            this._map.addEventListener("viewreset", this._handleViewReset.bind(this));
            this._map.addEventListener("moveend", this._handleMoveEnd.bind(this));
            this._map.addEventListener("move", this._updateWorlds.bind(this));
            this._map.addEventListener("resize", this._handleResize.bind(this));
            // this._map.addEventListener("zoomstart", this._handleZoomStart.bind(this));
            // this._map.addEventListener("zoom", this._handleZoom.bind(this));
            // this._map.addEventListener("zoomend", this._handleZoomEnd.bind(this));
            this._map.addEventListener("zoomanim", this._handleZoomAnimation.bind(this));
        }
    },

    _updateCenterAndBounds: {
        value: function () {
            var mapBounds = this._map.getBounds(),
                mapCenter = this._map.getCenter(),
                wrappedBounds = this._map.wrapLatLngBounds(mapBounds);

            // console.warn("Map bounds west (", mapBounds.getWest(), ") east (", mapBounds.getEast(), ")");
            // console.warn("Wrapped map bounds west (", wrappedBounds.getWest(), ") east (", wrappedBounds.getEast(), ")");

            this.dispatchBeforeOwnPropertyChange("bounds", this.bounds);
            this._bounds = BoundingBox.withCoordinates(
                mapBounds.getWest(), mapBounds.getSouth(),
                mapBounds.getEast(), mapBounds.getNorth()
            );
            this.dispatchOwnPropertyChange("bounds", this.bounds);
            this.dispatchBeforeOwnPropertyChange("center", this.center);
            this._center = Point.withCoordinates([mapCenter.lng, mapCenter.lat]);
            this.dispatchOwnPropertyChange("center", this.center);
            if (this.maxBounds) {
                this._validateBounds();
            }
        }
    },

    _worldIdentifierForLongitude: {
        value: function (longitude) {
            var identifier = 0;
            while(longitude > 180) {
                longitude -= 360;
                identifier += 1;
            }
            while(longitude < -180) {
                longitude += 360;
                identifier -= 1;
            }
            return identifier;
        }
    },

    /*****************************************************
     * Event handlers
     */

    // _handleLoad: {
    //     value: function (event) {
    //         console.log("Handle load (", event, ")");
    //     }
    // },

    _handleMoveEnd: {
        value: function () {
            this._updateCenterAndBounds();
        }
    },

    _handleMove: {
        value: function () {

            // console.log("West World (", westWorld, ")");
            // console.log("East World (", eastWorld, ")");

            // this._logLatLng("True South West", trueWest);
            // this._logLatLng("True North West", trueEast);
        }
    },

    _updateWorlds: {
        value: function () {
            var mapCenter = this._map.getCenter(),
                mapSize = this._map.getSize(),
                pixelCenter = this._map.project(mapCenter),
                halfWidth = mapSize.x / 2,
                leftEdge = L.point(pixelCenter.x - halfWidth, pixelCenter.y),
                rightEdge = L.point(pixelCenter.x + halfWidth, pixelCenter.y),
                trueWest = this._map.unproject(leftEdge),
                trueEast = this._map.unproject(rightEdge),
                westWorld = this._worldIdentifierForLongitude(trueWest.lng),
                eastWorld = this._worldIdentifierForLongitude(trueEast.lng),
                self = this, i, n;

            for (i = westWorld, n = eastWorld; i <= n; i += 1) {
                if (!this._worlds.has(i)) {
                    this._worlds.add(i);
                    this.needsDraw = true;
                }
            }

            this._worlds.forEach(function (identifier) {
                if (identifier < westWorld || identifier > eastWorld) {
                    self._worlds.delete(identifier);
                    self.needsDraw = true;
                }
            });
        }
    },

    _logLatLng: {
        value: function (message, coordinate) {
            console.log(message, " lng (", coordinate.lng, ") lat (", coordinate.lat, ")");
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
            this.pixelOrigin = CartesianPoint.withCoordinates(origin.x, origin.y);
            // this.pixelOrigin.x = origin.x;
            // this.pixelOrigin.y = origin.y;
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
            this.dispatchBeforeOwnPropertyChange("zoom", this.zoom);
            this._zoom = event.zoom;
            this.dispatchOwnPropertyChange("zoom", this.zoom);
            this.dispatchBeforeOwnPropertyChange("center", this.center);
            this._center = Point.withCoordinates([center.lat, center.lng]);
            this.dispatchOwnPropertyChange("center", this.center);
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
                totalSize = this._mapSizeForZoom(minZoom),
                widthPercentage = this._maxBoundsWidthPercentage(),
                mapWidth = totalSize * widthPercentage,
                heightPercentage = this._maxBoundsWidthPercentage(),
                mapHeight = totalSize * heightPercentage;
            while (mapWidth < width || mapHeight < height) {
                minZoom += 1;
                totalSize = this._mapSizeForZoom(minZoom);
                mapWidth = totalSize * widthPercentage;
                mapHeight = totalSize * heightPercentage;
            }
            return minZoom;
        }
    },

    _maxBoundsWidthPercentage: {
        value: function () {
            var bounds = this.maxBounds,
                xMax = bounds ? bounds.xMax : 180,
                xMin = bounds ? bounds.xMin : -180;
            if (xMax > 180) xMax = 180;
            if (xMin < -180) xMin = -180;
            return (xMax - xMin) / 360;
        }
    },

    _maxBoundsHeightPercentage: {
        value: function () {
            var bounds = this.maxBounds,
                yMax = bounds && bounds.yMax || 85.05112878,
                yMin = bounds && bounds.yMin || -85.05112878;
            return (yMax - yMin) / 170.10225756;
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
