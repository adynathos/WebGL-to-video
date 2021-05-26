import {vec2, vec3, vec4, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {mat4_matmul_many} from "./icg_math.js"

export function init_scene(regl, resources) {

	const ring_mesh = resources['mesh_ring_gate'];

	const pipe_ring = regl({
		attributes: {
			position: ring_mesh.vertex_positions,
			normal: ring_mesh.vertex_normals,
		},

		elements: ring_mesh.faces,

		uniforms: {
			mat_mvp: regl.prop('mat_mvp'),
		},	

		vert: resources['shaders/basic_mesh.vert'],
		frag: resources['shaders/basic_mesh.frag'],
	});


	const n_rings = 8;
	const m_rx = mat4.fromXRotation(mat4.create(), Math.PI*0.5);
	const m_rad = mat4.fromTranslation(mat4.create(), [3, 0, 0]);
	const m_sc = mat4.fromScaling(mat4.create(), [0.6, 0.6, 0.6]);

	const m_orb = mat4_matmul_many(mat4.create(), m_rad, m_rx, m_sc);

	const mats_mesh_to_world = [...new Array(n_rings).keys()].map((idx) => {
		const m_r = mat4.fromZRotation(mat4.create(), 2.*Math.PI*idx / n_rings);
		return mat4_matmul_many(mat4.create(), m_r, m_orb);
	});

	function draw_scene({mat_view, mat_projection}) {
		const mat_vp = mat4_matmul_many(mat4.create(), mat_projection, mat_view);

		const batch_draw_calls = mats_mesh_to_world.map((mat_mesh_to_world) => {
			return { 
				mat_mvp: mat4_matmul_many(mat4.create(), mat_vp, mat_mesh_to_world),
			}
		});

		pipe_ring(batch_draw_calls);
	}


	const M_look_forward_X = mat4.lookAt(mat4.create(),
		[-1., 0, 0], // camera position in world coord
		[0, 0, 0], // view target point
		[0, 0, 1], // up vector
	);

	const m_r90 = mat4.fromZRotation(mat4.create(), Math.PI*0.5);

	function camera_matrix_by_time(mat_world_to_cam, frame_index) {

		const cam_angle_spin = frame_index * 0.002 * 2 * Math.PI;
		const cam_angle_z = -frame_index * 0.0035 * 2 * Math.PI;

		const M_rot_spin = mat4.fromZRotation(mat4.create(), cam_angle_spin);
		const M_rot_z = mat4.fromZRotation(mat4.create(), cam_angle_z);

		mat4_matmul_many(mat_world_to_cam, M_rot_spin, M_look_forward_X, m_r90, m_rad, M_rot_z);	
	}

	return {draw_scene, camera_matrix_by_time};
}

