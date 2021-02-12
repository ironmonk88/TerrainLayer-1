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
        log('costGrid is deprecated, please use the cost function instead');
        if (this._costGrid == undefined) {
            this.buildCostGrid(canvas.scene.data.terrain);
        }
        return this._costGrid;
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

        for(let [k, v] of Object.entries(canvas.scene.data.flags?.TerrainLayer)) {
            if (k.startsWith('terrain'))
                canvas.scene.data.terrain.push(v);
        };

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

    async deleteMany(ids, options = {}) {
        //+++ need to update this to only respond to actual deletions

        let originals = [];
        let flags = duplicate(canvas.scene.data.flags?.TerrainLayer);
        for (let id of ids) {
            const object = this.get(id);
            log('Removing terrain', object.data.x, object.data.y);
            originals.push(object);
            this.objects.removeChild(object);
            object._onDelete(options, game.user.id);
            object.destroy({ children: true });

            delete flags['terrain' + id];
        }

        this.storeHistory("delete", originals);

        canvas.scene.update({ flags: { TerrainLayer: flags } });
    }

    _onClickLeft(event) {
        super._onClickLeft(event);
        if (game.activeTool == 'addterrain') {
            this.createTerrain(event.data.getLocalPosition(canvas.app.stage));
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
        if (game.activeTool == "selectterrain")
            this.dragging = true;
    }

    _onDragLeftMove(event) {
        if (game.activeTool == "selectterrain")
            return this._onDragSelect(event);
        else if (game.activeTool == 'addterrain') {
            this.createTerrain(event.data.getLocalPosition(canvas.app.stage));
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
        if (game.activeTool == "selectterrain") {
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

    createTerrain(pos) {
        let gridPt = canvas.grid.grid.getGridPositionFromPixels(pos.x, pos.y);
        let [y, x] = gridPt;  //Normalize the returned data because it's in [y,x] format

        if (!this.terrainExists(x, y)) {
            //const terrain = new Terrain({ x: x, y: y });
            //terrain.draw();
            //this.constructor.placeableClass.create(terrain.data);
            this.constructor.placeableClass.create({ x: x, y: y, multiple: this.defaultmultiple });
        }
        this._costGrid = null;
    }


    /* -------------------------------------------- */

    /**
     * Handle drop events for Tile data on the Tiles Layer
     * @param {DragEvent} event     The concluding drag event
     * @param {object} data         The extracted Tile data
     * @private
     */
    async _onDropTerrainData(event, data) {
        if (!data.img) return;
        if (!this._active) this.activate();

        // Determine the tile size
        const tex = await loadTexture(data.img);
        const ratio = canvas.dimensions.size / (data.terrainSize || canvas.dimensions.size);
        data.width = tex.baseTexture.width * ratio;
        data.height = tex.baseTexture.height * ratio;

        // Validate that the drop position is in-bounds and snap to grid
        if (!canvas.grid.hitArea.contains(data.x, data.y)) return false;
        data.x = data.x - (data.width / 2);
        data.y = data.y - (data.height / 2);
        if (!event.shiftKey) mergeObject(data, canvas.grid.getSnappedPosition(data.x, data.y));

        // Create the tile as hidden if the ALT key is pressed
        if (event.altKey) data.hidden = true;

        // Create the Tile
        return this.constructor.placeableClass.create(data);
    }

    terrainExists(pxX, pxY) {
        return canvas.scene.data.terrain.find(t => { return t.x == pxX && t.y == pxY }) != undefined;
    }
}

class Terrain extends PlaceableObject {
    constructor(...args) {
        super(...args);

        // Clean initial data
        this._cleanData();
        /**
         * The Tile border frame
         * @type {PIXI.Container|null}
         */
        this.frame = null;

        /**
         * The Tile image container
         * @type {PIXI.Container|null}
         */
        this.terrain = null;
    }

    /* -------------------------------------------- */

    /** @override */
    static get embeddedName() {
        return "Terrain";
    }

    static get layer() {
        return canvas.terrain;
    }

    static async create(data, options) {

        //super.create(data, options);
        //canvas.scene._data.terrain

        let userId = game.user._id;

        data = data instanceof Array ? data : [data];
        for (let d of data) {
            const allowed = Hooks.call(`preCreateTerrain`, this, d, options, userId);
            if (allowed === false) {
                debug(`Terrain creation prevented by preCreate hook`);
                return null;
            }
        }

        let embedded = data.map(d => {
            let object = canvas.terrain.createObject(d);
            object._onCreate(options, userId);
            canvas.scene.data.terrain.push(d);
            canvas.scene.setFlag('TerrainLayer', 'terrain' + d._id, d);
            Hooks.callAll(`createTerrain`, canvas.terrain, d, options, userId);
            return d;
        });

        //+++layer.storeHistory("create", result);

        return data.length === 1 ? embedded[0] : embedded;

        /*
        const created = await canvas.scene.createEmbeddedEntity(this.embeddedName, data, options);
        if (!created) return;
        if (created instanceof Array) {
            return created.map(c => this.layer.get(c._id));
        } else {
            return this.layer.get(created._id);
        }*/

        //canvas.scene.data.terrain.push(data);
        //await canvas.scene.setFlag('TerrainLayer', 'terrain' + data._id, data);

        //return this;
    }

    _onDelete() {
        //+++delete this.layer._controlled[this.id];
        //+++if ( layer._hover === this ) layer._hover = null;
    }

    /* -------------------------------------------- */

    /**
     * Apply initial sanitizations to the provided input data to ensure that a Tile has valid required attributes.
     * @private
     */
    _cleanData() {
        let makeid = function () {
            var result = '';
            var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            var charactersLength = characters.length;
            for (var i = 0; i < 16; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }

        if (this.data._id == undefined)
            this.data._id = makeid();

        if (isNaN(parseInt(this.data.multiple)))
            this.data.multiple = 2;
        this.data.multiple = parseInt(this.data.multiple);

        // Constrain canvas coordinates
        if (!canvas || !this.scene?.active) return;
        const d = canvas.dimensions;
        const minX = d.paddingX / d.size;
        const minY = d.paddingY / d.size;
        const maxX = (d.width / d.size) + minX;
        const maxY = (d.height / d.size) + minY;
        this.data.x = Math.clamped(parseInt(this.data.x), minX, maxX);
        this.data.y = Math.clamped(parseInt(this.data.y), minY, maxY);

        this.data.flags = this.data.flags || {};
    }

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @override */
    async draw() {
        this.clear();

        // Create the outer frame for the border and interaction handles
        this.frame = this.addChild(new PIXI.Container());
        this.frame.border = this.frame.addChild(new PIXI.Graphics());

        // Create the tile container and it's child elements
        let mult = Math.clamped(this.data.multiple, 2, 4);
        this.terrain = this.addChild(new PIXI.Container());
        this.texture = await loadTexture('modules/TerrainLayer/img/square' + mult + 'x.svg' );
        this.terrain.img = this.terrain.addChild(this._drawPrimarySprite(this.texture));
        //this.terrain.img = this.addChild(new PIXI.Graphics);//new TerrainSquare());

        // Refresh the current display
        this.refresh();

        // Enable interactivity, only if the Tile has a true ID
        if (this.id) this.activateListeners();
        return this;
    }

    /* -------------------------------------------- */

    /** @override */
    refresh() {
        let s = canvas.dimensions.size;
        //let bit = (s / 16) * (Math.clamped(this.data.multiple, 2, 4) - 1);
        let mid = (s / 2);

        let terrainSquare = this.terrain.img;

        let gsW = canvas.grid.grid.w;
        let gsH = canvas.grid.grid.h;

        let bounds = null;
        if (this.terrain.img) {
            const img = this.terrain.img;

            // Set the tile dimensions and mirroring
            img.width = s;
            img.height = s;

            bounds = this.terrain.getLocalBounds(undefined, true);
        } else {
            bounds = new NormalizedRectangle(0, 0, s, s);
        }

        /*
        terrainSquare.width = gsW;
        terrainSquare.height = gsH;
        terrainSquare.beginFill(0xffffff, 0.5);
        terrainSquare.lineStyle(1, 0xffffff, 0.5);
        terrainSquare.drawPolygon([0, 0, bit, 0, 0, bit]);
        terrainSquare.drawPolygon([mid - bit, 0, mid + bit, 0, 0, mid + bit, 0, mid - bit]);
        terrainSquare.drawPolygon([s, 0, s, bit, bit, s, 0, s, 0, s - bit, s - bit, 0]);
        terrainSquare.drawPolygon([s, mid - bit, s, mid + bit, mid + bit, s, mid - bit, s]);
        terrainSquare.drawPolygon([s, s, s - bit, s, s, s - bit]);
        terrainSquare.endFill();

        terrainSquare.closePath();
        terrainSquare.blendMode = PIXI.BLEND_MODES.OVERLAY;*/

        if (game.settings.get('TerrainLayer', 'showText')) {
            let fontsize = (s / 3);
            let text = new PIXI.Text('x' + multiple, { fontFamily: 'Arial', fontSize: fontsize, fill: 0xffffff, opacity: 0.6, align: 'center' });
            text.blendMode = PIXI.BLEND_MODES.OVERLAY;
            text.anchor.set(0.5, 0.5);
            text.x = text.y = mid;
            this.terrain.img.addChild(text);
        }

        this.terrain.img.alpha = game.settings.get('TerrainLayer', 'opacity');

        // Set Tile position
        let px = canvas.grid.grid.getPixelsFromGridPosition(this.data.y, this.data.x);
        this.position.set(px[0], px[1]);

        this.terrain.width = this.terrain.img.width;
        this.terrain.height = this.terrain.img.height;

        // Allow some extra padding to detect handle hover interactions
        this.hitArea = this._controlled ? bounds.clone().pad(20) : bounds;

        // Update border frame
        this._refreshBorder(bounds);

        this.visible = !this.data.hidden || game.user.isGM;
        return this;
    }

    /* -------------------------------------------- */

    /**
     * Refresh the display of the Tile border
     * @private
     */
    _refreshBorder(b) {
        const border = this.frame.border;

        // Determine border color
        const colors = CONFIG.Canvas.dispositionColors;
        let bc = colors.INACTIVE;
        if (this._controlled) {
            bc = colors.CONTROLLED;
        }

        // Draw the tile border
        const t = CONFIG.Canvas.objectBorderThickness;
        const h = Math.round(t / 2);
        const o = Math.round(h / 2);

        let s = canvas.dimensions.size;
        //let [x,y] = canvas.grid.grid.getPixelsFromGridPosition(this.data.y, this.data.x);
        let x = 0;
        let y = 0;
        border.clear()
            .lineStyle(t, 0x000000, 1.0).drawRoundedRect(x - o, y - o, s + h, s + h, 3)
            .lineStyle(h, bc, 1.0).drawRoundedRect(x - o, y - o, s + h, s + h, 3);
        border.visible = this._hover || this._controlled;
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners() {
        super.activateListeners();
        /*
        this.frame.handle.off("mouseover").off("mouseout").off("mousedown")
            .on("mouseover", this._onHandleHoverIn.bind(this))
            .on("mouseout", this._onHandleHoverOut.bind(this))
            .on("mousedown", this._onHandleMouseDown.bind(this));
        this.frame.handle.interactive = true;*/
    }

    /* -------------------------------------------- */
    /*  Database Operations                         */
    /* -------------------------------------------- */

    /** @override */
    _onUpdate(data) {
        const changed = new Set(Object.keys(data));
        if (changed.has("z")) {
            this.zIndex = parseInt(data.z) || 0;
        }

        // Release control if the Tile was locked
        if (data.locked) this.release();

        // Full re-draw or partial refresh
        if (changed.has("multiple")) return this.draw();
        this.refresh();

        // Update the sheet, if it's visible
        if (this._sheet && this._sheet.rendered) this.sheet.render();
    }

    /* -------------------------------------------- */
    /*  Interactivity                               */
    /* -------------------------------------------- */

    /** @override */
    _canHUD(user, event) {
        return this._controlled;
    }

    /* -------------------------------------------- */

    /** @override */
    _canConfigure(user, event) {
        if (this.data.locked && !this._controlled) return false;
        return super._canConfigure(user);
    }

    _canDrag(user, event) {
        return false;
    }

    /* -------------------------------------------- */

    /**
     * Create a preview tile with a background texture instead of an image
     * @return {Tile}
     */
    static createPreview(data) {
        const terrain = new Terrain(mergeObject({
            x: 0,
            y: 0,
            rotation: 0,
            z: 0,
            width: 0,
            height: 0
        }, data));
        terrain._controlled = true;

        // Swap the tile and the frame
        terrain.draw().then(t => {
            terrain.removeChild(terrain.frame);
            terrain.addChild(terrain.frame);
        });
        return terrain;
    }

    async update(data, options) {
        let objectdata = duplicate(canvas.scene.getFlag("TerrainLayer", "terrain" + this.data._id));
        mergeObject(this.data, data);
        delete this.data.id;
        mergeObject(objectdata, this.data);
        await canvas.scene.setFlag("TerrainLayer", "terrain" + this.data.id, objectdata);
        this.texture = await loadTexture('modules/TerrainLayer/img/square' + this.data.multiple + 'x.svg');
        this.terrain.removeChild(this.terrain.img);
        this.terrain.img = this.terrain.addChild(this._drawPrimarySprite(this.texture));
        this.refresh();
        return this;
    }

    async delete(options) {
        let layerdata = duplicate(this.scene.getFlag("TerrainLayer", "data"));
        let idx = layerdata.findIndex(t => { return t._id == this.id });
        layerdata.splice(idx, 1);
        await this.scene.setFlag("TerrainLayer", "data", layerdata);
        return this;
    }
}

export class TerrainHUD extends BasePlaceableHUD {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "terrain-hud",
            template: "modules/TerrainLayer/templates/terrain-hud.html"
        });
    }

    /* -------------------------------------------- */

    /** @override */
    getData() {
        const data = super.getData();
        return mergeObject(data, {
            visibilityClass: data.hidden ? "active" : "",
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.inc-multiple', this.element).on("click", this._onHandleClick.bind(this, true));
        $('.dec-multiple', this.element).on("click", this._onHandleClick.bind(this, false));
        /*
        this.frame.handle.off("mouseover").off("mouseout").off("mousedown")
            .on("mouseover", this._onHandleHoverIn.bind(this))
            .on("mouseout", this._onHandleHoverOut.bind(this))
            .on("mousedown", this._onHandleMouseDown.bind(this));
        this.frame.handle.interactive = true;*/
    }

    /*
     * async _onToggleVisibility(event) {
    event.preventDefault();

    // Toggle the visible state
    const isHidden = this.object.data.hidden;
    const updates = this.layer.controlled.map(o => {
      return {_id: o.id, hidden: !isHidden};
    });

    // Update all objects
    await this.layer.updateMany(updates);
    event.currentTarget.classList.toggle("active", !isHidden);
  }
  */

    _onHandleClick(increase, event) {
        let mult = this.object.data.multiple;
        let idx = TerrainLayer.multipleOptions.indexOf(mult);
        idx = Math.clamped((increase ? idx + 1 : idx - 1), 0, TerrainLayer.multipleOptions.length - 1);
        this.object.update({ multiple: TerrainLayer.multipleOptions[idx] });
        this.object.refresh();
    }

    /* -------------------------------------------- */

    /** @override */
    setPosition() {
        $('#hud').append(this.element);
        let { x, y, width, height } = this.object.hitArea;
        const c = 70;
        const p = -10;
        let px = canvas.grid.grid.getPixelsFromGridPosition(this.object.data.y, this.object.data.x);
        const position = {
            width: width + (c * 2) + (p * 2),
            height: height + (p * 2),
            left: x + px[0] - c - p,
            top: y + px[1] - p
        };
        this.element.css(position);
    }
}

class TerrainConfig extends FormApplication {

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

class TerrainSquare extends PIXI.Graphics {
    constructor(coord, ...args) {
        super(...args);
        this.coord = coord;
        let topLeft = canvas.grid.grid.getPixelsFromGridPosition(coord.x, coord.y)
        this.thePosition = `${topLeft[0]}.${topLeft[1]}`;
    }
}