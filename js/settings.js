export const registerSettings = function () {
	game.settings.register('TerrainLayer', 'opacity', {
		name: "TerrainLayer.opacity.name",
		hint: "TerrainLayer.opacity.hint",
		scope: "world",
		config: true,
		default: 1,
		type: Number,
		range: {
			min: 0.5,
			max: 1,
			step: 0.1
		}
	});
	game.settings.register('TerrainLayer', 'showText', {
		name: "TerrainLayer.showText.name",
		hint: "TerrainLayer.showText.hint",
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});
	game.settings.register(modulename, 'tokens-cause-difficult', {
		name: "TerrainLayerV2.tokens-cause-difficult.name",
		hint: "TerrainLayerV2.tokens-cause-difficult.hint",
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