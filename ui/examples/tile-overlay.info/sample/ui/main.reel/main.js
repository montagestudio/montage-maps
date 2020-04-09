var Component = require("montage/ui/component").Component,
    DataService = require("data/montage-data.mjson").montageObject,
    Story = require("logic/model/story").Story;

/**
 * @class Main
 * @extends Component
 */
exports.Main = Component.specialize(/** @lends Main.prototype */ {

    enterDocument: {
        value: function (firstTime) {
            // if (firstTime) {
            //
            // }
        }
    }

});
