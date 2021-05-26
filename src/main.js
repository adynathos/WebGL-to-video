import {createREGL} from "../lib/regljs_2.1.0/regl.module.js"
import {vec2, vec3, vec4, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"

import {DOM_loaded_promise, load_text, register_keyboard_action} from "./icg_web.js"
import {deg_to_rad, mat4_to_string, vec_to_string, mat4_matmul_many} from "./icg_math.js"
import {icg_mesh_load_obj} from "./icg_mesh.js"
import {init_scene} from "./scene.js"
import {CanvasVideoRecording} from "./icg_screenshot.js"

async function main() {
	/* const in JS means the variable will not be bound to a new value, but the value can be modified (if its an object or array)
		https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const
	*/

	const debug_overlay = document.getElementById('debug-overlay');
	const debug_text = document.getElementById('debug-text');

	// We are using the REGL library to work with webGL
	// http://regl.party/api
	// https://github.com/regl-project/regl/blob/master/API.md

	const regl = createREGL({ // the canvas to use
	});

	// The <canvas> (HTML element for drawing graphics) was created by REGL, lets take a handle to it.
	const canvas_elem = document.getElementsByTagName('canvas')[0];
	
	// Prevent clicking and dragging from selecting the GUI text.
	canvas_elem.addEventListener('mousedown', (event) => { event.preventDefault(); });

	// Set the canvas size to the desired video size
	canvas_elem.width = 1920;
	canvas_elem.height = 1080;

	/*---------------------------------------------------------------
		Resource loading
	---------------------------------------------------------------*/

	/*
	The textures fail to load when the site is opened from local file (file://) due to "cross-origin".
	Solutions:
	* run a local webserver
		python -m http.server 8000
		# open localhost:8000
	OR
	* run chromium with CLI flag
		"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files index.html

	* edit config in firefox
		security.fileuri.strict_origin_policy = false
	*/

	// Start downloads in parallel
	const resources = {
		'mesh_ring_gate': icg_mesh_load_obj(regl, './meshes/ring_gate.obj'),
	};

	[
		"basic_mesh.vert",
		"basic_mesh.frag",
	].forEach((shader_filename) => {
		resources[`shaders/${shader_filename}`] = load_text(`./src/shaders/${shader_filename}`);
	});

	// Wait for all downloads to complete
	for (const key in resources) {
		if (resources.hasOwnProperty(key)) {
			resources[key] = await resources[key]
		}
	}


	/*---------------------------------------------------------------
		Setup
	---------------------------------------------------------------*/
	
	const {draw_scene, camera_matrix_by_time} = init_scene(regl, resources);

	const video = new CanvasVideoRecording({
		canvas: canvas_elem,
		
		// tweak that if the quality is bad https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder
		videoBitsPerSecond: 15*1024*1024,
	});

	/*---------------------------------------------------------------
		UI
	---------------------------------------------------------------*/

	register_keyboard_action('z', () => {
		debug_overlay.classList.toggle('hide');
	})

	function video_start_stop() {
		if(video.is_recording()) {
			video.stop();
		} else {
			video.start();
		}
	};

	register_keyboard_action('r', video_start_stop);


	/*---------------------------------------------------------------
		Frame render
	---------------------------------------------------------------*/
	const mat_projection = mat4.create();
	const mat_view = mat4.create();

	regl.frame((frame) => {
		const frame_idx = frame.tick;
		
		// prepare transforms
		mat4.perspective(mat_projection,
			deg_to_rad * 60, // fov y
			frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
			0.002, // near
			100, // far
		);
		camera_matrix_by_time(mat_view, frame_idx);
			
		// draw scene
		regl.clear({color: [0.1, 0.05, 0.4, 1]});
		draw_scene({mat_view, mat_projection});

		// push video frame 
		if(video.is_recording()) {
			video.push_frame();
			debug_text.textContent = `Recording in progress: ${video.num_frames} frames`;
		} else {
			debug_text.textContent = '';
		}
	});
}

DOM_loaded_promise.then(main);
