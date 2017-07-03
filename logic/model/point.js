var Position = require("montage-geo/logic/model/position").Position;

/**
 *
 * A Point represents a position in a two dimensional coordinate system.
 *
 * TODO: Decide if Point should be a Montage subclass rather than a simple object
 * Point is a JavaScript Object subclass rather than a Montage subclass
 * so cartesian points can be as lightweight as possible: They need to be
 * lightweight because many will be created and there's no benefit for them
 * to be derived from the Montage prototype because they don't use any of the
 * Montage class functionality.
 *
 * @class
 * @extends Object
 */
exports.Point = function () {};

exports.Point.prototype = Object.create({}, /** @lends Point.prototype */ {

    /**
     * The constructor function for all Point
     * instances.
     *
     * @type {function}
     */
    constructor: {
        configurable: true,
        writable: true,
        value: exports.Point
    },

    /**
     * The coordinate's location on the X plane.
     * @type {number}
     */
    x: {
        configurable: true,
        writable: true,
        value: 0
    },

    /**
     * The coordinate's location on the Y plane.
     * @type {number}
     */
    y: {
        configurable: true,
        writable: true,
        value: 0
    },

    /**
     * Calculates the distance between this point and a provided one.
     *
     * @public
     * @method
     * @param {Point}
     * @returns {number} - the distance between the two points in pixels.
     */
    distance: {
        value: function (other) {
            return Math.sqrt(Math.pow((this.x - other.x), 2) + Math.pow((this.y - other.y), 2));
        }
    },

    /**
     * Calculates the square distance between this point and a provided one.
     *
     * @public
     * @method
     * @param {Point}
     * @returns {number} - the square distance between the two points in pixels.
     */
    squareDistance: {
        value: function (other) {
            var distanceX = this.x - other.x,
                distanceY = this.y - other.y;
            return distanceX * distanceX + distanceY * distanceY;
        }
    },

    /**
     * Returns a new point whose coordinates are the sum of this point and the
     * provided one.
     *
     * @public
     * @method
     * @param {Point} - the point to add to this point.
     * @returns {Point}
     */
    add: {
        value: function (other) {
            var point = this.clone();
            point.x += other.x;
            point.y += other.y;
            return point;
        }
    },

    /**
     * Returns a new point whose coordinates are the average of this point and
     * the provided one.
     *
     * @public
     * @method
     * @param {Point} - the point to average with this point.
     * @returns {Point}
     */
    midPoint: {
        value: function (other) {
            var point = new exports.Point();
            point.x = (this.x + other.x) / 2;
            point.y = (this.y + other.y) / 2;
            return point;
        }
    },

    /**
     * Returns a new point whose coordinates are the difference of this point
     * and the provided one.
     * @public
     * @method
     * @param {Point} - the point to subtract from this point.
     * @returns {Point}
     */
    subtract: {
        value: function (other) {
            var point = this.clone();
            point.x -= other.x;
            point.y -= other.y;
            return point;
        }
    },

    /**
     * Returns a new point whose coordinates are the result of multiplying
     * this point's coordinates by the provided number.
     * @public
     * @method
     * @param {Number} - the value to multiply each of this point's coord-
     *                   inates by
     * @returns {Point}
     */
    multiply: {
        value: function (number) {
            var point = this.clone();
            point.x *= number;
            point.y *= number;
            return point;
        }
    },

    /**
     * Returns a new point whose coordinates are the same as this point's.
     * @public
     * @method
     * @returns {Point} - point.  The clone of this point.
     */
    clone: {
        value: function () {
            return exports.Point.withCoordinates(this.x, this.y);
        }
    },

    /**
     * Returns a Montage Geo Position whose coordinates are the result of
     * reverting this point's pixel location to geographic coordinates.
     * @public
     * @method
     * @param {Number} - the zoom level of the map.
     * @returns {Position} - position.  The geographic position of this point.
     */
    toPosition: {
        value: function (zoom) {
            var clip = exports.Point.clip,
                mapSize = 256 << zoom,
                x = (clip(this.x, 0, mapSize - 1) / mapSize) - 0.5,
                y = 0.5 - (clip(this.y, 0, mapSize - 1) / mapSize),
                latitude = 90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI,
                longitude = 360 * x;

            return Position.withCoordinates(longitude, latitude);
        }
    }

});

Object.defineProperties(exports.Point, /** @lends Point */ {

    /**
     * Returns a newly initialized cartesian point with the
     * specified coordinates.
     *
     * @param {number} x    - The coordinate on the X axis.
     * @param {number} y    - The coordinate on the Y axis.
     * @returns {Point} point
     */
    withCoordinates: {
        value: function (x, y) {
            var self = new exports.Point();
            self.x = x;
            self.y = y;
            return self;
        }
    },

    /**
     * Returns a newly initialized cartesian point with the
     * provided Montage Geo Position projected to mercator
     * coordinates.
     *
     * @param {Position} position   - The position to convert to a point.
     * @param {Number?} zoom        - If a zoom level is provided the
     *                                coordinates will be multiplied by
     *                                2^zoom
     * @returns {Point} point
     */
    withPosition: {
        value: function (position, zoom) {
            var clip = exports.Point.clip,
                max = exports.Point.MAX_LATITUDE,
                mapSize = 256,
                latitude = clip(position.latitude, -max, max),
                longitude = clip(position.longitude, -180, 180),
                x = (longitude + 180) / 360,
                sinLatitude = Math.sin(latitude * Math.PI / 180),
                y = 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI),
                pixelX = clip(x, 0, mapSize),
                pixelY = clip(y, 0, mapSize),
                point = exports.Point.withCoordinates(pixelX, pixelY);

            return arguments.length === 1 ? point : point.multiply(mapSize << zoom);
        }
    },

    clip: {
        value: function (value, minValue, maxValue) {
            return Math.min(Math.max(value, minValue), maxValue);
        }
    },

    MAX_LATITUDE: {
        value: 85.0511287798
    }

});

