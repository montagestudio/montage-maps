/**
 *
 * A Point represents a position in a two dimensional coordinate system.
 *
 * TODO: Decide if Point should be a Montage subclass rather than simple POJO
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
     * The coordinate's position on the X plane.
     * @type {number}
     */
    x: {
        configurable: true,
        writable: true,
        value: 0
    },

    y: {
        configurable: true,
        writable: true,
        value: 0
    },

    distance: {
        value: function (other) {
            return Math.sqrt(Math.pow((this.x - other.x), 2) + Math.pow((this.y - other.y), 2));
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
     * @returns {Coordinate} coordinate
     */
    withCoordinates: {
        value: function (x, y) {
            var self = new exports.Point();
            self.x = x;
            self.y = y;
            return self;
        }
    }

});

