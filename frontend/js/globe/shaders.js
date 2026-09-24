// GLSL-шейдеры глобуса: Земля, атмосфера, спутниковая «заплатка» страны, звёзды.

export const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const earthFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uIds;
  uniform vec3 uSun;
  uniform float uHover;
  uniform float uSelected;
  uniform float uFocus;       // 0 = обзор, 1 = камера у выбранной страны
  uniform float uOurs[16];    // id стран, где есть бренды
  uniform float uOursCount;
  uniform vec3 uLume;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 L = normalize(uSun);
    float NdotL = dot(N, L);
    float dayMix = smoothstep(-0.18, 0.28, NdotL);

    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    vec4 idc = texture2D(uIds, vUv);
    float id = floor(idc.r * 255.0 + 0.5) + floor(idc.g * 255.0 + 0.5) * 256.0;
    float land = step(0.5, id);

    // Холодная, чуть приглушённая цветокоррекция дневной стороны.
    vec3 graded = mix(vec3(luma(day)), day, 0.82) * vec3(0.93, 0.97, 1.04);
    vec3 lit = graded * (0.18 + 1.05 * max(NdotL, 0.0));
    vec3 lights = pow(night, vec3(1.6)) * vec3(1.35, 1.05, 0.72) * 2.2;
    vec3 col = mix(lights + graded * 0.03, lit, dayMix);

    // Блик солнца на океане.
    vec3 H = normalize(L + V);
    float nh = max(dot(N, H), 0.0);
    float spec = (pow(nh, 260.0) * 0.35 + pow(nh, 40.0) * 0.05) * (1.0 - land) * dayMix;
    col += vec3(0.8, 0.87, 1.0) * spec;

    // Подсветка стран.
    float ours = 0.0;
    for (int i = 0; i < 16; i++) {
      if (float(i) >= uOursCount) break;
      ours = max(ours, 1.0 - step(0.5, abs(id - uOurs[i])));
    }
    float hover = (1.0 - step(0.5, abs(id - uHover))) * land;
    float sel = (1.0 - step(0.5, abs(id - uSelected))) * land;
    col = mix(col, col * 0.3 + vec3(luma(col)) * 0.05, uFocus * (1.0 - sel) * 0.85);
    float glowAmt = ours * 0.05 * (1.0 - uFocus) + hover * 0.16 + sel * 0.06 * (1.0 - uFocus);
    col += uLume * glowAmt * (0.55 + 0.45 * dayMix);

    // Френелевская кайма у лимба.
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    col += vec3(0.3, 0.5, 0.92) * fres * (0.12 + 0.3 * dayMix) * (1.0 - uFocus * 0.7);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const atmosphereVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const atmosphereFragment = /* glsl */ `
  uniform vec3 uSun;
  uniform float uIntensity;
  uniform float uLimb;        // значение -dot(N,V) у края Земли для данного радиуса гало
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    // Рисуем внутреннюю (заднюю) сторону сферы-гало: ярче всего у лимба Земли,
    // к внешнему краю гало свечение гаснет до нуля.
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float d = clamp(-dot(N, V) / uLimb, 0.0, 1.0);
    float glow = pow(d, 3.2);
    float sunSide = smoothstep(-0.5, 0.7, dot(N, normalize(uSun)));
    vec3 col = mix(vec3(0.1, 0.17, 0.4), vec3(0.36, 0.58, 0.95), sunSide);
    float a = glow * uIntensity * (0.3 + 0.7 * sunSide);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

// Высокодетальный снимок страны поверх глобуса. Вне страны снимок приглушается,
// края кадра растворяются, чтобы не было шва с базовой текстурой.
export const patchVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const patchFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uMask;
  uniform float uOpacity;
  uniform vec3 uSun;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  void main() {
    vec3 c = texture2D(uMap, vUv).rgb;
    float inside = texture2D(uMask, vUv).r;
    vec3 N = normalize(vNormalW);
    float light = 0.55 + 0.55 * max(dot(N, normalize(uSun)), 0.0);
    // Снимок показываем только внутри границы; маска уже размыта, край получается мягким.
    vec3 col = pow(c, vec3(0.9)) * 1.18 * light;
    gl_FragColor = vec4(col, uOpacity * smoothstep(0.02, 0.6, inside));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const starsVertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.65 + 0.35 * sin(uTime * (0.6 + aSeed * 1.8) + aSeed * 40.0);
    vAlpha = tw * (0.35 + aSize * 0.35);
    gl_PointSize = aSize * uPixelRatio;
  }
`;

export const starsFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(vec3(0.86, 0.9, 1.0) * a, a);
  }
`;
