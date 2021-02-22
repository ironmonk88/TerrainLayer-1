import { log, setting } from "./terrainlayer.js";

export class Terrain extends PlaceableObject {
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

        let s = canvas.dimensions.size;
        let mid = (s / 2);

        // Create the outer frame for the border and interaction handles
        this.frame = this.addChild(new PIXI.Container());
        this.frame.border = this.frame.addChild(new PIXI.Graphics());

        // Create the tile container and it's child elements
        let mult = Math.clamped(this.data.multiple, 2, 4);
        this.terrain = this.addChild(new PIXI.Container());
        this.texture = await loadTexture('modules/TerrainLayer/img/square' + mult + 'x.svg');
        this.terrain.img = this.terrain.addChild(this._drawPrimarySprite(this.texture));
        this.terrain.img.blendMode = PIXI.BLEND_MODES.OVERLAY;
        //this.terrain.img = this.addChild(new PIXI.Graphics);//new TerrainSquare());

        let fontsize = (s / 3);
        this.terrain.text = new PIXI.Text('x' + mult, { fontFamily: 'Arial', fontSize: fontsize, fill: 0xffffff, opacity: 1, align: 'center' });
        this.terrain.text.blendMode = PIXI.BLEND_MODES.OVERLAY;
        this.terrain.text.anchor.set(0.5, 0.5);
        this.terrain.text.x = this.terrain.text.y = mid;
        this.terrain.addChild(this.terrain.text);

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

        this.terrain.text.visible = setting('showText');

        this.terrain.img.alpha = 0.5; //setting('opacity');
        this.terrain.alpha = 1;

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
        //update this object
        mergeObject(this.data, data);
        delete this.data.id; //remove the id if I've accidentally added it.  We should be using _id
        //update the data and save it to the scene
        mergeObject(objectdata, this.data);
        await canvas.scene.setFlag("TerrainLayer", "terrain" + this.data._id, objectdata);
        //if the multiple has changed then update the image
        if (data.multiple != undefined) {
            this.texture = await loadTexture('modules/TerrainLayer/img/square' + this.data.multiple + 'x.svg');
            this.terrain.removeChild(this.terrain.img);
            this.terrain.img = this.terrain.addChild(this._drawPrimarySprite(this.texture));
        }
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