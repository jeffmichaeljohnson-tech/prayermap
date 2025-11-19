// Mapbox GL JS workaround for missing Worker
if (typeof window !== 'undefined' && !window.URL.createObjectURL) {
  window.URL.createObjectURL = function() {
    return '';
  };
}
