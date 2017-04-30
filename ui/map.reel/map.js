var Component = require("montage/ui/component").Component,
    LeafletEngine = require("ui/leaflet-engine.reel").LeafletEngine;

/**
 * @class Map
 * @extends Component
 */
exports.Map = Component.specialize(/** @lends Map# */ {


    _engine: {
        get: function () {
            if (!this.__engine) {
                this.__engine = new LeafletEngine();
            }
            return this.__engine;
        },
        set: function (value) {
            this.__engine = value;
        }
    },

    _engineKey: {
        value: undefined
    }

});
