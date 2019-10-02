var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox,
    Enum = require("montage/core/enum").Enum,
    Enumeration = require("montage/data/model/enumeration").Enumeration,
    L = require("leaflet"),
    LineString = require("montage-geo/logic/model/line-string").LineString,
    Map = require("montage/collections/map").Map,
    MapPane = require("logic/model/map-pane").MapPane,
    MultiLineString = require("montage-geo/logic/model/multi-line-string").MultiLineString,
    MultiPoint = require("montage-geo/logic/model/multi-point").MultiPoint,
    MultiPolygon = require("montage-geo/logic/model/multi-polygon").MultiPolygon,
    Point = require("montage-geo/logic/model/point").Point,
    Point2D = require("montage-geo/logic/model/point-2d").Point2D,
    Polygon = require("montage-geo/logic/model/polygon").Polygon,
    Position = require("montage-geo/logic/model/position").Position,
    Promise = require("montage/core/promise").Promise,
    Set = require("montage/collections/set"),
    Size = require("montage-geo/logic/model/size").Size,
    DEFAULT_ZOOM = 4;

var DRAW_QUEUE_COMMANDS = new Enum().initWithMembers("DRAW", "ERASE", "REDRAW");
var GEOMETRY_CONSTRUCTOR_TYPE_MAP = new Map();
GEOMETRY_CONSTRUCTOR_TYPE_MAP.set(LineString, "LineString");
GEOMETRY_CONSTRUCTOR_TYPE_MAP.set(MultiLineString, "MultiLineString");
GEOMETRY_CONSTRUCTOR_TYPE_MAP.set(MultiPoint, "MultiPoint");
GEOMETRY_CONSTRUCTOR_TYPE_MAP.set(MultiPolygon, "MultiPolygon");
GEOMETRY_CONSTRUCTOR_TYPE_MAP.set(Point, "Point");
GEOMETRY_CONSTRUCTOR_TYPE_MAP.set(Polygon, "Polygon");

/**
 * @class LeafletEngine
 * @extends Component
 */
exports.LeafletEngine = Component.specialize(/** @lends LeafletEngine# */ {

    /**************************************************************************
     * Properties
     */

    /**
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

    /**
     * The maximum bounds for the map.  The user is prevented from travelling
     * outside the maximum bounds.
     *
     * @public
     * @type {BoundingBox}
     */
    maxBounds: {
        value: undefined
    },

    /**
     * The current pixel origin of the map.  Overlays may need to adjust their
     * position based upon the pixel origin.
     *
     * @public
     * @type {montage-maps/logic/model/Point}
     * @readonly
     */
    pixelOrigin: {
        get: function () {
            if (!this._pixelOrigin) {
                this._pixelOrigin = Point2D.withCoordinates(0, 0);
            }
            return this._pixelOrigin;
        }
    },

    /**
     * The current zoom level of the map.
     *
     * @public
     * @type {Number}
     * @readonly
     */
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

    /**************************************************************************
     * Coordinate Projection
     */

    /**
     * Return's the pixel location of the provided position relative to the
     * map's origin pixel.
     *
     * @param {Position}
     * @returns {Point2D}
     */
    positionToPoint: {
        value: function (position) {
            var longitude = this._normalizedLongitude(position.longitude),
                point = this._map.latLngToLayerPoint([position.latitude, longitude]);
            return Point2D.withCoordinates(point.x, point.y);
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
            var longitude = this._normalizedLongitude(position.longitude),
                point = this._map.latLngToContainerPoint([position.latitude, longitude]);
            return Point2D.withCoordinates(point.x, point.y);
        }
    },

    // Note: Original version of this function supported passing an array or
    // a position.  Maybe legacy baggage?  Removing for now.
    _normalizedLongitude: {
        value: function (longitude) {
            var currentCenter = this._map.getCenter(),
                centerLng = currentCenter.lng,
                latitude = currentCenter.lat,
                distance = this._distanceBetweenPoints([longitude, latitude], [centerLng, latitude]),
                i = 0;
            while (distance > 180) {
                distance -= 360;
                i++;
            }
            return longitude + i * (centerLng > longitude ? 360 : -360);
        }
    },

    _distanceBetweenPoints: {
        value: function (point1, point2) {
            var distanceX = point1[0] - point2[0],
                distanceY = point1[1] - point2[1];
            return Math.sqrt((distanceX * distanceX) + (distanceY * distanceY));
        }
    },

    /**************************************************************************
     * Add / Remove Features
     */

    drawFeature: {
        value: function (feature, processImmediately) {
            this._prepareFeatureForDrawing(feature);
            if (processImmediately && this._map) {
                this._drawFeature(feature);
            } else {
                this._featureQueue.set(feature, DRAW_QUEUE_COMMANDS["DRAW"]);
                this.needsDraw = true;
            }
        }
    },

    eraseFeature: {
        value: function (feature, processImmediately) {
            if (processImmediately && this._map) {
                this._eraseFeature(feature);
            } else {
                this._featureQueue.set(feature, DRAW_QUEUE_COMMANDS["ERASE"]);
                this.needsDraw = true;
            }
        }
    },

    redrawFeature: {
        value: function (feature, processImmediately) {
            this._prepareFeatureForDrawing(feature);
            if (processImmediately && this._map) {
                this._redrawFeature(feature)
            } else {
                this._featureQueue.set(feature, DRAW_QUEUE_COMMANDS["REDRAW"]);
                this.needsDraw = true;
            }
        }
    },

    _drawFeature: {
        value: function (feature) {
            var self;
            if (!this._features.has(feature)) {
                self = this;
                this._symbols.forEach(function (featureSymbolMap, identifier) {
                    var symbol = self._drawSymbol(feature, identifier * 360);
                    featureSymbolMap.set(feature, symbol);
                });
                this._features.add(feature);
            }
        }
    },

    _eraseFeature: {
        value: function (feature) {
            var self = this;
            this._symbols.forEach(function (featureSymbolMap) {
                var symbol = featureSymbolMap.get(feature);
                self._removeSymbol(symbol);
                featureSymbolMap.delete(feature);
            });
            if (this._features.has(feature)) {
                this._features.delete(feature);
            }
            if (this._processedCoordinates.has(feature)) {
                this._processedCoordinates.delete(feature);
            }
        }
    },

    _redrawFeature: {
        value: function (feature) {
            var self = this;
            this._symbols.forEach(function (featureSymbolMap, identifier) {
                var symbol = featureSymbolMap.get(feature);
                self._removeSymbol(symbol);
                symbol = self._drawSymbol(feature, identifier * 360);
                featureSymbolMap.set(feature, symbol);
            });
        }
    },

    _prepareFeatureForDrawing: {
        value: function (feature) {
            var processedCoordinates = this._processCoordinates(feature.geometry);
            this._processedCoordinates.set(feature, processedCoordinates);
        }
    },

    _processCoordinates: {
        value: function (geometry) {
            var symbolId = GEOMETRY_CONSTRUCTOR_TYPE_MAP.get(geometry.constructor),
                symbolizer = Symbolizer.forId(symbolId);
            return symbolizer.project(geometry.coordinates);
        }
    },

    _featureQueue: {
        get: function () {
            if (!this.__featureQueue) {
                this.__featureQueue = new Map();
            }
            return this.__featureQueue;
        }
    },

    /**************************************************************************
     * Panes & Overlay Registration
     */

    /**
     * Adds an overlay to the map to the specified pane.
     * @param {Component} - The overlay to add.
     * @param {MapPane} -   The pane that the component should be added to.
     * @returns {Promise} - A promise that will be fulfilled when the overlay
     *                      is embedded into the map.
     */
    addOverlay: {
        value: function (component) {
            var overlays = this._overlays.all,
                self;

            if (overlays.has(component)) {
                return;
            }

            self = this;
            overlays.add(component);
            return new Promise(function (resolve, reject) {
                self._queuedOverlays.push({
                    overlay: component,
                    action: "add",
                    resolve: resolve,
                    reject: reject
                });
                self.needsDraw = true;
            });
        }
    },

    /**
     * Adds an overlay to the map to the specified pane.
     * @param {Component} - The overlay to add.
     * @param {MapPane} -   The pane that the component should be added to.
     * @returns {Promise} - A promise that will be fulfilled when the overlay
     *                      is embedded into the map.
     */
    removeOverlay: {
        value: function (component) {
            var overlays = this._overlays.all,
                self;

            if (!overlays.has(component)) {
                return;
            }

            self = this;
            overlays.delete(component);
            return new Promise(function (resolve, reject) {
                self._queuedOverlays.push({
                    overlay: component,
                    action: "remove",
                    resolve: resolve,
                    reject: reject
                });
                self.needsDraw = true;
            });
        }
    },

    /**
     *
     * Returns a pane i.e. element to embed an overlay.  Because different
     * engines have different names for the panes, this method normalizes
     * the id to be used for the panes.
     * @public
     * @override
     * @param {string}
     * @returns {Element} the pane
     */
    elementForPane: {
        value: function (pane) {
            var map, element;
            if (map = this._map) {
                switch (pane) {
                    case MapPane.Drawing:
                    case MapPane.Overlay:
                        element = map.getPanes()["overlayPane"];
                        break;
                    case MapPane.PopUp:
                        element = map.getPanes()["popupPane"];
                        break;
                    case MapPane.Raster:
                        element = map.getPanes()["tilePane"];
                        break;
                }
            }
            return element;
        }
    },

    _queuedOverlays: {
        get: function () {
            if (!this.__queuedOverlays) {
                this.__queuedOverlays = [];
            }
            return this.__queuedOverlays;
        }
    },

    _overlays: {
        get: function () {
            if (!this.__overlays) {
                this.__overlays = Object.create({}, {
                    all: {
                        get: function () {
                            if (!this._all) {
                                this._all = new Set();
                            }
                            return this._all;
                        }
                    },
                    raster: {
                        get: function () {
                            if (!this._raster) {
                                this._raster = new Set();
                            }
                            return this._raster;
                        }
                    },
                    drawing: {
                        get: function () {
                            if (!this._drawing) {
                                this._drawing = new Set();
                            }
                            return this._drawing;
                        }
                    },
                    overlay: {
                        get: function () {
                            if (!this._overlay) {
                                this._overlay = new Set();
                            }
                            return this._overlay;
                        }
                    },
                    popUp: {
                        get: function () {
                            if (!this._popUp) {
                                this._popUp = new Set();
                            }
                            return this._popUp;
                        }
                    },
                });
            }
            return this.__overlays;
        }
    },

    _processOverlayQueue: {
        value: function () {
            var queue = this._queuedOverlays,
                queuedItem;
            while (queuedItem = queue.shift()) {
                if (queuedItem.action === "add") {
                    this._addQueueItemToMap(queuedItem);
                } else if (queuedItem.action === "remove") {
                    this._removeQueueItemFromMap(queuedItem);
                }
            }
        }
    },

    _addQueueItemToMap: {
        value: function (queuedItem) {
            var overlays = this._overlays,
                component = queuedItem.overlay,
                pane = component.pane || MapPane.Overlay,
                container = this.elementForPane(pane);
            container.appendChild(component.element);
            if (pane === MapPane.Raster || pane == MapPane.Overlay) {
                this._resizeOverlay(component);
            }
            switch (pane) {
                case MapPane.Raster:
                    overlays.raster.add(component);
                    break;
                case MapPane.Drawing:
                    overlays.drawing.add(component);
                    break;
                case MapPane.Overlay:
                    overlays.overlay.add(component);
                    break;
                case MapPane.PopUp:
                    overlays.popUp.add(component);
                    break;
            }
            queuedItem.resolve();
        }
    },

    _removeQueueItemFromMap: {
        value: function (queuedItem) {
            var overlays = this._overlays,
                component = queuedItem.overlay,
                pane = component.pane || MapPane.Overlay,
                container = this.elementForPane(queuedItem.pane);
            container.removeChild(component.element);
            switch (pane) {
                case MapPane.Raster:
                    overlays.raster.delete(component);
                    break;
                case MapPane.Drawing:
                    overlays.drawing.delete(component);
                    break;
                case MapPane.Overlay:
                    overlays.overlay.delete(component);
                    break;
                case MapPane.PopUp:
                    overlays.popUp.delete(component);
                    break;
            }
            queuedItem.resolve();
        }
    },

    /**************************************************************************
     * Draw Cycle
     */

    draw: {
        value: function () {
            var self = this,
                worlds;

            if (this._map && this._worldsDidChange) {
                worlds = this._worlds;
                worlds.forEach(function (identifier) {
                    if (!self._symbols.get(identifier)) {
                        self._initializeWorldSymbols(identifier);
                    }
                });
                this._symbols.forEach(function (featureSymbolMap, key) {
                    if (!worlds.has(key)) {
                        featureSymbolMap.forEach(function (symbol) {
                            self._removeSymbol(symbol);
                        });
                        self._symbols.delete(key);
                    }
                });
                this._worldsDidChange = false;
            }

            if (this._map) {
                this._processOverlayQueue();
            }

            if (this._map) {
                this._processFeatureQueue();
            }

            if (this._featureQueue.size || this._worldsDidChange || this._queuedOverlays.length) {
                setTimeout(function () {
                    self.needsDraw = true;
                }, 100);
            }
        }
    },

    willDraw: {
        value: function () {
            var size,
                mapDimensions,
                mapSize;
            if (this._map) {
                size = this.size;
                mapDimensions = this._map.getSize();
                mapSize = Size.withHeightAndWidth(mapDimensions.x, mapDimensions.y);
                if (!size || !size.equals(mapSize)) {
                    this.size = mapSize;
                }
            }
        }
    },

    _processFeatureQueue: {
        value: function () {
            var queueIterator = this._featureQueue.keys(),
                feature, action;
            while (this._map && (feature = queueIterator.next().value)) {
                action = this._featureQueue.get(feature);
                if (action === DRAW_QUEUE_COMMANDS["DRAW"]) {
                    this._drawFeature(feature);
                } else if (action === DRAW_QUEUE_COMMANDS["ERASE"]) {
                    this._eraseFeature(feature);
                } else if (action === DRAW_QUEUE_COMMANDS["REDRAW"]) {
                    this._eraseFeature(feature);
                }
            }
            this._featureQueue.clear();
        }
    },

    _initializeWorldSymbols: {
        value: function (identifier) {
            var offset = identifier * 360,
                featureSymbolsMap = new Map(),
                symbol,
                self = this;
            this._features.forEach(function (feature) {
                symbol = self._drawSymbol(feature, offset);
                featureSymbolsMap.set(feature, symbol);
            });
            this._symbols.set(identifier, featureSymbolsMap);
        }
    },

    _worldsDidChange: {
        value: false
    },

    /**************************************************************************
     * Drawing Features / Symbols
     */

    // TODO: Determine should this be drawSymbols?
    _drawSymbols: {
        value: function (features) {
            var self = this,
                feature, i, n;
            for (i = 0, n = features.length; i < n; i += 1) {
                feature = features[i];
                this._symbols.forEach(function (featureSymbolMap, identifier) {
                    var symbol = self._drawSymbol(feature, identifier * 360);
                    featureSymbolMap.set(feature, symbol);
                });
            }
        }
    },

    // TODO: Determine should this be drawSymbol?
    _drawSymbol: {
        value: function (feature, offset) {
            var geometry = feature.geometry,
                symbolId = GEOMETRY_CONSTRUCTOR_TYPE_MAP.get(geometry.constructor),
                symbolizer = Symbolizer.forId(symbolId),
                coordinates = this._processedCoordinates.get(feature),
                symbols = symbolizer.draw(coordinates, offset),
                map = this._map;

            if (symbolizer.isMultiGeometry) {
                symbols.forEach(function (symbol) {
                    symbol.addTo(map);
                })
            } else {
                symbols.addTo(map);
            }

            return symbols;
        }
    },

    _removeSymbols: {
        value: function (symbols) {
            var i, n;
            for (i = 0, n = symbols.length; i < n; i += 1) {
                this._removeSymbol(symbols[i]);
            }
        }
    },

    _removeSymbol: {
        value: function (symbols) {
            var map = this._map;
            if (Array.isArray(symbols)) {
                symbols.forEach(function (symbol) {
                    map.removeLayer(symbol);
                });
            } else {
                map.removeLayer(symbols);
            }
        }
    },

    _processedCoordinates: {
        get: function () {
            if (!this.__processedCoordinates) {
                this.__processedCoordinates = new Map();
            }
            return this.__processedCoordinates;
        }
    },

    /**************************************************************************
     * Internal Variables
     */

    /**
     * @private
     * @type {Leaflet.Map}
     */
    _map: {
        value: undefined
    },

    /**
     *
     * The current set of visible "Worlds".  To compensate for a limitation
     * with Leaflet the leaflet engine needs to keep track of which copy (or
     * copies) of the world is currently visible.  Crossing the anti-meridian
     * by travelling West or East will result in going to a new world.  Worlds
     * are identified by the number of times the World has rotated East (posi-
     * tive) or West (negative).
     *
     * @private
     * @type {Set<number>}
     */
    _worlds: {
        get: function () {
            var self;
            if (!this.__worlds) {
                self = this;
                this.__worlds = new Set();
                this.__worlds.addRangeChangeListener(function () {
                    self._worldsDidChange = true;
                    self.needsDraw = true;
                });
            }
            return this.__worlds;
        }
    },

    /**
     * The set of all features that have been added to the engine.  The engine
     * needs this set to keep track of which features have been added so that
     * it can redraw them when the map rotates to a copy of the world.
     * @private
     * @type {Set<Feature>}
     */
    _features: {
        get: function () {
            if (!this.__features) {
                this.__features = new Set();
            }
            return this.__features;
        }
    },

    /**
     * A map whose key is a World identifier and whose value is a map of features
     * to symbols that exist for that copy of the World.
     *
     * @private
     * @type {Map<Number, Map<Feature, Symbol|Array<Symbol>>}
     */
    _symbols: {
        get: function () {
            if (!this.__symbols) {
                this.__symbols = new Map();
            }
            return this.__symbols;
        }
    },

    /*****************************************************
     * Component Delegate methods
     */

    enterDocument: {
        value: function (firstTime) {
            if (firstTime) {
                this._initialize();
            }
        }
    },

    /*****************************************************
     * Initialization
     */

    /**
     * Responsible for various stages of map initialization.
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

    /**
     * Responsible for initializing the Leaflet map and setting the default
     * options as well as location.
     * @private
     * @method
     */
    _initializeMap: {
        value: function () {
            var width = this.element.offsetWidth,
                height = this.element.offsetHeight,
                position = this.center.coordinates,
                zoom = isNaN(this.zoom) ? DEFAULT_ZOOM : this.zoom,
                minZoom = this._minZoomForDimensions(width, height),
                center = [position.latitude, position.longitude],
                map = L.map(this.element, {
                    doubleClickZoom: true,
                    dragging: true,
                    minZoom: minZoom,
                    zoomControl: false
                });
            this._map = map;
            map.addEventListener("load", this._updateCenterAndBounds.bind(this));
            map.setView(center, (minZoom > zoom ? minZoom : zoom));
            this._updateWorlds();
        }
    },

    // TODO - remove this method.  The base map should be added via a layer.
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

    /**
     * Responsible for initializing event listeners on the Leaflet Map
     *
     * @private
     * @method
     */
    _initializeEvents: {
        value: function () {
            this._map.addEventListener("viewreset", this._handleViewReset.bind(this));
            this._map.addEventListener("moveend", this._updateCenterAndBounds.bind(this));
            this._map.addEventListener("move", this._handleMapMove.bind(this));
            this._map.addEventListener("resize", this._handleResize.bind(this));
            // this._map.addEventListener("zoomstart", this._handleZoomStart.bind(this));
            this._map.addEventListener("zoom", this._handleZoom.bind(this));
            this._map.addEventListener("zoomend", this._handleZoomEnd.bind(this));
            this._map.addEventListener("zoomanim", this._handleZoomAnimation.bind(this));
        }
    },

    _updateCenterAndBounds: {
        value: function () {
            var mapBounds = this._map.getBounds(),
                mapCenter = this._map.getCenter();

            // console.warn("Map bounds west (", mapBounds.getWest(), ") east (", mapBounds.getEast(), ")");
            // console.warn("Wrapped map bounds west (", wrappedBounds.getWest(), ") east (", wrappedBounds.getEast(), ")");

            this.dispatchBeforeOwnPropertyChange("bounds", this.bounds);
            this._bounds = BoundingBox.withCoordinates(
                this._normalizeLongitude(mapBounds.getWest()), mapBounds.getSouth(),
                this._normalizeLongitude(mapBounds.getEast()), mapBounds.getNorth()
            );
            // this._logBoundingBox(this._bounds);
            this.dispatchOwnPropertyChange("bounds", this.bounds);
            this.dispatchBeforeOwnPropertyChange("center", this.center);
            this._center = Point.withCoordinates([mapCenter.lng, mapCenter.lat]);
            this.dispatchOwnPropertyChange("center", this.center);
            if (this.maxBounds) {
                this._validateBounds();
            }
        }
    },

    /*****************************************************
     * Event handlers
     */

    _handleMapMove: {
        value: function () {
            this._updateWorlds();
            this._positionOverlays();
            this.dispatchEventNamed("didMove", true, false, {center: this._map.getCenter()});
        }
    },

    _positionOverlays: {
        value: function () {
            var overlays = this._overlays,
                self = this;
            this._positionableOverlays.forEach(function (overlayId) {
                overlays[overlayId].forEach(function (component) {
                    self._positionOverlay(component);
                });
            });
        }
    },

    _positionOverlay: {
        value: function (component) {
            var map = this._map,
                size = map.getSize(),
                width = size.x,
                height = size.y,
                pixelCenter = map.latLngToLayerPoint(map.getCenter()),
                offset = {
                    left: pixelCenter.x - width / 2,
                    top: pixelCenter.y - height / 2
                },
                element = component.element;

            element.style.transform = "translate3d(" + offset.left + "px, " + offset.top + "px, 0)";
        }
    },

    _positionableOverlays: {
        writable: false,
        value: ["raster", "drawing", "overlay"]
    },

    _resizableOverlays: {
        writable: false,
        value: ["raster", "overlay"]
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
                worlds = this._worlds,
                i, n;

            for (i = westWorld, n = eastWorld; i <= n; i += 1) {
                if (!worlds.has(i)) {
                    worlds.add(i);
                }
            }

            worlds.forEach(function (identifier) {
                if (identifier < westWorld || identifier > eastWorld) {
                    worlds.delete(identifier);
                }
            });

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

    _handleResize: {
        value: function () {
            this._updateMinZoomLevelIfNecessary();
            this._resizeOverlays();
        }
    },

    _resizeOverlays: {
        value: function () {
            var self = this,
                overlays = this._overlays;
            this._resizableOverlays.forEach(function (overlayId) {
                overlays[overlayId].forEach(function (component) {
                    self._resizeOverlay(component);
                });
            })
        }
    },

    _resizeOverlay: {
        value: function (component) {
            var size = this._map.getSize(),
                width = size.x,
                height = size.y,
                element = component.element,
                isSVG = element.tagName.toUpperCase() === "SVG";
            if (isSVG) {
                element.setAttributeNS(null, "width", width);
                element.setAttributeNS(null, "height", height);
            } else {
                element.setAttribute("width", width + "px");
                element.setAttribute("height", height + "px");
            }
        }
    },

    _updateMinZoomLevelIfNecessary: {
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

            this.pixelOrigin = Point2D.withCoordinates(origin.x, origin.y);
        }
    },

    _handleZoom: {
        value: function (event) {
            console.log("Handle zoom (", event, ") current zoom (", this._map.getZoom(), ")");
            this.dispatchEventNamed("zoom", true, false, {zoom: this._map.getZoom()});
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
            this.dispatchEventNamed("didZoom", true, false, {zoom: this._map.getZoom()});
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

    /*****************************************************
     * Minimum Zoom Levels
     */

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

    /*****************************************************
     * Maximum Bounds
     */

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

    _logLatLng: {
        value: function (message, coordinate) {
            console.log(message, " lng (", coordinate.lng, ") lat (", coordinate.lat, ")");
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

    // Solve cyclic dependency
    Position: {
        get: function () {
            return require("montage-geo/logic/model/position").Position;
        }
    }

});

var Symbolizer = Enumeration.specialize(/** @lends Symbolizer */ "id", {

    id: {
        value: undefined
    },

    draw: {
        value: function (coordinates, offset) {
            return null;
        }
    },

    project: {
        value: function (coordinates) {

        }
    },

    isMultiGeometry: {
        value: false
    },

    _addLongitudeOffsetToPath: {
        value: function (path, offset) {
            return path.map(function (coordinates) {
                var longitude = coordinates[1];
                if (offset !== 0) {
                    longitude += offset;
                }
                return [coordinates[0], longitude];
            });
        }
    },

    _adjustPathForAntiMeridian: {
        value: function (path) {

            var shift = 0,
                previousCoordinate;

            return path.map(function (coordinate) {

                var longitude = coordinate.longitude,
                    previousLongitude,
                    bearing;

                if (previousCoordinate) {
                    previousLongitude = previousCoordinate.longitude;
                    bearing = previousCoordinate.bearing(coordinate);
                    if (bearing > 0 && bearing < 180 &&
                        previousLongitude > 0 && longitude < 0) {
                        shift += 1;
                    } else if (
                        bearing > 180 && bearing < 360 &&
                        previousLongitude < 0 && longitude > 0) {
                        shift -= 1;
                    }
                }

                previousCoordinate = coordinate;
                return [coordinate.latitude, longitude + shift * 360];

            });
        }
    },

    _processPoint: {
        value: function (coordinates) {
            return [coordinates.latitude, coordinates.longitude];
        }
    }

}, {

    POINT: ["Point", {

        draw: {
            value: function (coordinates, offset) {
                var longitude = coordinates[1];
                if (offset !== 0) {
                    longitude += offset;
                }
                return L.marker([coordinates[0], longitude]);
            }
        },

        project: {
            value: function (coordinates) {
                return [coordinates.latitude, coordinates.longitude];
            }
        }

    }],

    MULTI_POINT: ["MultiPoint", {

        draw: {
            value: function (coordinates, offset) {
                return coordinates.map(function (coordinate) {
                    var longitude = coordinate[1];
                    if (offset !== 0) {
                        longitude += offset;
                    }
                    return L.marker([coordinates[0], longitude]);
                });
            }
        },

        isMultiGeometry: {
            value: true
        },

        project: {
            value: function (coordinates) {
                return coordinates.map(this._processPoint);
            }
        }

    }],

    LINE_STRING: ["LineString", {

        draw: {
            value: function (coordinates, offset) {
                return L.polyline(this._addLongitudeOffsetToPath(coordinates, offset));
            }
        },

        project: {
            value: function (coordinates) {
                return this._adjustPathForAntiMeridian(coordinates);
            }
        }

    }],

    MULTI_LINE_STRING: ["MultiLineString", {

        draw: {
            value: function (coordinates, offset) {
                var fn = this._addLongitudeOffsetToPath;
                return coordinates.map(function (path) {
                    return L.polyline(fn(path, offset));
                });
            }
        },

        isMultiGeometry: {
            value: true
        },

        project: {
            value: function (multiLineString) {
                return multiLineString.map(function (lineString) {
                    return Symbolizer.LINE_STRING.project(lineString.coordinates);
                });
            }
        }

    }],

    POLYGON: ["Polygon", {

        draw: {
            value: function (coordinates, offset) {
                var fn = this._addLongitudeOffsetToPath,
                    rings = coordinates.map(function (ring) {
                        return fn(ring, offset);
                    });
                return L.polygon(rings);
            }
        },

        project: {
            value: function (rings) {
                var fn = this._adjustPathForAntiMeridian;
                return rings.map(function (ring) {
                    return fn(ring);
                });
            }
        }

    }],

    MULTI_POLYGON: ["MultiPolygon", {

        draw: {
            value: function (polygons, offset) {
                var fn = this._addLongitudeOffsetToPath;
                return polygons.map(function (polygon) {
                    var coordinates = polygon.map(function (path) {
                        return fn(path, offset);
                    });
                    return L.polygon(coordinates);
                });
            }
        },

        isMultiGeometry: {
            value: true
        },

        project: {
            value: function (polygons) {
                return polygons.map(function (polygon) {
                    return Symbolizer.POLYGON.project(polygon.coordinates);
                });
            }
        }

    }]

});

