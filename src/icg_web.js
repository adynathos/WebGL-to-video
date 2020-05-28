/*
Functions related to the web platform

* waiting for document initialization
* texture loading
* keyboard bidings
*/

/*
This promise gets resolved when the document has loaded
* loading - https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event
* what is a promise - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
*/
const DOM_loaded_promise = new Promise((accept, reject) => {
	if (document.readyState === 'loading') {  // Loading hasn't finished yet
		 document.addEventListener('DOMContentLoaded', accept);
	} else {  // `DOMContentLoaded` has already fired
		accept();
	}
}); 

function async_timeout(time_s) {
	return new Promise(resolve => setTimeout(resolve, time_s*1000));
}

/*
Downloads an image from an URL
*/
function load_image(img_url) {
	return new Promise((resolve, reject) => {
		const img_obj = new Image;
		img_obj.crossOrigin = "anonymous";
		img_obj.addEventListener('load', (ev) => resolve(ev.target));
		img_obj.addEventListener('error', (ev) => {
			console.error(`Failed to load image ${img_url}, maybe due to CORS. img.onerror returned`, ev);
			reject(ev);
		});
		img_obj.src = img_url;
	});
}

/*
Downloads an image and converts it to a WebGL texture.
We need to provide the regl instance which communicates with the GPU to put the texture in GPU memory.
	tex_options = override construction options
		https://github.com/regl-project/regl/blob/master/API.md#textures
*/
async function load_texture(regl_instance, img_url, tex_options) {
	const img = await load_image(img_url);

	return regl_instance.texture(Object.assign({
		data: img,
		// when sampling the texture, use linear interpolation not just the nearest pixel
		mag: 'linear',
		min: 'linear', 
	}, tex_options))
}

async function load_text(url) {
	try {
		const response = await fetch(url);
		const response_text = await response.text();
		return response_text;
	} catch (e) {
		console.error('Failed to load text resource from', url, 'error:', e);
		throw e;
	}
}

async function load_mesh_obj(regl_instance, url, material_colors_by_name) {
	const obj_data = await load_text(url);
	const mesh_loaded_obj = new OBJ.Mesh(obj_data);

	const faces_from_materials = [].concat(...mesh_loaded_obj.indicesPerMaterial);
	
	let vertex_colors = null;

	if(material_colors_by_name) {
		const material_colors_by_index = mesh_loaded_obj.materialNames.map((name) => {
			let color = material_colors_by_name[name];
			if (color === undefined) {
				console.warn(`Missing color for material ${name} in mesh ${url}`);
				color = [1., 0., 1.];
			}
			return color;
		});

		vertex_colors = [].concat(mesh_loaded_obj.vertexMaterialIndices.map((mat_idx) => material_colors_by_index[mat_idx]));
		vertex_colors = regl_instance.buffer(vertex_colors);
	}


	// Transfer the data into GPU buffers
	// It is not necessary to do so (regl can deal with normal arrays),
	// but this way we make sure its transferred only once and not on every draw.
	const mesh_with_our_names = {
		vertex_positions: regl_instance.buffer(mesh_loaded_obj.vertices),
		vertex_tex_coords: regl_instance.buffer(mesh_loaded_obj.textures),
		vertex_normals: regl_instance.buffer(mesh_loaded_obj.vertexNormals),
		
		// https://github.com/regl-project/regl/blob/master/API.md#elements
		faces: regl_instance.elements({data: faces_from_materials, type: 'uint16'}),
		
		vertex_color: vertex_colors,

		lib_obj: mesh_loaded_obj,
	};

	return mesh_with_our_names;
}

/*
Key-bindings
keyboard_actions holds functions to be called when keys are pressed.
	keyboard_actions['a'] = function_to_call_on_A_key
*/
const keyboard_actions = {};

DOM_loaded_promise.then(() => {
	document.addEventListener('keydown', (event) => {
		// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
		// Shift affects the key string, shift+a yields A
		// Alt+letter yields locale specific characters, alt+a = ą etc
		const key = event.key.toLowerCase();

		/*
		const modifiers = [];
		
		if(event.ctrlKey) {
			modifiers.push('Ctrl');
		}

		if(event.altKey) {
			modifiers.push('Ctrl');
		}

		if(event.shiftKey) {
			modifiers.push('Shift');
		}

		if(event.metaKey) {
			modifiers.push('Super')
		}

		console.log('keyboard', `${modifiers.join('+')} ${key}`);
		*/

		const handlers = keyboard_actions[key];

		if(handlers) {
			handlers.forEach(f => f(event));
		}
	});
})

function register_keyboard_action(key, func) {
	key = key.toLowerCase();
	handlers = keyboard_actions[key] || [];
	keyboard_actions[key] = handlers;
	handlers.push(func);
}
