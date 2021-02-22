import { TerrainLayer } from './terrainlayer.js';

export class TerrainConfig extends FormApplication {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "terrain-config",
            classes: ["sheet", "terrain-sheet"],
            title: "Terrain Configuration",
            template: "modules/TerrainLayer/templates/terrain-config.html",
            width: 400,
            submitOnChange: true
        });
    }

    /* -------------------------------------------- */

    /** @override */
    getData(options) {
        return {
            object: duplicate(this.object.data),
            options: this.options,
            submitText: this.options.preview ? "Create" : "Update"
        }
    }

    /* -------------------------------------------- */

    /** @override */
    _onChangeInput(event) {
        if ($(event.target).attr('name') == 'multiple') {
            let val = $(event.target).val();
            $(event.target).next().html(TerrainLayer.multipleText(val));
        }
    }

    /* -------------------------------------------- */

    /** @override */
    async _updateObject(event, formData) {
        if (!game.user.isGM) throw "You do not have the ability to configure a Terrain object.";
        if (this.object.id) {
            let data = duplicate(formData);
            data.id = this.object.id;
            data.multiple = (data.multiple == 1 ? 0.5 : parseInt(data.multiple));
            return this.object.update(data, { diff: false });
        }
        return this.object.constructor.create(formData);
    }
}