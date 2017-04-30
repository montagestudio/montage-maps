var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox,
    L = require("leaflet");

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
                minZoom = this._calculateMinScale(width, height);
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
            // var mapBounds = this._map.getBounds(),
            //     west = mapBounds.getWest(),
            //     south = mapBounds.getSouth(),
            //     east = mapBounds.getEast(),
            //     north = mapBounds.getNorth(),
                // cursor = west,
                // world = this._worldCount(cursor),
                // maxEast = world * 360 + 180,
                // bounds = [];

            // while (cursor < east) {
            //     if (maxEast < east) {
            //         bounds.push(BoundingBox.withCoordinates(cursor, south, maxEast, north));
            //         cursor = maxEast;
            //         maxEast += 360;
            //     } else {
            //         bounds.push(BoundingBox.withCoordinates(cursor, south, east, north));
            //         cursor = east;
            //     }
            // }

            // this.bounds.splice.apply(this.bounds, [0, Infinity].concat(bounds));
            // this.bounds.forEach(this._logBoundingBox.bind(this));

            var mapBounds = this._map.getBounds();
            this.bounds.xMin = mapBounds.getWest();
            this.bounds.yMin = mapBounds.getSouth();
            this.bounds.xMax = mapBounds.getEast();
            this.bounds.yMax = mapBounds.getNorth();
            this._logBoundingBox(this.bounds);
        }
    },

    _handleResize: {
        value: function () {
            var map = this._map,
                size = map.getSize(),
                minZoom = this._calculateMinScale(size.x, size.y);
            if (map.options.minZoom !== minZoom) {
                map.options.minZoom = minZoom;
                if(map.getZoom() < minZoom) {
                    map.setZoom(minZoom);
                }
            }
        }
    },

    _calculateMinScale: {
        value: function (width, height) {
            var minZoom = 0,
                dimensions = this._calculateSize(minZoom);
            while (dimensions < width || dimensions < height) {
                minZoom += 1;
                dimensions = this._calculateSize(minZoom);
            }
            return minZoom;
        }
    },

    _calculateSize: {
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

    _worldCount: {
        value: function (longitude) {
            var count = 0;
            while (longitude > 180) {
                count += 1;
                longitude -= 360;
            }
            while (longitude < -180) {
                count -= 1;
                longitude += 360;
            }
            return count;
        }
    }

});
