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
export const DOM_loaded_promise = new Promise((accept, reject) => {
	if (document.readyState === 'loading') {  // Loading hasn't finished yet
		 document.addEventListener('DOMContentLoaded', accept);
	} else {  // `DOMContentLoaded` has already fired
		accept();
	}
}); 

export function async_timeout(time_s) {
	return new Promise(resolve => setTimeout(resolve, time_s*1000));
}

/*
Downloads an image from an URL
*/
export function load_image(img_url) {
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
export async function load_texture(regl_instance, img_url, tex_options) {
	const img = await load_image(img_url);

	return regl_instance.texture(Object.assign({
		data: img,
		// when sampling the texture, use linear interpolation not just the nearest pixel
		mag: 'linear',
		min: 'linear', 
	}, tex_options))
}

export async function load_text(url) {
	try {
		const response = await fetch(url);
		const response_text = await response.text();
		return response_text;
	} catch (e) {
		console.error('Failed to load text resource from', url, 'error:', e);
		throw e;
	}
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

export function register_keyboard_action(key, func) {
	key = key.toLowerCase();
	const handlers = keyboard_actions[key] || [];
	keyboard_actions[key] = handlers;
	handlers.push(func);
}

export function register_button_with_hotkey(button_id, hotkey, func) {
	register_keyboard_action(hotkey, func)
	document.getElementById(button_id).addEventListener('click', func)
}
