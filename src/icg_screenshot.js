"use strict";

function framebuffer_to_image_download(regl, buffer, name) {
	const image_array = regl.read({
		framebuffer: buffer,
	});

	name = name || 'screenshot.png';
	
	const {width, height} = buffer;

	const canvas_encoder = document.createElement('canvas');
	canvas_encoder.width = width;
	canvas_encoder.height = height;
	const canvas_encoder_context = canvas_encoder.getContext('2d');
	
	// float -> uint so multiply 255
	let scale = 255;

	// but perhaps we already get uints
	if (image_array instanceof Uint8Array) {
		scale = 1;
	}

	const image_array_uint8 = new Uint8ClampedArray(image_array.length);

	// convert the image to uint8 
	// + flip vertically (otherwise images come out flipped, I don't know why)
	for(let row = 0; row < height; row++) {
		const row_start_src = row*width*4;
		const row_start_dest = (height-row-1)*width*4;

		for(let col = 0; col < width*4; col++) {
			image_array_uint8[row_start_dest + col] = scale * image_array[row_start_src + col];
		}
	}

	// Copy the pixels to a 2D canvas
	const image_data = canvas_encoder_context.createImageData(width, height);
	image_data.data.set(image_array_uint8);
	canvas_encoder_context.putImageData(image_data, 0, 0);
	
	canvas_encoder.toBlob((img_data_encoded) => {
		const a = document.createElement('a');
		a.textContent = 'download';
		//document.body.appendChild(a);
		a.download = name;
		a.href = window.URL.createObjectURL(img_data_encoded);
		a.click();
	});
}



/*
Recording video from a <canvas> using MediaRecorder
	https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

	https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
*/
class CanvasVideoRecording {

	constructor({canvas, videoBitsPerSecond} = {videoBitsPerSecond: 10*1024*1024}) {
		/*
		https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
		frameRate: 
			If not set, a new frame will be captured each time the canvas changes; 
			if set to 0, frames will not be captured automatically; 
			instead, they will only be captured when the returned track's requestFrame() method is called.
		*/

		const video_format = "video/webm";

		this.num_frames = 0;
		this.video_data_fragments = [];

		this.stream = canvas.captureStream(0);

		this.recorder = new MediaRecorder(this.stream, {
			mimeType: video_format,
			videoBitsPerSecond: videoBitsPerSecond,
		});

		this.recorder.ondataavailable = (e) => {
			this.video_data_fragments.push(e.data);
		}

		this.recorder.onerror = (e) => {
			console.warn('Recording error', e);
		}
		
		this.recorder.onstop = (e) => {
			this.finish_recording();
		}
	}

	start() {
		this.num_frames = 0;
		this.video_data_fragments.splice();
		this.recorder.start();
		console.log("recorder started", this.recorder.state);
	}

	push_frame() {
		if(this.is_recording()) {
			this.stream.requestFrame();
			this.num_frames += 1;
		}
	}

	is_recording() {
		return this.recorder.state === 'recording';
	}

	stop() {
		this.recorder.requestData();
		this.recorder.stop();
	}

	compose_video() {
		const fragments = this.video_data_fragments;
		const video_data_blob = new Blob(fragments, { type: fragments[0].type });
		fragments.splice();

		const video_data_url = URL.createObjectURL(video_data_blob);

		console.log('Video completed, size =', video_data_blob.length)

		//console.log('Video blob=', blob, 'url = ', video_file_urlencoded, 'len', video_file_urlencoded.length);

		this.video_data_blob = video_data_blob;
		this.video_data_url = video_data_url;
	}

	finish_recording() {
		this.compose_video();
		this.create_video_ui();
	}

	create_video_ui() {
		const elem_box = document.getElementById('video-container') || document.getElementById('debug-overlay');

		const elem_video = document.createElement('video');
		elem_box.appendChild(elem_video);

		elem_video.src = this.video_data_url;
		elem_video.width = 320;
		elem_video.controls = true;
	}
}
