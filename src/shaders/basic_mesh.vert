
// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 position;
attribute vec3 normal;

// Per-vertex outputs passed on to the fragment shader
// varying vec3 v2f_normal;
varying vec3 v2f_color;

// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_mvp;

void main() {
	// v2f_tex_coord = tex_coord;
	//v2f_normal = normal;

	float b = 0.5 + 0.5 * dot(normal, vec3(1., 0., 0.));
	v2f_color = vec3(b, b, b);

	gl_Position = mat_mvp * vec4(position, 1);
}
