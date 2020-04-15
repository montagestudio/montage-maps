var Component = require("montage/ui/component").Component,
    BoundingBox = require("montage-geo/logic/model/bounding-box").BoundingBox,
    Feature = require("montage-geo/logic/model/feature").Feature,
    GeoJsonToGeometryConverter = require("montage-geo/logic/converter/geo-json-to-geometry-converter").GeoJsonToGeometryConverter;
/**
 * @class Main
 * @extends Component
 */
exports.Main = Component.specialize(/** @lends Main.prototype */ {

    geoJsonConverter: {
        get: function () {
            if (!this._geoJsonConverter) {
                this._geoJsonConverter = new GeoJsonToGeometryConverter();
            }
            return this._geoJsonConverter;
        }
    },

    _map: {
        get: function () {
            return this.__map;
        },
        set: function (value) {
            var lahaina, antiMeridianLine, collection;
            if (value) {
                this.__map = value;
                lahaina = Feature.withMembers(
                    1,
                    {name: "Lahaina"},
                    this.geoJsonConverter.convert({
                        type: "Point",
                        coordinates: [-156.6825, 20.8783]
                    })
                );
                antiMeridianLine = Feature.withMembers(
                    2,
                    {name: "Anti-Meridian Line Cross Stepper"},
                    this.geoJsonConverter.convert({
                        type: "LineString",
                        coordinates: [
                            [178.68, 45.51],
                            [-178.43, 37.77],
                            [178.2, 34.04]
                        ]
                    })
                );
                collection = Feature.withMembers(
                    3,
                    {name: "Random Collection"},
                    this.geoJsonConverter.convert({
                        type: "GeometryCollection",
                        geometries: [{
                            type: "Polygon",
                            coordinates: [[
                                [-160, 30],
                                [-150, 30],
                                [-150, 40],
                                [-160, 40],
                                [-160, 30]
                            ]]
                        }, {
                            type: "MultiPoint",
                            coordinates: [
                                [-157, 36],
                                [-153, 34]
                            ]
                        }, {
                            type: "LineString",
                            coordinates: [
                                [-160, 40],
                                [-157, 36],
                                [-153, 34],
                                [-150, 30]
                            ]
                        }]
                    })
                );

                this.__map.drawFeature(lahaina);
                this.__map.drawFeature(antiMeridianLine);
                this.__map.drawFeature(collection);
            }
        }
    },

    maxBounds: {
        get: function () {
            return BoundingBox.withCoordinates(-20, -20, 20, 20);
        }
    },

    bounds: {
        get: function () {
            return this._bounds;
        },
        set: function (value) {
            this._bounds = value;
            // console.log("Set main's bounds with value (", value, ")");
        }
    },

    center: {
        get: function () {
            return this._center;
        },
        set: function (value) {
            this._center = value;
            // console.log("Set main's center with value (", value.coordinates, ")");
        }
    },

    zoom: {
        get: function () {
            return this._zoom;
        },
        set: function (value) {
            this._zoom = value;
            // console.log("Setting main's zoom level with value (", value, ")");
        }
    }

});
