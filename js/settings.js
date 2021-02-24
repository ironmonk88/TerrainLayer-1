export const registerSettings = function () {
	game.settings.register('TerrainLayer', 'opacity', {
		name: "TerrainLayer.opacity-s",
		hint: "TerrainLayer.opacity-l",
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