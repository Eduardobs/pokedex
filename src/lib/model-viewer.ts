import '@google/model-viewer'

// Set the constructor configuration before any viewer is created. Its loading
// mixin reads this global for every instance, including shiny replacements.
Object.assign(globalThis, {
  ModelViewerElement: { dracoDecoderLocation: new URL(`${import.meta.env.BASE_URL}draco/`, document.baseURI).href },
})
