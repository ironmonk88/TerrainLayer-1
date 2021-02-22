export const registerSettings = function () {
	game.settings.register('TerrainLayer', 'scale', {
		name: "TerrainLayer.scale-s",
		hint: "TerrainLayer.scale-l",
		scope: "world",
		config: true,
		default: 1,
		type: Number,
		range: {
			min: 0.4,
			max: 1,
			step: 0.1
		},
		onChange: () => {
			canvas.terrain.buildFromCostGrid();
		}
	});
	game.settings.register('TerrainLayer', 'opacity', {
		name: "TerrainLayer.opacity-s",
		hint: "TerrainLayer.opacity-l",
		scope: "world",
		config: true,
		default: 1,
		type: Number,
		range: {
			min: 0.3,
			max: 1,
			step: 0.1
		},
		onChange: () => {
			canvas.terrain.buildFromCostGrid();
		}
	});
	game.settings.register('TerrainLayer', 'maxMultiple', {
		name: "TerrainLayer.multiple-s",
		hint: "TerrainLayer.multiple-l",
		scope: "world",
		config: true,
		default: 3,
		type: Number
	});
	game.settings.register('TerrainLayer', 'showText', {
		name: "TerrainLayer.showtext-s",
		hint: "TerrainLayer.showtext-l",
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});
	game.settings.register('TerrainLayer', 'showterrain', {
		scope: "world",
		config: false,
		default: false,
		type: Boolean
	});
};