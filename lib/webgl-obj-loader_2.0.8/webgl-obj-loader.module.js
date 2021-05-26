

export const version = "2.0.3";
// const OBJ = {
// 	Attribute: _layout__WEBPACK_IMPORTED_MODULE_2__["Attribute"],
// 	DuplicateAttributeException: _layout__WEBPACK_IMPORTED_MODULE_2__["DuplicateAttributeException"],
// 	Layout: _layout__WEBPACK_IMPORTED_MODULE_2__["Layout"],
// 	Material: _material__WEBPACK_IMPORTED_MODULE_1__["Material"],
// 	MaterialLibrary: _material__WEBPACK_IMPORTED_MODULE_1__["MaterialLibrary"],
// 	Mesh: _mesh__WEBPACK_IMPORTED_MODULE_0__["default"],
// 	TYPES: _layout__WEBPACK_IMPORTED_MODULE_2__["TYPES"],
// 	downloadModels: _utils__WEBPACK_IMPORTED_MODULE_3__["downloadModels"],
// 	downloadMeshes: _utils__WEBPACK_IMPORTED_MODULE_3__["downloadMeshes"],
// 	initMeshBuffers: _utils__WEBPACK_IMPORTED_MODULE_3__["initMeshBuffers"],
// 	deleteMeshBuffers: _utils__WEBPACK_IMPORTED_MODULE_3__["deleteMeshBuffers"],
// 	version,
// };
/**
 * @namespace
 */


export const TYPES = {
	"BYTE": "BYTE",
	"UNSIGNED_BYTE": "UNSIGNED_BYTE",
	"SHORT": "SHORT",
	"UNSIGNED_SHORT": "UNSIGNED_SHORT",
	"FLOAT": "FLOAT",
};

/**
 * An exception for when two or more of the same attributes are found in the
 * same layout.
 * @private
 */
export class DuplicateAttributeException extends Error {
	/**
	 * Create a DuplicateAttributeException
	 * @param {Attribute} attribute - The attribute that was found more than
	 *        once in the {@link Layout}
	 */
	constructor(attribute) {
		super(`found duplicate attribute: ${attribute.key}`);
	}
}
/**
 * Represents how a vertex attribute should be packed into an buffer.
 * @private
 */
export class Attribute {
	/**
	 * Create an attribute. Do not call this directly, use the predefined
	 * constants.
	 * @param {string} key - The name of this attribute as if it were a key in
	 *        an Object. Use the camel case version of the upper snake case
	 *        const name.
	 * @param {number} size - The number of components per vertex attribute.
	 *        Must be 1, 2, 3, or 4.
	 * @param {string} type - The data type of each component for this
	 *        attribute. Possible values:<br/>
	 *        "BYTE": signed 8-bit integer, with values in [-128, 127]<br/>
	 *        "SHORT": signed 16-bit integer, with values in
	 *            [-32768, 32767]<br/>
	 *        "UNSIGNED_BYTE": unsigned 8-bit integer, with values in
	 *            [0, 255]<br/>
	 *        "UNSIGNED_SHORT": unsigned 16-bit integer, with values in
	 *            [0, 65535]<br/>
	 *        "FLOAT": 32-bit floating point number
	 * @param {boolean} normalized - Whether integer data values should be
	 *        normalized when being casted to a float.<br/>
	 *        If true, signed integers are normalized to [-1, 1].<br/>
	 *        If true, unsigned integers are normalized to [0, 1].<br/>
	 *        For type "FLOAT", this parameter has no effect.
	 */
	constructor(key, size, type, normalized = false) {
		this.key = key;
		this.size = size;
		this.type = type;
		this.normalized = normalized;
		switch (type) {
			case "BYTE":
			case "UNSIGNED_BYTE":
				this.sizeOfType = 1;
				break;
			case "SHORT":
			case "UNSIGNED_SHORT":
				this.sizeOfType = 2;
				break;
			case "FLOAT":
				this.sizeOfType = 4;
				break;
			default:
				throw new Error(`Unknown gl type: ${type}`);
		}
		this.sizeInBytes = this.sizeOfType * size;
	}
}
/**
 * A class to represent the memory layout for a vertex attribute array. Used by
 * {@link Mesh}'s TBD(...) method to generate a packed array from mesh data.
 * <p>
 * Layout can sort of be thought of as a C-style struct declaration.
 * {@link Mesh}'s TBD(...) method will use the {@link Layout} instance to
 * pack an array in the given attribute order.
 * <p>
 * Layout also is very helpful when calling a WebGL context's
 * <code>vertexAttribPointer</code> method. If you've created a buffer using
 * a Layout instance, then the same Layout instance can be used to determine
 * the size, type, normalized, stride, and offset parameters for
 * <code>vertexAttribPointer</code>.
 * <p>
 * For example:
 * <pre><code>
 *
 * const index = glctx.getAttribLocation(shaderProgram, "pos");
 * glctx.vertexAttribPointer(
 *   layout.position.size,
 *   glctx[layout.position.type],
 *   layout.position.normalized,
 *   layout.position.stride,
 *   layout.position.offset);
 * </code></pre>
 * @see {@link Mesh}
 */
export class Layout {
	/**
	 * Create a Layout object. This constructor will throw if any duplicate
	 * attributes are given.
	 * @param {Array} ...attributes - An ordered list of attributes that
	 *        describe the desired memory layout for each vertex attribute.
	 *        <p>
	 *
	 * @see {@link Mesh}
	 */
	constructor(...attributes) {
		this.attributes = attributes;
		this.attributeMap = {};
		let offset = 0;
		let maxStrideMultiple = 0;
		for (const attribute of attributes) {
			if (this.attributeMap[attribute.key]) {
				throw new DuplicateAttributeException(attribute);
			}
			// Add padding to satisfy WebGL's requirement that all
			// vertexAttribPointer calls have an offset that is a multiple of
			// the type size.
			if (offset % attribute.sizeOfType !== 0) {
				offset += attribute.sizeOfType - (offset % attribute.sizeOfType);
				console.warn("Layout requires padding before " + attribute.key + " attribute");
			}
			this.attributeMap[attribute.key] = {
				attribute: attribute,
				size: attribute.size,
				type: attribute.type,
				normalized: attribute.normalized,
				offset: offset,
			};
			offset += attribute.sizeInBytes;
			maxStrideMultiple = Math.max(maxStrideMultiple, attribute.sizeOfType);
		}
		// Add padding to the end to satisfy WebGL's requirement that all
		// vertexAttribPointer calls have a stride that is a multiple of the
		// type size. Because we're putting differently sized attributes into
		// the same buffer, it must be padded to a multiple of the largest
		// type size.
		if (offset % maxStrideMultiple !== 0) {
			offset += maxStrideMultiple - (offset % maxStrideMultiple);
			console.warn("Layout requires padding at the back");
		}
		this.stride = offset;
		for (const attribute of attributes) {
			this.attributeMap[attribute.key].stride = this.stride;
		}
	}
}
// Geometry attributes
/**
 * Attribute layout to pack a vertex's x, y, & z as floats
 *
 * @see {@link Layout}
 */
Layout.POSITION = new Attribute("position", 3, TYPES.FLOAT);
/**
 * Attribute layout to pack a vertex's normal's x, y, & z as floats
 *
 * @see {@link Layout}
 */
Layout.NORMAL = new Attribute("normal", 3, TYPES.FLOAT);
/**
 * Attribute layout to pack a vertex's normal's x, y, & z as floats.
 * <p>
 * This value will be computed on-the-fly based on the texture coordinates.
 * If no texture coordinates are available, the generated value will default to
 * 0, 0, 0.
 *
 * @see {@link Layout}
 */
Layout.TANGENT = new Attribute("tangent", 3, TYPES.FLOAT);
/**
 * Attribute layout to pack a vertex's normal's bitangent x, y, & z as floats.
 * <p>
 * This value will be computed on-the-fly based on the texture coordinates.
 * If no texture coordinates are available, the generated value will default to
 * 0, 0, 0.
 * @see {@link Layout}
 */
Layout.BITANGENT = new Attribute("bitangent", 3, TYPES.FLOAT);
/**
 * Attribute layout to pack a vertex's texture coordinates' u & v as floats
 *
 * @see {@link Layout}
 */
Layout.UV = new Attribute("uv", 2, TYPES.FLOAT);
// Material attributes
/**
 * Attribute layout to pack an unsigned short to be interpreted as a the index
 * into a {@link Mesh}'s materials list.
 * <p>
 * The intention of this value is to send all of the {@link Mesh}'s materials
 * into multiple shader uniforms and then reference the current one by this
 * vertex attribute.
 * <p>
 * example glsl code:
 *
 * <pre><code>
 *  // this is bound using MATERIAL_INDEX
 *  attribute int materialIndex;
 *
 *  struct Material {
 *    vec3 diffuse;
 *    vec3 specular;
 *    vec3 specularExponent;
 *  };
 *
 *  uniform Material materials[MAX_MATERIALS];
 *
 *  // ...
 *
 *  vec3 diffuse = materials[materialIndex];
 *
 * </code></pre>
 * TODO: More description & test to make sure subscripting by attributes even
 * works for webgl
 *
 * @see {@link Layout}
 */
Layout.MATERIAL_INDEX = new Attribute("materialIndex", 1, TYPES.SHORT);
Layout.MATERIAL_ENABLED = new Attribute("materialEnabled", 1, TYPES.UNSIGNED_SHORT);
Layout.AMBIENT = new Attribute("ambient", 3, TYPES.FLOAT);
Layout.DIFFUSE = new Attribute("diffuse", 3, TYPES.FLOAT);
Layout.SPECULAR = new Attribute("specular", 3, TYPES.FLOAT);
Layout.SPECULAR_EXPONENT = new Attribute("specularExponent", 3, TYPES.FLOAT);
Layout.EMISSIVE = new Attribute("emissive", 3, TYPES.FLOAT);
Layout.TRANSMISSION_FILTER = new Attribute("transmissionFilter", 3, TYPES.FLOAT);
Layout.DISSOLVE = new Attribute("dissolve", 1, TYPES.FLOAT);
Layout.ILLUMINATION = new Attribute("illumination", 1, TYPES.UNSIGNED_SHORT);
Layout.REFRACTION_INDEX = new Attribute("refractionIndex", 1, TYPES.FLOAT);
Layout.SHARPNESS = new Attribute("sharpness", 1, TYPES.FLOAT);
Layout.MAP_DIFFUSE = new Attribute("mapDiffuse", 1, TYPES.SHORT);
Layout.MAP_AMBIENT = new Attribute("mapAmbient", 1, TYPES.SHORT);
Layout.MAP_SPECULAR = new Attribute("mapSpecular", 1, TYPES.SHORT);
Layout.MAP_SPECULAR_EXPONENT = new Attribute("mapSpecularExponent", 1, TYPES.SHORT);
Layout.MAP_DISSOLVE = new Attribute("mapDissolve", 1, TYPES.SHORT);
Layout.ANTI_ALIASING = new Attribute("antiAliasing", 1, TYPES.UNSIGNED_SHORT);
Layout.MAP_BUMP = new Attribute("mapBump", 1, TYPES.SHORT);
Layout.MAP_DISPLACEMENT = new Attribute("mapDisplacement", 1, TYPES.SHORT);
Layout.MAP_DECAL = new Attribute("mapDecal", 1, TYPES.SHORT);
Layout.MAP_EMISSIVE = new Attribute("mapEmissive", 1, TYPES.SHORT);


/**
 * The Material class.
 */
export class Material {
	constructor(name) {
		this.name = name;
		/**
		 * Constructor
		 * @param {String} name the unique name of the material
		 */
		// The values for the following attibutes
		// are an array of R, G, B normalized values.
		// Ka - Ambient Reflectivity
		this.ambient = [0, 0, 0];
		// Kd - Defuse Reflectivity
		this.diffuse = [0, 0, 0];
		// Ks
		this.specular = [0, 0, 0];
		// Ke
		this.emissive = [0, 0, 0];
		// Tf
		this.transmissionFilter = [0, 0, 0];
		// d
		this.dissolve = 0;
		// valid range is between 0 and 1000
		this.specularExponent = 0;
		// either d or Tr; valid values are normalized
		this.transparency = 0;
		// illum - the enum of the illumination model to use
		this.illumination = 0;
		// Ni - Set to "normal" (air).
		this.refractionIndex = 1;
		// sharpness
		this.sharpness = 0;
		// map_Kd
		this.mapDiffuse = emptyTextureOptions();
		// map_Ka
		this.mapAmbient = emptyTextureOptions();
		// map_Ks
		this.mapSpecular = emptyTextureOptions();
		// map_Ns
		this.mapSpecularExponent = emptyTextureOptions();
		// map_d
		this.mapDissolve = emptyTextureOptions();
		// map_aat
		this.antiAliasing = false;
		// map_bump or bump
		this.mapBump = emptyTextureOptions();
		// disp
		this.mapDisplacement = emptyTextureOptions();
		// decal
		this.mapDecal = emptyTextureOptions();
		// map_Ke
		this.mapEmissive = emptyTextureOptions();
		// refl - when the reflection type is a cube, there will be multiple refl
		//        statements for each side of the cube. If it's a spherical
		//        reflection, there should only ever be one.
		this.mapReflections = [];
	}
}
const SENTINEL_MATERIAL = new Material("sentinel");
/**
 * https://en.wikipedia.org/wiki/Wavefront_.obj_file
 * http://paulbourke.net/dataformats/mtl/
 */
export class MaterialLibrary {
	constructor(data) {
		this.data = data;
		/**
		 * Constructs the Material Parser
		 * @param mtlData the MTL file contents
		 */
		this.currentMaterial = SENTINEL_MATERIAL;
		this.materials = {};
		this.parse();
	}
	/* eslint-disable camelcase */
	/* the function names here disobey camelCase conventions
	 to make parsing/routing easier. see the parse function
	 documentation for more information. */
	/**
	 * Creates a new Material object and adds to the registry.
	 * @param tokens the tokens associated with the directive
	 */
	parse_newmtl(tokens) {
		const name = tokens[0];
		// console.info('Parsing new Material:', name);
		this.currentMaterial = new Material(name);
		this.materials[name] = this.currentMaterial;
	}
	/**
	 * See the documenation for parse_Ka below for a better understanding.
	 *
	 * Given a list of possible color tokens, returns an array of R, G, and B
	 * color values.
	 *
	 * @param tokens the tokens associated with the directive
	 * @return {*} a 3 element array containing the R, G, and B values
	 * of the color.
	 */
	parseColor(tokens) {
		if (tokens[0] == "spectral") {
			throw new Error("The MTL parser does not support spectral curve files. You will " +
				"need to convert the MTL colors to either RGB or CIEXYZ.");
		}
		if (tokens[0] == "xyz") {
			throw new Error("The MTL parser does not currently support XYZ colors. Either convert the " +
				"XYZ values to RGB or create an issue to add support for XYZ");
		}
		// from my understanding of the spec, RGB values at this point
		// will either be 3 floats or exactly 1 float, so that's the check
		// that i'm going to perform here
		if (tokens.length == 3) {
			const [x, y, z] = tokens;
			return [parseFloat(x), parseFloat(y), parseFloat(z)];
		}
		// Since tokens at this point has a length of 3, we're going to assume
		// it's exactly 1, skipping the check for 2.
		const value = parseFloat(tokens[0]);
		// in this case, all values are equivalent
		return [value, value, value];
	}
	/**
	 * Parse the ambient reflectivity
	 *
	 * A Ka directive can take one of three forms:
	 *   - Ka r g b
	 *   - Ka spectral file.rfl
	 *   - Ka xyz x y z
	 * These three forms are mutually exclusive in that only one
	 * declaration can exist per material. It is considered a syntax
	 * error otherwise.
	 *
	 * The "Ka" form specifies the ambient reflectivity using RGB values.
	 * The "g" and "b" values are optional. If only the "r" value is
	 * specified, then the "g" and "b" values are assigned the value of
	 * "r". Values are normally in the range 0.0 to 1.0. Values outside
	 * of this range increase or decrease the reflectivity accordingly.
	 *
	 * The "Ka spectral" form specifies the ambient reflectivity using a
	 * spectral curve. "file.rfl" is the name of the ".rfl" file containing
	 * the curve data. "factor" is an optional argument which is a multiplier
	 * for the values in the .rfl file and defaults to 1.0 if not specified.
	 *
	 * The "Ka xyz" form specifies the ambient reflectivity using CIEXYZ values.
	 * "x y z" are the values of the CIEXYZ color space. The "y" and "z" arguments
	 * are optional and take on the value of the "x" component if only "x" is
	 * specified. The "x y z" values are normally in the range of 0.0 to 1.0 and
	 * increase or decrease ambient reflectivity accordingly outside of that
	 * range.
	 *
	 * @param tokens the tokens associated with the directive
	 */
	parse_Ka(tokens) {
		this.currentMaterial.ambient = this.parseColor(tokens);
	}
	/**
	 * Diffuse Reflectivity
	 *
	 * Similar to the Ka directive. Simply replace "Ka" with "Kd" and the rules
	 * are the same
	 *
	 * @param tokens the tokens associated with the directive
	 */
	parse_Kd(tokens) {
		this.currentMaterial.diffuse = this.parseColor(tokens);
	}
	/**
	 * Spectral Reflectivity
	 *
	 * Similar to the Ka directive. Simply replace "Ks" with "Kd" and the rules
	 * are the same
	 *
	 * @param tokens the tokens associated with the directive
	 */
	parse_Ks(tokens) {
		this.currentMaterial.specular = this.parseColor(tokens);
	}
	/**
	 * Emissive
	 *
	 * The amount and color of light emitted by the object.
	 *
	 * @param tokens the tokens associated with the directive
	 */
	parse_Ke(tokens) {
		this.currentMaterial.emissive = this.parseColor(tokens);
	}
	/**
	 * Transmission Filter
	 *
	 * Any light passing through the object is filtered by the transmission
	 * filter, which only allows specific colors to pass through. For example, Tf
	 * 0 1 0 allows all of the green to pass through and filters out all of the
	 * red and blue.
	 *
	 * Similar to the Ka directive. Simply replace "Ks" with "Tf" and the rules
	 * are the same
	 *
	 * @param tokens the tokens associated with the directive
	 */
	parse_Tf(tokens) {
		this.currentMaterial.transmissionFilter = this.parseColor(tokens);
	}
	/**
	 * Specifies the dissolve for the current material.
	 *
	 * Statement: d [-halo] `factor`
	 *
	 * Example: "d 0.5"
	 *
	 * The factor is the amount this material dissolves into the background. A
	 * factor of 1.0 is fully opaque. This is the default when a new material is
	 * created. A factor of 0.0 is fully dissolved (completely transparent).
	 *
	 * Unlike a real transparent material, the dissolve does not depend upon
	 * material thickness nor does it have any spectral character. Dissolve works
	 * on all illumination models.
	 *
	 * The dissolve statement allows for an optional "-halo" flag which indicates
	 * that a dissolve is dependent on the surface orientation relative to the
	 * viewer. For example, a sphere with the following dissolve, "d -halo 0.0",
	 * will be fully dissolved at its center and will appear gradually more opaque
	 * toward its edge.
	 *
	 * "factor" is the minimum amount of dissolve applied to the material. The
	 * amount of dissolve will vary between 1.0 (fully opaque) and the specified
	 * "factor". The formula is:
	 *
	 *    dissolve = 1.0 - (N*v)(1.0-factor)
	 *
	 * @param tokens the tokens associated with the directive
	 */
	parse_d(tokens) {
		// this ignores the -halo option as I can't find any documentation on what
		// it's supposed to be.
		this.currentMaterial.dissolve = parseFloat(tokens.pop() || "0");
	}
	/**
	 * The "illum" statement specifies the illumination model to use in the
	 * material. Illumination models are mathematical equations that represent
	 * various material lighting and shading effects.
	 *
	 * The illumination number can be a number from 0 to 10. The following are
	 * the list of illumination enumerations and their summaries:
	 * 0. Color on and Ambient off
	 * 1. Color on and Ambient on
	 * 2. Highlight on
	 * 3. Reflection on and Ray trace on
	 * 4. Transparency: Glass on, Reflection: Ray trace on
	 * 5. Reflection: Fresnel on and Ray trace on
	 * 6. Transparency: Refraction on, Reflection: Fresnel off and Ray trace on
	 * 7. Transparency: Refraction on, Reflection: Fresnel on and Ray trace on
	 * 8. Reflection on and Ray trace off
	 * 9. Transparency: Glass on, Reflection: Ray trace off
	 * 10. Casts shadows onto invisible surfaces
	 *
	 * Example: "illum 2" to specify the "Highlight on" model
	 *
	 * @param tokens the tokens associated with the directive
	 */
	parse_illum(tokens) {
		this.currentMaterial.illumination = parseInt(tokens[0]);
	}
	/**
	 * Optical Density (AKA Index of Refraction)
	 *
	 * Statement: Ni `index`
	 *
	 * Example: Ni 1.0
	 *
	 * Specifies the optical density for the surface. `index` is the value
	 * for the optical density. The values can range from 0.001 to 10.  A value of
	 * 1.0 means that light does not bend as it passes through an object.
	 * Increasing the optical_density increases the amount of bending. Glass has
	 * an index of refraction of about 1.5. Values of less than 1.0 produce
	 * bizarre results and are not recommended
	 *
	 * @param tokens the tokens associated with the directive
	 */
	parse_Ni(tokens) {
		this.currentMaterial.refractionIndex = parseFloat(tokens[0]);
	}
	/**
	 * Specifies the specular exponent for the current material. This defines the
	 * focus of the specular highlight.
	 *
	 * Statement: Ns `exponent`
	 *
	 * Example: "Ns 250"
	 *
	 * `exponent` is the value for the specular exponent. A high exponent results
	 * in a tight, concentrated highlight. Ns Values normally range from 0 to
	 * 1000.
	 *
	 * @param tokens the tokens associated with the directive
	 */
	parse_Ns(tokens) {
		this.currentMaterial.specularExponent = parseInt(tokens[0]);
	}
	/**
	 * Specifies the sharpness of the reflections from the local reflection map.
	 *
	 * Statement: sharpness `value`
	 *
	 * Example: "sharpness 100"
	 *
	 * If a material does not have a local reflection map defined in its material
	 * defintions, sharpness will apply to the global reflection map defined in
	 * PreView.
	 *
	 * `value` can be a number from 0 to 1000. The default is 60. A high value
	 * results in a clear reflection of objects in the reflection map.
	 *
	 * Tip: sharpness values greater than 100 introduce aliasing effects in
	 * flat surfaces that are viewed at a sharp angle.
	 *
	 * @param tokens the tokens associated with the directive
	 */
	parse_sharpness(tokens) {
		this.currentMaterial.sharpness = parseInt(tokens[0]);
	}
	/**
	 * Parses the -cc flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -cc flag
	 * @param options the Object of all image options
	 */
	parse_cc(values, options) {
		options.colorCorrection = values[0] == "on";
	}
	/**
	 * Parses the -blendu flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -blendu flag
	 * @param options the Object of all image options
	 */
	parse_blendu(values, options) {
		options.horizontalBlending = values[0] == "on";
	}
	/**
	 * Parses the -blendv flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -blendv flag
	 * @param options the Object of all image options
	 */
	parse_blendv(values, options) {
		options.verticalBlending = values[0] == "on";
	}
	/**
	 * Parses the -boost flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -boost flag
	 * @param options the Object of all image options
	 */
	parse_boost(values, options) {
		options.boostMipMapSharpness = parseFloat(values[0]);
	}
	/**
	 * Parses the -mm flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -mm flag
	 * @param options the Object of all image options
	 */
	parse_mm(values, options) {
		options.modifyTextureMap.brightness = parseFloat(values[0]);
		options.modifyTextureMap.contrast = parseFloat(values[1]);
	}
	/**
	 * Parses and sets the -o, -s, and -t  u, v, and w values
	 *
	 * @param values the values passed to the -o, -s, -t flag
	 * @param {Object} option the Object of either the -o, -s, -t option
	 * @param {Integer} defaultValue the Object of all image options
	 */
	parse_ost(values, option, defaultValue) {
		while (values.length < 3) {
			values.push(defaultValue.toString());
		}
		option.u = parseFloat(values[0]);
		option.v = parseFloat(values[1]);
		option.w = parseFloat(values[2]);
	}
	/**
	 * Parses the -o flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -o flag
	 * @param options the Object of all image options
	 */
	parse_o(values, options) {
		this.parse_ost(values, options.offset, 0);
	}
	/**
	 * Parses the -s flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -s flag
	 * @param options the Object of all image options
	 */
	parse_s(values, options) {
		this.parse_ost(values, options.scale, 1);
	}
	/**
	 * Parses the -t flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -t flag
	 * @param options the Object of all image options
	 */
	parse_t(values, options) {
		this.parse_ost(values, options.turbulence, 0);
	}
	/**
	 * Parses the -texres flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -texres flag
	 * @param options the Object of all image options
	 */
	parse_texres(values, options) {
		options.textureResolution = parseFloat(values[0]);
	}
	/**
	 * Parses the -clamp flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -clamp flag
	 * @param options the Object of all image options
	 */
	parse_clamp(values, options) {
		options.clamp = values[0] == "on";
	}
	/**
	 * Parses the -bm flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -bm flag
	 * @param options the Object of all image options
	 */
	parse_bm(values, options) {
		options.bumpMultiplier = parseFloat(values[0]);
	}
	/**
	 * Parses the -imfchan flag and updates the options object with the values.
	 *
	 * @param values the values passed to the -imfchan flag
	 * @param options the Object of all image options
	 */
	parse_imfchan(values, options) {
		options.imfChan = values[0];
	}
	/**
	 * This only exists for relection maps and denotes the type of reflection.
	 *
	 * @param values the values passed to the -type flag
	 * @param options the Object of all image options
	 */
	parse_type(values, options) {
		options.reflectionType = values[0];
	}
	/**
	 * Parses the texture's options and returns an options object with the info
	 *
	 * @param tokens all of the option tokens to pass to the texture
	 * @return {Object} a complete object of objects to apply to the texture
	 */
	parseOptions(tokens) {
		const options = emptyTextureOptions();
		let option;
		let values;
		const optionsToValues = {};
		tokens.reverse();
		while (tokens.length) {
			// token is guaranteed to exists here, hence the explicit "as"
			const token = tokens.pop();
			if (token.startsWith("-")) {
				option = token.substr(1);
				optionsToValues[option] = [];
			}
			else if (option) {
				optionsToValues[option].push(token);
			}
		}
		for (option in optionsToValues) {
			if (!optionsToValues.hasOwnProperty(option)) {
				continue;
			}
			values = optionsToValues[option];
			const optionMethod = this[`parse_${option}`];
			if (optionMethod) {
				optionMethod.bind(this)(values, options);
			}
		}
		return options;
	}
	/**
	 * Parses the given texture map line.
	 *
	 * @param tokens all of the tokens representing the texture
	 * @return a complete object of objects to apply to the texture
	 */
	parseMap(tokens) {
		// according to wikipedia:
		// (https://en.wikipedia.org/wiki/Wavefront_.obj_file#Vendor_specific_alterations)
		// there is at least one vendor that places the filename before the options
		// rather than after (which is to spec). All options start with a '-'
		// so if the first token doesn't start with a '-', we're going to assume
		// it's the name of the map file.
		let optionsString;
		let filename = "";
		if (!tokens[0].startsWith("-")) {
			[filename, ...optionsString] = tokens;
		}
		else {
			filename = tokens.pop();
			optionsString = tokens;
		}
		const options = this.parseOptions(optionsString);
		options.filename = filename.replace(/\\/g, "/");
		return options;
	}
	/**
	 * Parses the ambient map.
	 *
	 * @param tokens list of tokens for the map_Ka direcive
	 */
	parse_map_Ka(tokens) {
		this.currentMaterial.mapAmbient = this.parseMap(tokens);
	}
	/**
	 * Parses the diffuse map.
	 *
	 * @param tokens list of tokens for the map_Kd direcive
	 */
	parse_map_Kd(tokens) {
		this.currentMaterial.mapDiffuse = this.parseMap(tokens);
	}
	/**
	 * Parses the specular map.
	 *
	 * @param tokens list of tokens for the map_Ks direcive
	 */
	parse_map_Ks(tokens) {
		this.currentMaterial.mapSpecular = this.parseMap(tokens);
	}
	/**
	 * Parses the emissive map.
	 *
	 * @param tokens list of tokens for the map_Ke direcive
	 */
	parse_map_Ke(tokens) {
		this.currentMaterial.mapEmissive = this.parseMap(tokens);
	}
	/**
	 * Parses the specular exponent map.
	 *
	 * @param tokens list of tokens for the map_Ns direcive
	 */
	parse_map_Ns(tokens) {
		this.currentMaterial.mapSpecularExponent = this.parseMap(tokens);
	}
	/**
	 * Parses the dissolve map.
	 *
	 * @param tokens list of tokens for the map_d direcive
	 */
	parse_map_d(tokens) {
		this.currentMaterial.mapDissolve = this.parseMap(tokens);
	}
	/**
	 * Parses the anti-aliasing option.
	 *
	 * @param tokens list of tokens for the map_aat direcive
	 */
	parse_map_aat(tokens) {
		this.currentMaterial.antiAliasing = tokens[0] == "on";
	}
	/**
	 * Parses the bump map.
	 *
	 * @param tokens list of tokens for the map_bump direcive
	 */
	parse_map_bump(tokens) {
		this.currentMaterial.mapBump = this.parseMap(tokens);
	}
	/**
	 * Parses the bump map.
	 *
	 * @param tokens list of tokens for the bump direcive
	 */
	parse_bump(tokens) {
		this.parse_map_bump(tokens);
	}
	/**
	 * Parses the disp map.
	 *
	 * @param tokens list of tokens for the disp direcive
	 */
	parse_disp(tokens) {
		this.currentMaterial.mapDisplacement = this.parseMap(tokens);
	}
	/**
	 * Parses the decal map.
	 *
	 * @param tokens list of tokens for the map_decal direcive
	 */
	parse_decal(tokens) {
		this.currentMaterial.mapDecal = this.parseMap(tokens);
	}
	/**
	 * Parses the refl map.
	 *
	 * @param tokens list of tokens for the refl direcive
	 */
	parse_refl(tokens) {
		this.currentMaterial.mapReflections.push(this.parseMap(tokens));
	}
	/**
	 * Parses the MTL file.
	 *
	 * Iterates line by line parsing each MTL directive.
	 *
	 * This function expects the first token in the line
	 * to be a valid MTL directive. That token is then used
	 * to try and run a method on this class. parse_[directive]
	 * E.g., the `newmtl` directive would try to call the method
	 * parse_newmtl. Each parsing function takes in the remaining
	 * list of tokens and updates the currentMaterial class with
	 * the attributes provided.
	 */
	parse() {
		const lines = this.data.split(/\r?\n/);
		for (let line of lines) {
			line = line.trim();
			if (!line || line.startsWith("#")) {
				continue;
			}
			const [directive, ...tokens] = line.split(/\s/);
			const parseMethod = this[`parse_${directive}`];
			if (!parseMethod) {
				console.warn(`Don't know how to parse the directive: "${directive}"`);
				continue;
			}
			// console.log(`Parsing "${directive}" with tokens: ${tokens}`);
			parseMethod.bind(this)(tokens);
		}
		// some cleanup. These don't need to be exposed as public data.
		delete this.data;
		this.currentMaterial = SENTINEL_MATERIAL;
	}
}
function emptyTextureOptions() {
	return {
		colorCorrection: false,
		horizontalBlending: true,
		verticalBlending: true,
		boostMipMapSharpness: 0,
		modifyTextureMap: {
			brightness: 0,
			contrast: 1,
		},
		offset: { u: 0, v: 0, w: 0 },
		scale: { u: 1, v: 1, w: 1 },
		turbulence: { u: 0, v: 0, w: 0 },
		clamp: false,
		textureResolution: null,
		bumpMultiplier: 1,
		imfChan: null,
		filename: "",
	};
}

/**
 * The main Mesh class. The constructor will parse through the OBJ file data
 * and collect the vertex, vertex normal, texture, and face information. This
 * information can then be used later on when creating your VBOs. See
 * OBJ.initMeshBuffers for an example of how to use the newly created Mesh
 */
export class Mesh {
	/**
	 * Create a Mesh
	 * @param {String} objectData - a string representation of an OBJ file with
	 *     newlines preserved.
	 * @param {Object} options - a JS object containing valid options. See class
	 *     documentation for options.
	 * @param {bool} options.enableWTextureCoord - Texture coordinates can have
	 *     an optional "w" coordinate after the u and v coordinates. This extra
	 *     value can be used in order to perform fancy transformations on the
	 *     textures themselves. Default is to truncate to only the u an v
	 *     coordinates. Passing true will provide a default value of 0 in the
	 *     event that any or all texture coordinates don't provide a w value.
	 *     Always use the textureStride attribute in order to determine the
	 *     stride length of the texture coordinates when rendering the element
	 *     array.
	 * @param {bool} options.calcTangentsAndBitangents - Calculate the tangents
	 *     and bitangents when loading of the OBJ is completed. This adds two new
	 *     attributes to the Mesh instance: `tangents` and `bitangents`.
	 */
	constructor(objectData, options) {
		this.name = "";
		this.indicesPerMaterial = [];
		this.materialsByIndex = {};
		this.tangents = [];
		this.bitangents = [];
		options = options || {};
		options.materials = options.materials || {};
		options.enableWTextureCoord = !!options.enableWTextureCoord;
		// the list of unique vertex, normal, texture, attributes
		this.vertexNormals = [];
		this.textures = [];
		// the indicies to draw the faces
		this.indices = [];
		this.textureStride = options.enableWTextureCoord ? 3 : 2;
		/*
		The OBJ file format does a sort of compression when saving a model in a
		program like Blender. There are at least 3 sections (4 including textures)
		within the file. Each line in a section begins with the same string:
		  * 'v': indicates vertex section
		  * 'vn': indicates vertex normal section
		  * 'f': indicates the faces section
		  * 'vt': indicates vertex texture section (if textures were used on the model)
		Each of the above sections (except for the faces section) is a list/set of
		unique vertices.

		Each line of the faces section contains a list of
		(vertex, [texture], normal) groups.

		**Note:** The following documentation will use a capital "V" Vertex to
		denote the above (vertex, [texture], normal) groups whereas a lowercase
		"v" vertex is used to denote an X, Y, Z coordinate.

		Some examples:
			// the texture index is optional, both formats are possible for models
			// without a texture applied
			f 1/25 18/46 12/31
			f 1//25 18//46 12//31

			// A 3 vertex face with texture indices
			f 16/92/11 14/101/22 1/69/1

			// A 4 vertex face
			f 16/92/11 40/109/40 38/114/38 14/101/22

		The first two lines are examples of a 3 vertex face without a texture applied.
		The second is an example of a 3 vertex face with a texture applied.
		The third is an example of a 4 vertex face. Note: a face can contain N
		number of vertices.

		Each number that appears in one of the groups is a 1-based index
		corresponding to an item from the other sections (meaning that indexing
		starts at one and *not* zero).

		For example:
			`f 16/92/11` is saying to
			  - take the 16th element from the [v] vertex array
			  - take the 92nd element from the [vt] texture array
			  - take the 11th element from the [vn] normal array
			and together they make a unique vertex.
		Using all 3+ unique Vertices from the face line will produce a polygon.

		Now, you could just go through the OBJ file and create a new vertex for
		each face line and WebGL will draw what appears to be the same model.
		However, vertices will be overlapped and duplicated all over the place.

		Consider a cube in 3D space centered about the origin and each side is
		2 units long. The front face (with the positive Z-axis pointing towards
		you) would have a Top Right vertex (looking orthogonal to its normal)
		mapped at (1,1,1) The right face would have a Top Left vertex (looking
		orthogonal to its normal) at (1,1,1) and the top face would have a Bottom
		Right vertex (looking orthogonal to its normal) at (1,1,1). Each face
		has a vertex at the same coordinates, however, three distinct vertices
		will be drawn at the same spot.

		To solve the issue of duplicate Vertices (the `(vertex, [texture], normal)`
		groups), while iterating through the face lines, when a group is encountered
		the whole group string ('16/92/11') is checked to see if it exists in the
		packed.hashindices object, and if it doesn't, the indices it specifies
		are used to look up each attribute in the corresponding attribute arrays
		already created. The values are then copied to the corresponding unpacked
		array (flattened to play nice with WebGL's ELEMENT_ARRAY_BUFFER indexing),
		the group string is added to the hashindices set and the current unpacked
		index is used as this hashindices value so that the group of elements can
		be reused. The unpacked index is incremented. If the group string already
		exists in the hashindices object, its corresponding value is the index of
		that group and is appended to the unpacked indices array.
	   */
		const verts = [];
		const vertNormals = [];
		const textures = [];
		const materialNamesByIndex = [];
		const materialIndicesByName = {};
		// keep track of what material we've seen last
		let currentMaterialIndex = -1;
		let currentObjectByMaterialIndex = 0;
		// unpacking stuff
		const unpacked = {
			verts: [],
			norms: [],
			textures: [],
			hashindices: {},
			indices: [[]],
			materialIndices: [],
			index: 0,
		};
		const VERTEX_RE = /^v\s/;
		const NORMAL_RE = /^vn\s/;
		const TEXTURE_RE = /^vt\s/;
		const FACE_RE = /^f\s/;
		const WHITESPACE_RE = /\s+/;
		const USE_MATERIAL_RE = /^usemtl/;
		// array of lines separated by the newline
		const lines = objectData.split("\n");
		for (let line of lines) {
			line = line.trim();
			if (!line || line.startsWith("#")) {
				continue;
			}
			const elements = line.split(WHITESPACE_RE);
			elements.shift();
			if (VERTEX_RE.test(line)) {
				// if this is a vertex
				verts.push(...elements);
			}
			else if (NORMAL_RE.test(line)) {
				// if this is a vertex normal
				vertNormals.push(...elements);
			}
			else if (TEXTURE_RE.test(line)) {
				let coords = elements;
				// by default, the loader will only look at the U and V
				// coordinates of the vt declaration. So, this truncates the
				// elements to only those 2 values. If W texture coordinate
				// support is enabled, then the texture coordinate is
				// expected to have three values in it.
				if (elements.length > 2 && !options.enableWTextureCoord) {
					coords = elements.slice(0, 2);
				}
				else if (elements.length === 2 && options.enableWTextureCoord) {
					// If for some reason W texture coordinate support is enabled
					// and only the U and V coordinates are given, then we supply
					// the default value of 0 so that the stride length is correct
					// when the textures are unpacked below.
					coords.push("0");
				}
				textures.push(...coords);
			}
			else if (USE_MATERIAL_RE.test(line)) {
				const materialName = elements[0];
				// check to see if we've ever seen it before
				if (!(materialName in materialIndicesByName)) {
					// new material we've never seen
					materialNamesByIndex.push(materialName);
					materialIndicesByName[materialName] = materialNamesByIndex.length - 1;
					// push new array into indices
					// already contains an array at index zero, don't add
					if (materialIndicesByName[materialName] > 0) {
						unpacked.indices.push([]);
					}
				}
				// keep track of the current material index
				currentMaterialIndex = materialIndicesByName[materialName];
				// update current index array
				currentObjectByMaterialIndex = currentMaterialIndex;
			}
			else if (FACE_RE.test(line)) {
				// if this is a face
				/*
				split this face into an array of Vertex groups
				for example:
				   f 16/92/11 14/101/22 1/69/1
				becomes:
				  ['16/92/11', '14/101/22', '1/69/1'];
				*/
				const triangles = triangulate(elements);
				for (const triangle of triangles) {
					for (let j = 0, eleLen = triangle.length; j < eleLen; j++) {
						const hash = triangle[j] + "," + currentMaterialIndex;
						if (hash in unpacked.hashindices) {
							unpacked.indices[currentObjectByMaterialIndex].push(unpacked.hashindices[hash]);
						}
						else {
							/*
						Each element of the face line array is a Vertex which has its
						attributes delimited by a forward slash. This will separate
						each attribute into another array:
							'19/92/11'
						becomes:
							Vertex = ['19', '92', '11'];
						where
							Vertex[0] is the vertex index
							Vertex[1] is the texture index
							Vertex[2] is the normal index
						 Think of faces having Vertices which are comprised of the
						 attributes location (v), texture (vt), and normal (vn).
						 */
							const vertex = triangle[j].split("/");
							// it's possible for faces to only specify the vertex
							// and the normal. In this case, vertex will only have
							// a length of 2 and not 3 and the normal will be the
							// second item in the list with an index of 1.
							const normalIndex = vertex.length - 1;
							/*
						 The verts, textures, and vertNormals arrays each contain a
						 flattend array of coordinates.

						 Because it gets confusing by referring to Vertex and then
						 vertex (both are different in my descriptions) I will explain
						 what's going on using the vertexNormals array:

						 vertex[2] will contain the one-based index of the vertexNormals
						 section (vn). One is subtracted from this index number to play
						 nice with javascript's zero-based array indexing.

						 Because vertexNormal is a flattened array of x, y, z values,
						 simple pointer arithmetic is used to skip to the start of the
						 vertexNormal, then the offset is added to get the correct
						 component: +0 is x, +1 is y, +2 is z.

						 This same process is repeated for verts and textures.
						 */
							// Vertex position
							unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 0]);
							unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 1]);
							unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 2]);
							// Vertex textures
							if (textures.length) {
								const stride = options.enableWTextureCoord ? 3 : 2;
								unpacked.textures.push(+textures[(+vertex[1] - 1) * stride + 0]);
								unpacked.textures.push(+textures[(+vertex[1] - 1) * stride + 1]);
								if (options.enableWTextureCoord) {
									unpacked.textures.push(+textures[(+vertex[1] - 1) * stride + 2]);
								}
							}
							// Vertex normals
							unpacked.norms.push(+vertNormals[(+vertex[normalIndex] - 1) * 3 + 0]);
							unpacked.norms.push(+vertNormals[(+vertex[normalIndex] - 1) * 3 + 1]);
							unpacked.norms.push(+vertNormals[(+vertex[normalIndex] - 1) * 3 + 2]);
							// Vertex material indices
							unpacked.materialIndices.push(currentMaterialIndex);
							// add the newly created Vertex to the list of indices
							unpacked.hashindices[hash] = unpacked.index;
							unpacked.indices[currentObjectByMaterialIndex].push(unpacked.hashindices[hash]);
							// increment the counter
							unpacked.index += 1;
						}
					}
				}
			}
		}
		this.vertices = unpacked.verts;
		this.vertexNormals = unpacked.norms;
		this.textures = unpacked.textures;
		this.vertexMaterialIndices = unpacked.materialIndices;
		this.indices = unpacked.indices[currentObjectByMaterialIndex];
		this.indicesPerMaterial = unpacked.indices;
		this.materialNames = materialNamesByIndex;
		this.materialIndices = materialIndicesByName;
		this.materialsByIndex = {};
		if (options.calcTangentsAndBitangents) {
			this.calculateTangentsAndBitangents();
		}
	}
	/**
	 * Calculates the tangents and bitangents of the mesh that forms an orthogonal basis together with the
	 * normal in the direction of the texture coordinates. These are useful for setting up the TBN matrix
	 * when distorting the normals through normal maps.
	 * Method derived from: http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-13-normal-mapping/
	 *
	 * This method requires the normals and texture coordinates to be parsed and set up correctly.
	 * Adds the tangents and bitangents as members of the class instance.
	 */
	calculateTangentsAndBitangents() {
		console.assert(!!(this.vertices &&
			this.vertices.length &&
			this.vertexNormals &&
			this.vertexNormals.length &&
			this.textures &&
			this.textures.length), "Missing attributes for calculating tangents and bitangents");
		const unpacked = {
			tangents: [...new Array(this.vertices.length)].map(_ => 0),
			bitangents: [...new Array(this.vertices.length)].map(_ => 0),
		};
		// Loop through all faces in the whole mesh
		const indices = this.indices;
		const vertices = this.vertices;
		const normals = this.vertexNormals;
		const uvs = this.textures;
		for (let i = 0; i < indices.length; i += 3) {
			const i0 = indices[i + 0];
			const i1 = indices[i + 1];
			const i2 = indices[i + 2];
			const x_v0 = vertices[i0 * 3 + 0];
			const y_v0 = vertices[i0 * 3 + 1];
			const z_v0 = vertices[i0 * 3 + 2];
			const x_uv0 = uvs[i0 * 2 + 0];
			const y_uv0 = uvs[i0 * 2 + 1];
			const x_v1 = vertices[i1 * 3 + 0];
			const y_v1 = vertices[i1 * 3 + 1];
			const z_v1 = vertices[i1 * 3 + 2];
			const x_uv1 = uvs[i1 * 2 + 0];
			const y_uv1 = uvs[i1 * 2 + 1];
			const x_v2 = vertices[i2 * 3 + 0];
			const y_v2 = vertices[i2 * 3 + 1];
			const z_v2 = vertices[i2 * 3 + 2];
			const x_uv2 = uvs[i2 * 2 + 0];
			const y_uv2 = uvs[i2 * 2 + 1];
			const x_deltaPos1 = x_v1 - x_v0;
			const y_deltaPos1 = y_v1 - y_v0;
			const z_deltaPos1 = z_v1 - z_v0;
			const x_deltaPos2 = x_v2 - x_v0;
			const y_deltaPos2 = y_v2 - y_v0;
			const z_deltaPos2 = z_v2 - z_v0;
			const x_uvDeltaPos1 = x_uv1 - x_uv0;
			const y_uvDeltaPos1 = y_uv1 - y_uv0;
			const x_uvDeltaPos2 = x_uv2 - x_uv0;
			const y_uvDeltaPos2 = y_uv2 - y_uv0;
			const rInv = x_uvDeltaPos1 * y_uvDeltaPos2 - y_uvDeltaPos1 * x_uvDeltaPos2;
			const r = 1.0 / Math.abs(rInv < 0.0001 ? 1.0 : rInv);
			// Tangent
			const x_tangent = (x_deltaPos1 * y_uvDeltaPos2 - x_deltaPos2 * y_uvDeltaPos1) * r;
			const y_tangent = (y_deltaPos1 * y_uvDeltaPos2 - y_deltaPos2 * y_uvDeltaPos1) * r;
			const z_tangent = (z_deltaPos1 * y_uvDeltaPos2 - z_deltaPos2 * y_uvDeltaPos1) * r;
			// Bitangent
			const x_bitangent = (x_deltaPos2 * x_uvDeltaPos1 - x_deltaPos1 * x_uvDeltaPos2) * r;
			const y_bitangent = (y_deltaPos2 * x_uvDeltaPos1 - y_deltaPos1 * x_uvDeltaPos2) * r;
			const z_bitangent = (z_deltaPos2 * x_uvDeltaPos1 - z_deltaPos1 * x_uvDeltaPos2) * r;
			// Gram-Schmidt orthogonalize
			//t = glm::normalize(t - n * glm:: dot(n, t));
			const x_n0 = normals[i0 * 3 + 0];
			const y_n0 = normals[i0 * 3 + 1];
			const z_n0 = normals[i0 * 3 + 2];
			const x_n1 = normals[i1 * 3 + 0];
			const y_n1 = normals[i1 * 3 + 1];
			const z_n1 = normals[i1 * 3 + 2];
			const x_n2 = normals[i2 * 3 + 0];
			const y_n2 = normals[i2 * 3 + 1];
			const z_n2 = normals[i2 * 3 + 2];
			// Tangent
			const n0_dot_t = x_tangent * x_n0 + y_tangent * y_n0 + z_tangent * z_n0;
			const n1_dot_t = x_tangent * x_n1 + y_tangent * y_n1 + z_tangent * z_n1;
			const n2_dot_t = x_tangent * x_n2 + y_tangent * y_n2 + z_tangent * z_n2;
			const x_resTangent0 = x_tangent - x_n0 * n0_dot_t;
			const y_resTangent0 = y_tangent - y_n0 * n0_dot_t;
			const z_resTangent0 = z_tangent - z_n0 * n0_dot_t;
			const x_resTangent1 = x_tangent - x_n1 * n1_dot_t;
			const y_resTangent1 = y_tangent - y_n1 * n1_dot_t;
			const z_resTangent1 = z_tangent - z_n1 * n1_dot_t;
			const x_resTangent2 = x_tangent - x_n2 * n2_dot_t;
			const y_resTangent2 = y_tangent - y_n2 * n2_dot_t;
			const z_resTangent2 = z_tangent - z_n2 * n2_dot_t;
			const magTangent0 = Math.sqrt(x_resTangent0 * x_resTangent0 + y_resTangent0 * y_resTangent0 + z_resTangent0 * z_resTangent0);
			const magTangent1 = Math.sqrt(x_resTangent1 * x_resTangent1 + y_resTangent1 * y_resTangent1 + z_resTangent1 * z_resTangent1);
			const magTangent2 = Math.sqrt(x_resTangent2 * x_resTangent2 + y_resTangent2 * y_resTangent2 + z_resTangent2 * z_resTangent2);
			// Bitangent
			const n0_dot_bt = x_bitangent * x_n0 + y_bitangent * y_n0 + z_bitangent * z_n0;
			const n1_dot_bt = x_bitangent * x_n1 + y_bitangent * y_n1 + z_bitangent * z_n1;
			const n2_dot_bt = x_bitangent * x_n2 + y_bitangent * y_n2 + z_bitangent * z_n2;
			const x_resBitangent0 = x_bitangent - x_n0 * n0_dot_bt;
			const y_resBitangent0 = y_bitangent - y_n0 * n0_dot_bt;
			const z_resBitangent0 = z_bitangent - z_n0 * n0_dot_bt;
			const x_resBitangent1 = x_bitangent - x_n1 * n1_dot_bt;
			const y_resBitangent1 = y_bitangent - y_n1 * n1_dot_bt;
			const z_resBitangent1 = z_bitangent - z_n1 * n1_dot_bt;
			const x_resBitangent2 = x_bitangent - x_n2 * n2_dot_bt;
			const y_resBitangent2 = y_bitangent - y_n2 * n2_dot_bt;
			const z_resBitangent2 = z_bitangent - z_n2 * n2_dot_bt;
			const magBitangent0 = Math.sqrt(x_resBitangent0 * x_resBitangent0 +
				y_resBitangent0 * y_resBitangent0 +
				z_resBitangent0 * z_resBitangent0);
			const magBitangent1 = Math.sqrt(x_resBitangent1 * x_resBitangent1 +
				y_resBitangent1 * y_resBitangent1 +
				z_resBitangent1 * z_resBitangent1);
			const magBitangent2 = Math.sqrt(x_resBitangent2 * x_resBitangent2 +
				y_resBitangent2 * y_resBitangent2 +
				z_resBitangent2 * z_resBitangent2);
			unpacked.tangents[i0 * 3 + 0] += x_resTangent0 / magTangent0;
			unpacked.tangents[i0 * 3 + 1] += y_resTangent0 / magTangent0;
			unpacked.tangents[i0 * 3 + 2] += z_resTangent0 / magTangent0;
			unpacked.tangents[i1 * 3 + 0] += x_resTangent1 / magTangent1;
			unpacked.tangents[i1 * 3 + 1] += y_resTangent1 / magTangent1;
			unpacked.tangents[i1 * 3 + 2] += z_resTangent1 / magTangent1;
			unpacked.tangents[i2 * 3 + 0] += x_resTangent2 / magTangent2;
			unpacked.tangents[i2 * 3 + 1] += y_resTangent2 / magTangent2;
			unpacked.tangents[i2 * 3 + 2] += z_resTangent2 / magTangent2;
			unpacked.bitangents[i0 * 3 + 0] += x_resBitangent0 / magBitangent0;
			unpacked.bitangents[i0 * 3 + 1] += y_resBitangent0 / magBitangent0;
			unpacked.bitangents[i0 * 3 + 2] += z_resBitangent0 / magBitangent0;
			unpacked.bitangents[i1 * 3 + 0] += x_resBitangent1 / magBitangent1;
			unpacked.bitangents[i1 * 3 + 1] += y_resBitangent1 / magBitangent1;
			unpacked.bitangents[i1 * 3 + 2] += z_resBitangent1 / magBitangent1;
			unpacked.bitangents[i2 * 3 + 0] += x_resBitangent2 / magBitangent2;
			unpacked.bitangents[i2 * 3 + 1] += y_resBitangent2 / magBitangent2;
			unpacked.bitangents[i2 * 3 + 2] += z_resBitangent2 / magBitangent2;
			// TODO: check handedness
		}
		this.tangents = unpacked.tangents;
		this.bitangents = unpacked.bitangents;
	}
	/**
	 * @param layout - A {@link Layout} object that describes the
	 * desired memory layout of the generated buffer
	 * @return The packed array in the ... TODO
	 */
	makeBufferData(layout) {
		const numItems = this.vertices.length / 3;
		const buffer = new ArrayBuffer(layout.stride * numItems);
		buffer.numItems = numItems;
		const dataView = new DataView(buffer);
		for (let i = 0, vertexOffset = 0; i < numItems; i++) {
			vertexOffset = i * layout.stride;
			// copy in the vertex data in the order and format given by the
			// layout param
			for (const attribute of layout.attributes) {
				const offset = vertexOffset + layout.attributeMap[attribute.key].offset;
				switch (attribute.key) {
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].POSITION.key:
						dataView.setFloat32(offset, this.vertices[i * 3], true);
						dataView.setFloat32(offset + 4, this.vertices[i * 3 + 1], true);
						dataView.setFloat32(offset + 8, this.vertices[i * 3 + 2], true);
						break;
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].UV.key:
						dataView.setFloat32(offset, this.textures[i * 2], true);
						dataView.setFloat32(offset + 4, this.textures[i * 2 + 1], true);
						break;
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].NORMAL.key:
						dataView.setFloat32(offset, this.vertexNormals[i * 3], true);
						dataView.setFloat32(offset + 4, this.vertexNormals[i * 3 + 1], true);
						dataView.setFloat32(offset + 8, this.vertexNormals[i * 3 + 2], true);
						break;
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].MATERIAL_INDEX.key:
						dataView.setInt16(offset, this.vertexMaterialIndices[i], true);
						break;
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].AMBIENT.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setFloat32(offset, material.ambient[0], true);
						dataView.setFloat32(offset + 4, material.ambient[1], true);
						dataView.setFloat32(offset + 8, material.ambient[2], true);
						break;
					}
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].DIFFUSE.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setFloat32(offset, material.diffuse[0], true);
						dataView.setFloat32(offset + 4, material.diffuse[1], true);
						dataView.setFloat32(offset + 8, material.diffuse[2], true);
						break;
					}
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].SPECULAR.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setFloat32(offset, material.specular[0], true);
						dataView.setFloat32(offset + 4, material.specular[1], true);
						dataView.setFloat32(offset + 8, material.specular[2], true);
						break;
					}
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].SPECULAR_EXPONENT.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setFloat32(offset, material.specularExponent, true);
						break;
					}
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].EMISSIVE.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setFloat32(offset, material.emissive[0], true);
						dataView.setFloat32(offset + 4, material.emissive[1], true);
						dataView.setFloat32(offset + 8, material.emissive[2], true);
						break;
					}
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].TRANSMISSION_FILTER.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setFloat32(offset, material.transmissionFilter[0], true);
						dataView.setFloat32(offset + 4, material.transmissionFilter[1], true);
						dataView.setFloat32(offset + 8, material.transmissionFilter[2], true);
						break;
					}
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].DISSOLVE.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setFloat32(offset, material.dissolve, true);
						break;
					}
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].ILLUMINATION.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setInt16(offset, material.illumination, true);
						break;
					}
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].REFRACTION_INDEX.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setFloat32(offset, material.refractionIndex, true);
						break;
					}
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].SHARPNESS.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setFloat32(offset, material.sharpness, true);
						break;
					}
					case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].ANTI_ALIASING.key: {
						const materialIndex = this.vertexMaterialIndices[i];
						const material = this.materialsByIndex[materialIndex];
						if (!material) {
							console.warn('Material "' +
								this.materialNames[materialIndex] +
								'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"');
							break;
						}
						dataView.setInt16(offset, material.antiAliasing ? 1 : 0, true);
						break;
					}
				}
			}
		}
		return buffer;
	}
	makeIndexBufferData() {
		const buffer = new Uint16Array(this.indices);
		buffer.numItems = this.indices.length;
		return buffer;
	}
	makeIndexBufferDataForMaterials(...materialIndices) {
		const indices = new Array().concat(...materialIndices.map(mtlIdx => this.indicesPerMaterial[mtlIdx]));
		const buffer = new Uint16Array(indices);
		buffer.numItems = indices.length;
		return buffer;
	}
	addMaterialLibrary(mtl) {
		for (const name in mtl.materials) {
			if (!(name in this.materialIndices)) {
				// This material is not referenced by the mesh
				continue;
			}
			const material = mtl.materials[name];
			// Find the material index for this material
			const materialIndex = this.materialIndices[material.name];
			// Put the material into the materialsByIndex object at the right
			// spot as determined when the obj file was parsed
			this.materialsByIndex[materialIndex] = material;
		}
	}
}
function* triangulate(elements) {
	if (elements.length <= 3) {
		yield elements;
	}
	else if (elements.length === 4) {
		yield [elements[0], elements[1], elements[2]];
		yield [elements[2], elements[3], elements[0]];
	}
	else {
		for (let i = 1; i < elements.length - 1; i++) {
			yield [elements[0], elements[i], elements[i + 1]];
		}
	}
}


export function downloadMtlTextures(mtl, root) {
	const mapAttributes = [
		"mapDiffuse",
		"mapAmbient",
		"mapSpecular",
		"mapDissolve",
		"mapBump",
		"mapDisplacement",
		"mapDecal",
		"mapEmissive",
	];
	if (!root.endsWith("/")) {
		root += "/";
	}
	const textures = [];
	for (const materialName in mtl.materials) {
		if (!mtl.materials.hasOwnProperty(materialName)) {
			continue;
		}
		const material = mtl.materials[materialName];
		for (const attr of mapAttributes) {
			const mapData = material[attr];
			if (!mapData || !mapData.filename) {
				continue;
			}
			const url = root + mapData.filename;
			textures.push(fetch(url)
				.then(response => {
				if (!response.ok) {
					throw new Error();
				}
				return response.blob();
			})
				.then(function (data) {
				const image = new Image();
				image.src = URL.createObjectURL(data);
				mapData.texture = image;
				return new Promise(resolve => (image.onload = resolve));
			})
				.catch(() => {
				console.error(`Unable to download texture: ${url}`);
			}));
		}
	}
	return Promise.all(textures);
}
function getMtl(modelOptions) {
	if (!(typeof modelOptions.mtl === "string")) {
		return modelOptions.obj.replace(/\.obj$/, ".mtl");
	}
	return modelOptions.mtl;
}
/**
 * Accepts a list of model request objects and returns a Promise that
 * resolves when all models have been downloaded and parsed.
 *
 * The list of model objects follow this interface:
 * {
 *  obj: 'path/to/model.obj',
 *  mtl: true | 'path/to/model.mtl',
 *  downloadMtlTextures: true | false
 *  mtlTextureRoot: '/models/suzanne/maps'
 *  name: 'suzanne'
 * }
 *
 * The `obj` attribute is required and should be the path to the
 * model's .obj file relative to the current repo (absolute URLs are
 * suggested).
 *
 * The `mtl` attribute is optional and can either be a boolean or
 * a path to the model's .mtl file relative to the current URL. If
 * the value is `true`, then the path and basename given for the `obj`
 * attribute is used replacing the .obj suffix for .mtl
 * E.g.: {obj: 'models/foo.obj', mtl: true} would search for 'models/foo.mtl'
 *
 * The `name` attribute is optional and is a human friendly name to be
 * included with the parsed OBJ and MTL files. If not given, the base .obj
 * filename will be used.
 *
 * The `downloadMtlTextures` attribute is a flag for automatically downloading
 * any images found in the MTL file and attaching them to each Material
 * created from that file. For example, if material.mapDiffuse is set (there
 * was data in the MTL file), then material.mapDiffuse.texture will contain
 * the downloaded image. This option defaults to `true`. By default, the MTL's
 * URL will be used to determine the location of the images.
 *
 * The `mtlTextureRoot` attribute is optional and should point to the location
 * on the server that this MTL's texture files are located. The default is to
 * use the MTL file's location.
 *
 * @returns {Promise} the result of downloading the given list of models. The
 * promise will resolve with an object whose keys are the names of the models
 * and the value is its Mesh object. Each Mesh object will automatically
 * have its addMaterialLibrary() method called to set the given MTL data (if given).
 */
export function downloadModels(models) {
	const finished = [];
	for (const model of models) {
		if (!model.obj) {
			throw new Error('"obj" attribute of model object not set. The .obj file is required to be set ' +
				"in order to use downloadModels()");
		}
		const options = {
			indicesPerMaterial: !!model.indicesPerMaterial,
			calcTangentsAndBitangents: !!model.calcTangentsAndBitangents,
		};
		// if the name is not provided, dervive it from the given OBJ
		let name = model.name;
		if (!name) {
			const parts = model.obj.split("/");
			name = parts[parts.length - 1].replace(".obj", "");
		}
		const namePromise = Promise.resolve(name);
		const meshPromise = fetch(model.obj)
			.then(response => response.text())
			.then(data => {
			return new _mesh__WEBPACK_IMPORTED_MODULE_0__["default"](data, options);
		});
		let mtlPromise;
		// Download MaterialLibrary file?
		if (model.mtl) {
			const mtl = getMtl(model);
			mtlPromise = fetch(mtl)
				.then(response => response.text())
				.then((data) => {
				const material = new _material__WEBPACK_IMPORTED_MODULE_1__["MaterialLibrary"](data);
				if (model.downloadMtlTextures !== false) {
					let root = model.mtlTextureRoot;
					if (!root) {
						// get the directory of the MTL file as default
						root = mtl.substr(0, mtl.lastIndexOf("/"));
					}
					// downloadMtlTextures returns a Promise that
					// is resolved once all of the images it
					// contains are downloaded. These are then
					// attached to the map data objects
					return Promise.all([Promise.resolve(material), downloadMtlTextures(material, root)]);
				}
				return Promise.all([Promise.resolve(material), undefined]);
			})
				.then((value) => {
				return value[0];
			});
		}
		const parsed = [namePromise, meshPromise, mtlPromise];
		finished.push(Promise.all(parsed));
	}
	return Promise.all(finished).then(ms => {
		// the "finished" promise is a list of name, Mesh instance,
		// and MaterialLibary instance. This unpacks and returns an
		// object mapping name to Mesh (Mesh points to MTL).
		const models = {};
		for (const model of ms) {
			const [name, mesh, mtl] = model;
			mesh.name = name;
			if (mtl) {
				mesh.addMaterialLibrary(mtl);
			}
			models[name] = mesh;
		}
		return models;
	});
}
/**
 * Takes in an object of `mesh_name`, `'/url/to/OBJ/file'` pairs and a callback
 * function. Each OBJ file will be ajaxed in and automatically converted to
 * an OBJ.Mesh. When all files have successfully downloaded the callback
 * function provided will be called and passed in an object containing
 * the newly created meshes.
 *
 * **Note:** In order to use this function as a way to download meshes, a
 * webserver of some sort must be used.
 *
 * @param {Object} nameAndAttrs an object where the key is the name of the mesh and the value is the url to that mesh's OBJ file
 *
 * @param {Function} completionCallback should contain a function that will take one parameter: an object array where the keys will be the unique object name and the value will be a Mesh object
 *
 * @param {Object} meshes In case other meshes are loaded separately or if a previously declared variable is desired to be used, pass in a (possibly empty) json object of the pattern: { '<mesh_name>': OBJ.Mesh }
 *
 */
export function downloadMeshes(nameAndURLs, completionCallback, meshes) {
	if (meshes === undefined) {
		meshes = {};
	}
	const completed = [];
	for (const mesh_name in nameAndURLs) {
		if (!nameAndURLs.hasOwnProperty(mesh_name)) {
			continue;
		}
		const url = nameAndURLs[mesh_name];
		completed.push(fetch(url)
			.then(response => response.text())
			.then(data => {
			return [mesh_name, new _mesh__WEBPACK_IMPORTED_MODULE_0__["default"](data)];
		}));
	}
	Promise.all(completed).then(ms => {
		for (const [name, mesh] of ms) {
			meshes[name] = mesh;
		}
		return completionCallback(meshes);
	});
}
function _buildBuffer(gl, type, data, itemSize) {
	const buffer = gl.createBuffer();
	const arrayView = type === gl.ARRAY_BUFFER ? Float32Array : Uint16Array;
	gl.bindBuffer(type, buffer);
	gl.bufferData(type, new arrayView(data), gl.STATIC_DRAW);
	buffer.itemSize = itemSize;
	buffer.numItems = data.length / itemSize;
	return buffer;
}
/**
 * Takes in the WebGL context and a Mesh, then creates and appends the buffers
 * to the mesh object as attributes.
 *
 * @param {WebGLRenderingContext} gl the `canvas.getContext('webgl')` context instance
 * @param {Mesh} mesh a single `OBJ.Mesh` instance
 *
 * The newly created mesh attributes are:
 *
 * Attrbute | Description
 * :--- | ---
 * **normalBuffer**       |contains the model&#39;s Vertex Normals
 * normalBuffer.itemSize  |set to 3 items
 * normalBuffer.numItems  |the total number of vertex normals
 * |
 * **textureBuffer**      |contains the model&#39;s Texture Coordinates
 * textureBuffer.itemSize |set to 2 items
 * textureBuffer.numItems |the number of texture coordinates
 * |
 * **vertexBuffer**       |contains the model&#39;s Vertex Position Coordinates (does not include w)
 * vertexBuffer.itemSize  |set to 3 items
 * vertexBuffer.numItems  |the total number of vertices
 * |
 * **indexBuffer**        |contains the indices of the faces
 * indexBuffer.itemSize   |is set to 1
 * indexBuffer.numItems   |the total number of indices
 *
 * A simple example (a lot of steps are missing, so don't copy and paste):
 *
 *     const gl   = canvas.getContext('webgl'),
 *         mesh = OBJ.Mesh(obj_file_data);
 *     // compile the shaders and create a shader program
 *     const shaderProgram = gl.createProgram();
 *     // compilation stuff here
 *     ...
 *     // make sure you have vertex, vertex normal, and texture coordinate
 *     // attributes located in your shaders and attach them to the shader program
 *     shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
 *     gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
 *
 *     shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
 *     gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
 *
 *     shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
 *     gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
 *
 *     // create and initialize the vertex, vertex normal, and texture coordinate buffers
 *     // and save on to the mesh object
 *     OBJ.initMeshBuffers(gl, mesh);
 *
 *     // now to render the mesh
 *     gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
 *     gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
 *     // it's possible that the mesh doesn't contain
 *     // any texture coordinates (e.g. suzanne.obj in the development branch).
 *     // in this case, the texture vertexAttribArray will need to be disabled
 *     // before the call to drawElements
 *     if(!mesh.textures.length){
 *       gl.disableVertexAttribArray(shaderProgram.textureCoordAttribute);
 *     }
 *     else{
 *       // if the texture vertexAttribArray has been previously
 *       // disabled, then it needs to be re-enabled
 *       gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
 *       gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureBuffer);
 *       gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
 *     }
 *
 *     gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
 *     gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
 *
 *     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
 *     gl.drawElements(gl.TRIANGLES, model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
 */
export function initMeshBuffers(gl, mesh) {
	mesh.normalBuffer = _buildBuffer(gl, gl.ARRAY_BUFFER, mesh.vertexNormals, 3);
	mesh.textureBuffer = _buildBuffer(gl, gl.ARRAY_BUFFER, mesh.textures, mesh.textureStride);
	mesh.vertexBuffer = _buildBuffer(gl, gl.ARRAY_BUFFER, mesh.vertices, 3);
	mesh.indexBuffer = _buildBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, mesh.indices, 1);
	return mesh;
}
export function deleteMeshBuffers(gl, mesh) {
	gl.deleteBuffer(mesh.normalBuffer);
	gl.deleteBuffer(mesh.textureBuffer);
	gl.deleteBuffer(mesh.vertexBuffer);
	gl.deleteBuffer(mesh.indexBuffer);
}
