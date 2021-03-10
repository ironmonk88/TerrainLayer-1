import { Terrain } from './terrain.js';
import { TerrainConfig } from './terrainconfig.js';
import { TerrainHUD } from './terrainhud.js';

export let debug = (...args) => {
    if (debugEnabled > 1) console.log("DEBUG: terrainlayer | ", ...args);
};
export let log = (...args) => console.log("terrainlayer | ", ...args);
export let warn = (...args) => {
    if (debugEnabled > 0) console.warn("terrainlayer | ", ...args);
};
export let error = (...args) => console.error("terrainlayer | ", ...args);
export let i18n = key => {
    return game.i18n.localize(key);
};

export let setting = key => {
    return game.settings.get("TerrainLayer", key);
};

export class TerrainLayer extends PlaceablesLayer {
    constructor() {
        super();
        this.showterrain = game.settings.get("TerrainLayer", "showterrain");
        this.defaultmultiple = 2;
    }

    /** @override */
    static get layerOptions() {
        return mergeObject(super.layerOptions, {
            zIndex: 15,
            controllableObjects: true,
            //objectClass: Note,
            //sheetClass: NoteConfig,
            objectClass: Terrain,
            sheetClass: TerrainConfig,
            rotatableObjects: false
        });
    }

    static get multipleOptions() {
        return [0.5, 2, 3, 4];
    }

    static multipleText(multiple) {
        return (parseInt(multiple) == 1 || parseInt(multiple) == 0.5 ? '1/2' : multiple);
    }

/* -------------------------------------------- */

    get costGrid() {
        console.warn('costGrid is deprecated, please use the cost function instead');
        if (this._costGrid == undefined) {
            this.buildCostGrid(canvas.scene.data.terrain);
        }
        return this._costGrid;
    }

    cost(pts, options) {
        let cost = 0;
        pts = pts instanceof Array ? pts : [pts];
        for (let pt of pts) {
            let terrain = this.placeables.find(t => { return t.data.x == pt.x && t.data.y == pt.y; });
            cost += (terrain?.cost(options) || 1);
        }

        return cost;
    }

    /**
     * Tile objects on this layer utilize the TileHUD
     * @type {TerrainHUD}
     */
    get hud() {
        return canvas.hud.terrain;
    }

    /*
    async draw() {
        canvas.scene._data.terrain = canvas.scene.data.terrain = (canvas.scene.data.flags?.TerrainLayer?.data || []);
        super.draw();
    }*/

    async draw() {
        canvas.scene.data.terrain = [];

        if (canvas.scene.data.flags?.TerrainLayer) {
            for (let [k, v] of Object.entries(canvas.scene.data.flags?.TerrainLayer)) {
                if (k.startsWith('terrain')) {
                    if (k != 'terrainundefined' && v != undefined && v.x != undefined && v.y != undefined)
                        canvas.scene.data.terrain.push(v);
                    else
                        await canvas.scene.unsetFlag('TerrainLayer', k);
                }
            };
        }

        //convert the old data
        if (canvas.scene.data.flags?.TerrainLayer?.costGrid) {
            let grid = canvas.scene.getFlag('TerrainLayer', 'costGrid');
            for (let y in grid) {
                for (let x in grid[y]) {
                    this.createTerrain({ x: parseInt(x), y: parseInt(y), multiple: grid[y][x].multiple });
                }
            }
            //canvas.scene.unsetFlag('TerrainLayer', 'costGrid');
        }

        const d = canvas.dimensions;
        this.width = d.width;
        this.height = d.height;
        this.hitArea = d.rect;
        this.zIndex = this.constructor.layerOptions.zIndex;

        // Create objects container which can be sorted
        this.objects = this.addChild(new PIXI.Container());
        this.objects.sortableChildren = true;
        this.objects.visible = false;


        // Create preview container which is always above objects
        this.preview = this.addChild(new PIXI.Container());

        // Create and draw objects
        const promises = canvas.scene.data.terrain.map(data => {
            const obj = this.createObject(data);
            return obj.draw();
        });

        // Wait for all objects to draw
        this.visible = true;
        return Promise.all(promises || []);
    }

    async buildCostGrid(data) {
        this._costGrid = {};
        for (let grid of data) {
            let multiple = grid.multiple;
            let type = 'ground';
            if (typeof this._costGrid[grid.y] === 'undefined')
                this._costGrid[grid.y] = {};
            this._costGrid[grid.y][grid.x] = { multiple, type };

        }
    }

    async toggle(show, emit = false) {
        //this.highlight.children[0].visible = !this.highlight.children[0].visible;
        if (show == undefined)
            show = !this.showterrain;
        this.showterrain = show;
        game.settings.set("TerrainLayer", "showterrain", this.showterrain);
        if (game.user.isGM && emit) {
            //await canvas.scene.setFlag('TerrainLayer','sceneVisibility', this.highlight.children[0].visible )
            game.socket.emit('module.TerrainLayer', { action: 'toggle', arguments: [this.showterrain] })
        }
    }

    deactivate() {
        super.deactivate();
        if (this.objects) this.objects.visible = true;
    }

    async updateMany(data, options = {diff: true}) {
        const user = game.user;

        const pending = new Map();
        data = data instanceof Array ? data : [data];
        for (let d of data) {
            if (!d._id) throw new Error("You must provide an id for every Embedded Entity in an update operation");
            pending.set(d._id, d);
        }

        // Difference each update against existing data
        const updates = canvas.scene.data.terrain.reduce((arr, d) => {
            if (!pending.has(d._id)) return arr;
            let update = pending.get(d._id);

            // Diff the update against current data
            if (options.diff) {
                update = diffObject(d, expandObject(update));
                if (isObjectEmpty(update)) return arr;
                update["_id"] = d._id;
            }

            // Call pre-update hooks to ensure the update is allowed to proceed
            if (!options.noHook) {
                const allowed = Hooks.call(`preUpdateTerrain`, this, d, update, options, user._id);
                if (allowed === false) {
                    console.debug(`TerrainLayer | Terrain update prevented by preUpdate hook`);
                    return arr;
                }
            }

            // Stage the update
            arr.push(update);
            return arr;
        }, []);
        if (!updates.length) return [];

        let flags = {};
        for (let u of updates) {
            let key = `flags.TerrainLayer.terrain${u._id}`;
            flags[key] = u;
        }

        canvas.scene.update(flags); //, { diff: false }

        this._costGrid = null;
    }

    async deleteMany(ids, options = {}) {
        //+++ need to update this to only respond to actual deletions

        let updates = {};
        let originals = [];
        for (let id of ids) {
            const object = this.get(id);
            log('Removing terrain', object.data.x, object.data.y);
            originals.push(object);
            this.objects.removeChild(object);
            delete this._controlled[id];
            object._onDelete(options, game.user.id);
            object.destroy({ children: true });
            let key = `flags.TerrainLayer.-=terrain${id}`;
            updates[key] = null;
        }

        this.storeHistory("delete", originals);

        this._costGrid = null;

        canvas.scene.update(updates);
    }

    _onClickLeft(event) {
        super._onClickLeft(event);
        if (game.activeTool == 'addterrain') {
            let pos = event.data.getLocalPosition(canvas.app.stage);
            let gridPt = canvas.grid.grid.getGridPositionFromPixels(pos.x, pos.y);
            let [y, x] = gridPt;  //Normalize the returned data because it's in [y,x] format

            this.createTerrain({ x: x, y: y });
            //make sure there isn't a terrain already there
            /*
            let pos = event.data.getLocalPosition(canvas.app.stage);
            let gridPt = canvas.grid.grid.getGridPositionFromPixels(pos.x, pos.y);
            let [y, x] = gridPt;  //Normalize the returned data because it's in [y,x] format
            log('Adding terrain', x, y);
            if (!this.terrainExists(x, y)) {
                //const terrain = new Terrain({ x: x, y: y });
                //this.constructor.placeableClass.create(terrain.data);
                //terrain.draw();
                this.constructor.placeableClass.create({ x: x, y: y, multiple: 2 });
            }
            this._costGrid = null;*/
        }
    }

    _onDragLeftStart(e) {
        if (game.activeTool == "select")
            this.dragging = true;
    }

    _onDragLeftMove(event) {
        if (game.activeTool == "select")
            return this._onDragSelect(event);
        else if (game.activeTool == 'addterrain') {
            let pos = event.data.getLocalPosition(canvas.app.stage);
            let gridPt = canvas.grid.grid.getGridPositionFromPixels(pos.x, pos.y);
            let [y, x] = gridPt;  //Normalize the returned data because it's in [y,x] format

            this.createTerrain({ x: x, y: y });
            /*let pos = event.data.getLocalPosition(canvas.app.stage);
            let gridPt = canvas.grid.grid.getGridPositionFromPixels(pos.x, pos.y);
            let [y, x] = gridPt;  //Normalize the returned data because it's in [y,x] format

            if (!this.terrainExists(x, y)) {
                //const terrain = new Terrain({ x: x, y: y });
                //terrain.draw();
                //this.constructor.placeableClass.create(terrain.data);
                this.constructor.placeableClass.create({ x: x, y: y, multiple: 2 });
            }
            this._costGrid = null;*/
        }
    }

    _onDragSelect(event) {
        // Extract event data
        const { origin, destination } = event.data;

        // Determine rectangle coordinates
        let coords = {
            x: Math.min(origin.x, destination.x),
            y: Math.min(origin.y, destination.y),
            width: Math.abs(destination.x - origin.x),
            height: Math.abs(destination.y - origin.y)
        };

        // Draw the select rectangle
        canvas.controls.drawSelect(coords);
        event.data.coords = coords;
    }

    _onDragLeftDrop(e) {
        if (game.activeTool == "select") {
            canvas._onDragLeftDrop(event);
        }
        else if (game.activeTool != 'addterrain') {
            super._onDragLeftDrop(event);
        }
    }

    selectObjects({ x, y, width, height, releaseOptions = {}, controlOptions = {} } = {}) {
        const oldSet = Object.values(this._controlled);

        let sPt = canvas.grid.grid.getGridPositionFromPixels(x, y);
        let [y1, x1] = sPt;  //Normalize the returned data because it's in [y,x] format
        let dPt = canvas.grid.grid.getGridPositionFromPixels(x + width, y + height);
        let [y2, x2] = dPt;  //Normalize the returned data because it's in [y,x] format

        // Identify controllable objects
        const controllable = this.placeables.filter(obj => obj.visible && (obj.control instanceof Function));
        const newSet = controllable.filter(obj => {
            return !(obj.data.x < x1 || obj.data.x > x2 || obj.data.y < y1 || obj.data.y > y2);
        });

        // Release objects no longer controlled
        const toRelease = oldSet.filter(obj => !newSet.includes(obj));
        toRelease.forEach(obj => obj.release(releaseOptions));

        // Control new objects
        if (isObjectEmpty(controlOptions)) controlOptions.releaseOthers = false;
        const toControl = newSet.filter(obj => !oldSet.includes(obj));
        toControl.forEach(obj => obj.control(controlOptions));

        // Return a boolean for whether the control set was changed
        const changed = (toRelease.length > 0) || (toControl.length > 0);
        if (changed) canvas.initializeSources();
        return changed;
    }

    createTerrain(data, options = { }) {
        if (!this.terrainExists(data.x, data.y)) {
            data.multiple = data.multiple || this.defaultmultiple;
            this.constructor.placeableClass.create(data, options);
        }
        this._costGrid = null;
    }

    terrainExists(pxX, pxY) {
        return canvas.scene.data.terrain.find(t => { return t.x == pxX && t.y == pxY }) != undefined;
    }
}