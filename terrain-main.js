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

async function checkUpgrade() {
	let hasInformed = false;
	let inform = function () {
		if (!hasInformed) {
			ui.notifications.info('Converting old TerrainLayer data, please wait');
			hasInformed = true;
        }
	}

	for (let scene of game.scenes.entries) {
		if (scene.data.flags?.TerrainLayer) {
			let gW = scene.data.grid;
			let gH = scene.data.grid;

			let data = duplicate(scene.data.flags?.TerrainLayer);
			for (let [k, v] of Object.entries(data)) {
				if (k.startsWith('terrain')) {
					if (k == 'terrainundefined' || v == undefined || v.x == undefined || v.y == undefined)
						await scene.unsetFlag('TerrainLayer', k);
					else if (v.points == undefined) {
						inform();
						let data = duplicate(v);
						data.x = data.x * gW;
						data.y = data.y * gH;
						data.points = [[0, 0], [gW, 0], [gW, gH], [0, gH], [0, 0]];
						data.width = gW;
						data.height = gH;
						await scene.setFlag('TerrainLayer', k, data);
					}	
				} else if (k == 'costGrid') {
					let grid = scene.getFlag('TerrainLayer', 'costGrid');
					for (let y in grid) {
						for (let x in grid[y]) {
							if (Object.values(data).find(t => { return t.x == (parseInt(x) * gW) && t.y == (parseInt(y) * gH); }) == undefined) {
								inform();
								let id = makeid();
								let data = { _id: id, x: parseInt(x) * gW, y: parseInt(y) * gH, points: [[0, 0], [gW, 0], [gW, gH], [0, gH], [0, 0]], width: gW, height: gH, multiple: grid[y][x].multiple };
								await scene.setFlag('TerrainLayer', 'terrain' + id, data);
							}
						}
					}
					await scene.unsetFlag('TerrainLayer', 'costGrid');
                }
			};
		}
    }

	if (hasInformed)
		ui.notifications.info('TerrainLayer conversion complete.');
}

export function makeid() {
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for (var i = 0; i < 16; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

Hooks.on('canvasInit', () => {
	canvas.hud.terrain = new TerrainHUD();
	//Scene.constructor.config.embeddedEntities.Terrain = "terrain";
});

Hooks.on('ready', () => {
	checkUpgrade();
})

Hooks.on('init', () => {
	game.socket.on('module.TerrainLayer', async (data) => {
		console.log(data);
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
		const ruler = canvas.controls.ruler;

		if (canvas != null && !(ruler.isDragRuler || ruler._state === Ruler.STATES.MEASURING))
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
