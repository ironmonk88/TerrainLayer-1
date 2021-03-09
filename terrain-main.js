import { TerrainLayer } from './classes/terrainlayer.js';
import { TerrainHUD } from './classes/terrainhud.js';
import { registerSettings } from "./js/settings.js";

let theLayers = Canvas.layers;
theLayers.terrain = TerrainLayer;

/*
let oldConfig = Scene.prototype.constructor.config;
Scene.prototype.constructor.config = function () {
	let result = oldConfig.call(this);
	result.embeddedEntities.Terrain = "terrains";
	return result;
}*/

Hooks.on('canvasInit', () => {
	canvas.hud.terrain = new TerrainHUD();
	//Scene.constructor.config.embeddedEntities.Terrain = "terrain";
});

Hooks.on('init', () => {
	game.socket.on('module.TerrainLayer', async (data) => {
		console.log(data)
		canvas.terrain[data.action].apply(canvas.terrain, data.arguments);
	});

	registerSettings();

	let oldOnDragLeftStart = Token.prototype._onDragLeftStart;
	Token.prototype._onDragLeftStart = function (event) {
		oldOnDragLeftStart.apply(this, [event])
		if (canvas != null)
			canvas.terrain.visible = (canvas.grid.type != 0);
	}

	let oldOnDragLeftDrop = Token.prototype._onDragLeftDrop;
	Token.prototype._onDragLeftDrop = function (event) {
		if (canvas != null)
			canvas.terrain.visible = (canvas.grid.type != 0 && (canvas.terrain.showterrain || ui.controls.activeControl == 'terrain'));
		oldOnDragLeftDrop.apply(this, [event]);
	}
	let oldOnDragLeftCancel = Token.prototype._onDragLeftCancel;
	Token.prototype._onDragLeftCancel = function (event) {
		//event.stopPropagation();
		if (canvas != null)
			canvas.terrain.visible = (canvas.grid.type != 0 && (canvas.terrain.showterrain || ui.controls.activeControl == 'terrain'));

		oldOnDragLeftCancel.apply(this, [event])
	}
	let handleDragCancel = MouseInteractionManager.prototype._handleDragCancel;

	/*
	MouseInteractionManager.prototype._handleDragCancel = function (event) {
		if (canvas != null) 
			canvas.terrain.highlight.children[0].visible = (canvas.terrain.showterrain || ui.controls.activeControl == 'terrain');
		handleDragCancel.apply(this, [event])
	}*/
})

Object.defineProperty(Canvas, 'layers', {
	get: function () {
		return theLayers;
	}
})
