import { TerrainLayer } from './classes/terrainlayer.js';
import { TerrainHUD } from './classes/terrainhud.js';
import { registerSettings } from "./js/settings.js";

function registerLayer() {
	const layers = mergeObject(Canvas.layers, {
		terrain: TerrainLayer
	});
	Object.defineProperty(Canvas, 'layers', {
		get: function () {
			return layers;
		}
	});
}

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
	registerLayer();

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
	//let handleDragCancel = MouseInteractionManager.prototype._handleDragCancel;

	/*
	MouseInteractionManager.prototype._handleDragCancel = function (event) {
		if (canvas != null) 
			canvas.terrain.highlight.children[0].visible = (canvas.terrain.showterrain || ui.controls.activeControl == 'terrain');
		handleDragCancel.apply(this, [event])
	}*/
})

Hooks.on('renderMeasuredTemplateConfig', (config, html, data) => {
	let widthRow = $('input[name="width"]', html).parent();
	let tlrow = $('<div>').addClass('form-group')
		.append($('<label>').html('Movement Cost'))
		.append($('<input>').attr('type', 'number').attr('name', 'flags.TerrainLayer.multiple').attr('data-type', 'Number').val(config.object.getFlag('TerrainLayer', 'multiple')))
		.insertAfter(widthRow);

	let height = $(html).height();
	$(html).css({height: height + 30});
})
