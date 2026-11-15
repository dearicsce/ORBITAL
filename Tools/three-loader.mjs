export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') {
    return {
      format: 'module',
      shortCircuit: true,
      url: new URL('../Assets/StreamingAssets/WebUI/vendor/three/three.module.js', import.meta.url).href
    };
  }
  if (specifier === './launchTimeline.js' && context.parentURL?.includes('EmbeddedUI')) {
    return {
      format: 'module',
      shortCircuit: true,
      url: new URL('../Assets/StreamingAssets/WebUI/js/three/launchTimeline.js', import.meta.url).href
    };
  }
  return nextResolve(specifier, context);
}
