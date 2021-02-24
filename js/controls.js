Hooks.on('getSceneControlButtons', (controls) => {
	if (game.user.isGM && canvas != null) {
	    controls.push({
			name: 'terrain',
			title: game.i18n.localize('EM.sf'),
			icon: 'fas fa-mountain',
			layer: 'TerrainLayer',
			tools: [
				{
		        	name: 'terraintoggle',
		        	title: game.i18n.localize('EM.onoff'),
		        	icon: 'fas fa-eye',
		        	onClick: () => {
		        	  canvas.terrain.toggle(true);
		        	},
		        	active: canvas.terrain.highlight.children[0].visible,
		        	toggle: true
		        },
				{
					name: 'addterrain',
					title:'EM.select',
					icon:'fas fa-plus-square'
				},
				{
					name:'subtractterrain',
					title:'EM.subtract',
					icon:'fas fa-minus-square'
				},
				{
		          name: 'clearterrain',
		          title: game.i18n.localize('EM.reset'),
		          icon: 'fas fa-trash',
		          onClick: () => {
		            const dg = new Dialog({
		              title: game.i18n.localize('EM.reset'),
		              content: game.i18n.localize('EM.confirmReset'),
		              buttons: {
		                reset: {
		                  icon: '<i class="fas fa-trash"></i>',
		                  label: 'Reset',
		                  callback: () => canvas.terrain.resetGrid(true),
		                },
		                
		                cancel: {
		                  icon: '<i class="fas fa-times"></i>',
		                  label: 'Cancel',
		                },
		              },
		              default: 'cancel',
		            });
		            dg.render(true);
		          },
		          button: true,
		        },
			],
			activeTool:'addterrain'
	  	})
	}
});
Hooks.on('renderSceneControls', (controls) => {
	if (canvas != null) {
		canvas.terrain.visible = (canvas.terrain.showterrain || controls.activeControl == 'terrain');

		if (controls.activeControl == 'terrain') {
			if (canvas.terrain.toolbar == undefined)
				canvas.terrain.toolbar = new TerrainLayerToolBar();
			canvas.terrain.toolbar.render(true);
			//$('#terrainlayer-tools').toggle(controls.activeTool == 'addterrain');
		} else {
			if (!canvas.terrain.toolbar)
				return;
			canvas.terrain.toolbar.close();
		}
	}
});
Hooks.on('renderTerrainLayerToolBar', () => {
	const tools = $(canvas.terrain.toolbar.form).parent();
	if (!tools)
		return;
	const controltools = $('li[data-control="terrain"] ol.control-tools');
	const offset = controltools.offset();
	tools.css({ top: `${offset.top}px`, left: `${offset.left + controltools.width() + 6}px` });
});

Hooks.on('init', () => {

})