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

    it("can calculate the square distance between two points", function () {
        var point1 = Point.withCoordinates(0, 0),
            point2 = Point.withCoordinates(10, 10),
            distance = point1.squareDistance(point2);
        expect(distance).toBe(200);
    });

    it("can create a point by adding two points together", function () {
        var point1 = Point.withCoordinates(0, 0),
            point2 = Point.withCoordinates(10, 10),
            point3 = point1.add(point2);

        expect(point3.x).toBe(10);
        expect(point3.y).toBe(10);
    });

    it("can create a point by subtracting one from another", function () {
        var point1 = Point.withCoordinates(0, 0),
            point2 = Point.withCoordinates(10, 10),
            point3 = point1.subtract(point2);

        expect(point3.x).toBe(-10);
        expect(point3.y).toBe(-10);
    });

    it("can create a point by calculating the midpoint of two points", function () {
        var point1 = Point.withCoordinates(0, 0),
            point2 = Point.withCoordinates(10, 10),
            point3 = point1.midPoint(point2);

        expect(point3.x).toBe(5);
        expect(point3.y).toBe(5);
    });

    it("can create a point by multiplying a value against a point's coordinates", function () {
        var point1 = Point.withCoordinates(10, 5),
            point2 = point1.multiply(10);

        expect(point2.x).toBe(100);
        expect(point2.y).toBe(50);
    });

    it("can create a point by cloning another", function () {
        var point1 = Point.withCoordinates(10, 5),
            point2 = point1.clone();

        expect(point2.x).toBe(10);
        expect(point2.y).toBe(5);
    });

    it("can create a Montage Geo Point from a point", function () {
        var point1 = Point.withCoordinates(128, 128),
            position = point1.toPosition(0);

        expect(position.longitude).toBe(0);
        expect(position.latitude).toBe(0);

        point1.x = 256;
        point1.y = 256;

        position = point1.toPosition(1);

        expect(position.longitude).toBe(0);
        expect(position.latitude).toBe(0);

        point1.x = 512;
        point1.y = 512;

        position = point1.toPosition(2);

        expect(position.longitude).toBe(0);
        expect(position.latitude).toBe(0);
    });

});
