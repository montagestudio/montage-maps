var Point = require("montage-maps/logic/model/point").Point;

describe("A Point", function () {

    it("can be created", function () {
        var point = Point.withCoordinates(0, 0);
        expect(point).toBeDefined();
        expect(point.x).toBe(0);
        expect(point.y).toBe(0);
    });

    it("can calculate the distance between two points", function () {
        var point1 = Point.withCoordinates(0, 0),
            point2 = Point.withCoordinates(10, 10),
            distance = point1.distance(point2);
        distance *= 100;
        distance = Math.round(distance);
        distance /= 100;
        expect(distance).toBe(14.14);
    });

});
